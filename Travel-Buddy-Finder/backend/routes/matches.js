const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Rate limiting configuration
const matchesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const swipeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 swipes per minute
    message: 'Swipe limit reached, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const matchCache = new Map();

// Enhanced potential matches endpoint with optimized performance
router.get('/potential', protect, matchesLimiter, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id)
            .select('+travelPreferences +personalityType +languages +location +active')
            .lean();

        if (!currentUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const lastSwipeDirection = req.query.lastSwipeDirection;

        // Enhanced caching with user preferences hash
        const prefsHash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(currentUser.travelPreferences))
            .digest('hex');
        
        const cacheKey = `matches:${currentUser._id}:${page}:${prefsHash}:${JSON.stringify(req.query)}`;
        const cachedResult = matchCache.get(cacheKey);
        
        if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
            // Update analytics asynchronously
            process.nextTick(() => {
                try {
                    analytics.track('Cache Hit', {
                        userId: currentUser._id,
                        page,
                        prefsHash
                    });
                } catch (error) {
                    console.error('Analytics error:', error);
                }
            });
            return res.status(200).json(cachedResult.data);
        }

        // Enhanced pre-filtering for better performance
        const preFilterConditions = {
            _id: { $ne: currentUser._id },
            active: true,
            'travelPreferences.dateRange': {
                $elemMatch: {
                    start: { $gte: new Date() }
                }
            }
        };

        // Exclude previously matched or blocked users
        if (currentUser.matches?.length || currentUser.blockedUsers?.length) {
            preFilterConditions._id.$nin = [
                ...(currentUser.matches || []),
                ...(currentUser.blockedUsers || [])
            ];
        }

        // Optimize location-based filtering
        if (currentUser.location?.coordinates) {
            preFilterConditions.location = {
                $geoWithin: {
                    $centerSphere: [
                        currentUser.location.coordinates,
                        100 / 6371 // 100km radius
                    ]
                }
            };
        }

        // Enhanced personality type filtering
        if (currentUser.personalityType) {
            const compatibleTypes = getCompatiblePersonalityTypes(currentUser.personalityType);
            preFilterConditions.$or = [
                { personalityType: { $in: compatibleTypes } },
                { personalityType: 'flexible' }
            ];
        }

        // Smart budget range filtering
        if (currentUser.travelPreferences?.budget) {
            const budgetRanges = getBudgetRanges(currentUser.travelPreferences.budget);
            preFilterConditions['travelPreferences.budget'] = {
                $in: budgetRanges
            };
        }

        // Optimized aggregation pipeline
        const potentialMatches = await User.aggregate([
            // Initial filtering stage
            { $match: preFilterConditions },

            // Calculate match scores
            {
                $addFields: {
                    matchScore: {
                        $let: {
                            vars: {
                                // Base compatibility scores
                                baseScore: {
                                    $add: [
                                        // Personality compatibility (25%)
                                        {
                                            $cond: {
                                                if: { $eq: ['$personalityType', currentUser.personalityType] },
                                                then: 25,
                                                else: {
                                                    $cond: {
                                                        if: { $eq: ['$personalityType', 'flexible'] },
                                                        then: 20,
                                                        else: 15
                                                    }
                                                }
                                            }
                                        },
                                        // Travel style match (25%)
                                        {
                                            $cond: {
                                                if: { $eq: ['$travelPreferences.style', currentUser.travelPreferences.style] },
                                                then: 25,
                                                else: {
                                                    $multiply: [
                                                        { $subtract: [25, { $abs: { $subtract: ['$travelPreferences.style', currentUser.travelPreferences.style] } }] },
                                                        0.8
                                                    ]
                                                }
                                            }
                                        },
                                        // Interest overlap (25%)
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        { $size: { $setIntersection: ['$travelPreferences.interests', currentUser.travelPreferences.interests] } },
                                                        { $max: [{ $size: currentUser.travelPreferences.interests }, 1] }
                                                    ]
                                                },
                                                25
                                            ]
                                        },
                                        // Budget compatibility (15%)
                                        {
                                            $multiply: [
                                                {
                                                    $subtract: [
                                                        1,
                                                        {
                                                            $divide: [
                                                                { $abs: { $subtract: ['$travelPreferences.budget', currentUser.travelPreferences.budget] } },
                                                                3
                                                            ]
                                                        }
                                                    ]
                                                },
                                                15
                                            ]
                                        },
                                        // Activity level match (10%)
                                        {
                                            $cond: {
                                                if: { $eq: ['$travelPreferences.activityLevel', currentUser.travelPreferences.activityLevel] },
                                                then: 10,
                                                else: 5
                                            }
                                        }
                                    ]
                                }
                            },
                            in: {
                                $add: [
                                    '$$baseScore',
                                    // Bonus points
                                    {
                                        $cond: {
                                            if: { $gt: [{ $size: { $setIntersection: ['$languages', currentUser.languages] } }, 0] },
                                            then: 5,
                                            else: 0
                                        }
                                    },
                                    // Location proximity bonus
                                    {
                                        $cond: {
                                            if: { $lt: ['$location.coordinates', 50] }, // Within 50km
                                            then: 5,
                                            else: 0
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            // Filter by minimum match score
            {
                $match: {
                    matchScore: { $gte: lastSwipeDirection === 'right' ? 60 : 40 }
                }
            },

            // Sort by match score and last active
            {
                $sort: {
                    matchScore: -1,
                    lastActive: -1
                }
            },

            // Pagination
            { $skip: skip },
            { $limit: limit },

            // Project only necessary fields
            {
                $project: {
                    password: 0,
                    __v: 0,
                    blockedUsers: 0
                }
            }
        ]).exec();

        // Enhanced response with metadata
        const response = {
            status: 'success',
            results: potentialMatches.length,
            page,
            data: potentialMatches,
            metadata: {
                averageScore: potentialMatches.reduce((acc, match) => acc + match.matchScore, 0) / potentialMatches.length,
                scoreRange: {
                    min: Math.min(...potentialMatches.map(m => m.matchScore)),
                    max: Math.max(...potentialMatches.map(m => m.matchScore))
                }
            }
        };

        // Cache the result
        matchCache.set(cacheKey, {
            timestamp: Date.now(),
            data: response
        });

        // Track analytics asynchronously
        process.nextTick(() => {
            try {
                analytics.track('Matches Retrieved', {
                    userId: currentUser._id,
                    count: potentialMatches.length,
                    page,
                    averageScore: response.metadata.averageScore
                });
            } catch (error) {
                console.error('Analytics error:', error);
            }
        });

        res.status(200).json(response);

    } catch (err) {
        console.error('Error in potential matches:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error finding potential matches',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Helper function to get compatible personality types
function getCompatiblePersonalityTypes(personalityType) {
    const compatibilityMap = {
        'adventurer': ['flexible', 'cultural', 'adventurer'],
        'planner': ['relaxed', 'flexible', 'planner'],
        'cultural': ['adventurer', 'planner', 'cultural'],
        'relaxed': ['planner', 'flexible', 'relaxed'],
        'flexible': ['adventurer', 'cultural', 'planner', 'relaxed', 'flexible']
    };
    return compatibilityMap[personalityType] || ['flexible'];
}

// Helper function to get compatible budget ranges
function getBudgetRanges(budget) {
    const budgetRanges = {
        'budget': ['budget', 'moderate'],
        'moderate': ['budget', 'moderate', 'luxury'],
        'luxury': ['moderate', 'luxury']
    };
    return budgetRanges[budget] || [budget];
}

        // Build enhanced filter conditions
        const filterConditions = {
            _id: { 
                $ne: currentUser._id,
                $nin: [...(currentUser.matches || []), ...(currentUser.blockedUsers || [])]
            },
            active: true,
            'travelPreferences.dateRange': {
                $elemMatch: {
                    start: { $gte: new Date() }
                }
            }
        };

        // Add location-based filtering if available
        if (currentUser.location?.coordinates) {
            filterConditions.location = {
                $geoWithin: {
                    $centerSphere: [
                        currentUser.location.coordinates,
                        100 / 6371 // Convert 100km to radians (divide by Earth's radius in km)
                    ]
                }
            };
        }

            // Enhanced filtering with weighted preferences
            const userPreferences = currentUser.travelPreferences || {};
            
            // Dynamic filters based on user preferences
            if (req.query.personalityType) {
                filterConditions.$or = [
                    { personalityType: req.query.personalityType },
                    { personalityType: 'flexible' },
                    { 
                        $and: [
                            { personalityType: { $exists: true } },
                            { 
                                $or: [
                                    { personalityType: currentUser.personalityType },
                                    { personalityType: 'flexible' }
                                ]
                            }
                        ]
                    }
                ];
            }

            // Budget compatibility with tolerance range
            if (req.query.budget) {
                const budgetRanges = {
                    budget: ['budget', 'moderate'],
                    moderate: ['budget', 'moderate', 'luxury'],
                    luxury: ['moderate', 'luxury']
                };
                filterConditions['travelPreferences.budget'] = {
                    $in: budgetRanges[req.query.budget] || [req.query.budget]
                };
            }

            // Interest matching with minimum overlap
            if (req.query.interests && req.query.interests.length) {
                const interests = Array.isArray(req.query.interests) 
                    ? req.query.interests 
                    : [req.query.interests];
                
                filterConditions['travelPreferences.interests'] = {
                    $elemMatch: {
                        $in: interests
                    }
                };

                // Ensure minimum interest overlap
                filterConditions.$expr = {
                    $gte: [
                        { $size: { $setIntersection: ['$travelPreferences.interests', interests] } },
                        Math.ceil(interests.length * 0.3) // At least 30% overlap
                    ]
                };
            }

            // Activity level compatibility
            if (userPreferences.activityLevel) {
                filterConditions.$or = [
                    { 'travelPreferences.activityLevel': userPreferences.activityLevel },
                    { 'travelPreferences.activityLevel': 'moderate' },
                    { 'travelPreferences.activityLevel': { $exists: false } }
                ];
            }
        
            // Enhanced matching algorithm with sophisticated scoring
        const potentialMatches = await User.aggregate([
            { $match: filterConditions },
            {
                $addFields: {
                    matchScore: {
                        $let: {
                            vars: {
                                // Calculate base scores
                                paceScore: {
                                    $switch: {
                                        branches: [
                                            { 
                                                case: { $eq: ['$travelPreferences.pace', currentUser.travelPreferences.pace] },
                                                then: 20 
                                            },
                                            {
                                                case: {
                                                    $or: [
                                                        { 
                                                            $and: [
                                                                { $eq: ['$travelPreferences.pace', 'moderate'] },
                                                                { $in: [currentUser.travelPreferences.pace, ['fast', 'slow']] }
                                                            ]
                                                        },
                                                        {
                                                            $and: [
                                                                { $eq: [currentUser.travelPreferences.pace, 'moderate'] },
                                                                { $in: ['$travelPreferences.pace', ['fast', 'slow']] }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                then: 12
                                            }
                                        ],
                                        default: 5
                                    }
                                },
                                // Enhanced budget compatibility
                                budgetScore: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { $eq: ['$travelPreferences.budget', currentUser.travelPreferences.budget] },
                                                then: 15
                                            },
                                            {
                                                case: {
                                                    $or: [
                                                        {
                                                            $and: [
                                                                { $eq: ['$travelPreferences.budget', 'moderate'] },
                                                                { $in: [currentUser.travelPreferences.budget, ['budget', 'luxury']] }
                                                            ]
                                                        },
                                                        {
                                                            $and: [
                                                                { $eq: [currentUser.travelPreferences.budget, 'moderate'] },
                                                                { $in: ['$travelPreferences.budget', ['budget', 'luxury']] }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                then: 10
                                            }
                                        ],
                                        default: 5
                                    }
                                },
                                // Dynamic interest matching
                                interestScore: {
                                    $multiply: [
                                        {
                                            $divide: [
                                                { 
                                                    $size: { 
                                                        $setIntersection: [
                                                            '$travelPreferences.interests',
                                                            currentUser.travelPreferences.interests
                                                        ]
                                                    }
                                                },
                                                {
                                                    $max: [
                                                        { 
                                                            $size: '$travelPreferences.interests'
                                                        },
                                                        1
                                                    ]
                                                }
                                            ]
                                        },
                                        25
                                    ]
                                },
                                // Activity level compatibility
                                activityScore: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { 
                                                    $eq: [
                                                        '$travelPreferences.activityLevel',
                                                        currentUser.travelPreferences.activityLevel
                                                    ]
                                                },
                                                then: 15
                                            },
                                            {
                                                case: { 
                                                    $or: [
                                                        { $eq: ['$travelPreferences.activityLevel', 'moderate'] },
                                                        { $eq: [currentUser.travelPreferences.activityLevel, 'moderate'] }
                                                    ]
                                                },
                                                then: 10
                                            }
                                        ],
                                        default: 5
                                    }
                                },
                                // Recency bonus
                                recencyScore: {
                                    $multiply: [
                                        {
                                            $min: [
                                                {
                                                    $divide: [
                                                        { 
                                                            $subtract: [
                                                                new Date(),
                                                                { $ifNull: ['$lastActive', new Date()] }
                                                            ]
                                                        },
                                                        1000 * 60 * 60 * 24 * 7 // 7 days
                                                    ]
                                                },
                                                1
                                            ]
                                        },
                                        10
                                    ]
                                }
                            },
                            in: {
                                $add: [
                                    '$$paceScore',
                                    '$$budgetScore',
                                    '$$interestScore',
                                    '$$activityScore',
                                    '$$recencyScore'
                                ]
                            }
                        }
                    }
                }
            },
            // Filter matches based on score threshold
            {
                $match: {
                    matchScore: { 
                        $gte: lastSwipeDirection === 'right' ? 40 : 30
                    }
                }
            },
            // Add travel date compatibility
            {
                $addFields: {
                    dateCompatibility: {
                        $filter: {
                            input: '$travelPreferences.dateRange',
                            as: 'date',
                            cond: {
                                $and: [
                                    { $gte: ['$$date.start', new Date()] },
                                    { 
                                        $anyElementTrue: {
                                            $map: {
                                                input: currentUser.travelPreferences.dateRange,
                                                as: 'userDate',
                                                in: {
                                                    $and: [
                                                        { $lte: ['$$date.start', '$$userDate.end'] },
                                                        { $gte: ['$$date.end', '$$userDate.start'] }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            // Final sorting and pagination
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: { 
                            matchScore: -1,
                            'dateCompatibility': -1
                        }},
                        { $skip: skip }, 
                        { $limit: limit }
                    ]
                }
            }
        ]);

        const result = potentialMatches[0];
        const total = result.metadata[0]?.total || 0;

        const response = {
            status: 'success',
            results: result.data.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            hasMore: skip + result.data.length < total,
            data: result.data
        };

        // Cache the result
        matchCache.set(cacheKey, {
            timestamp: Date.now(),
            data: response
        });

        res.status(200).json(response);

    } catch (err) {
        console.error('Error in potential matches:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error finding potential matches',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Create a match between users
router.post('/:userId', protect, swipeLimiter, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const targetUser = await User.findById(req.params.userId);

        if (!targetUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        if (!currentUser.canMatchWith(targetUser)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Cannot match with this user'
            });
        }

        // Create match
        currentUser.matches.addToSet(targetUser._id);
        targetUser.matches.addToSet(currentUser._id);

        await Promise.all([
            currentUser.save(),
            targetUser.save()
        ]);

        res.status(200).json({
            status: 'success',
            message: 'Match created successfully'
        });

    } catch (err) {
        console.error('Error creating match:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error creating match',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;

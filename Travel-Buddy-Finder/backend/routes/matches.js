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

// Get potential matches for the current user
router.get('/potential', protect, matchesLimiter, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id).select('+travelPreferences +personalityType +languages');
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

        // Check cache first
        const cacheKey = `${currentUser._id}-${page}-${JSON.stringify(req.query)}`;
        const cachedResult = matchCache.get(cacheKey);
        if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
            return res.status(200).json(cachedResult.data);
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

        // Add optional filters
        if (req.query.personalityType) {
            filterConditions.personalityType = req.query.personalityType;
        }
        if (req.query.budget) {
            filterConditions['travelPreferences.budget'] = req.query.budget;
        }
        if (req.query.interests && req.query.interests.length) {
            filterConditions['travelPreferences.interests'] = { 
                $in: Array.isArray(req.query.interests) 
                    ? req.query.interests 
                    : [req.query.interests] 
            };
        }
        
        // Enhanced matching algorithm with weighted scoring
        const potentialMatches = await User.aggregate([
            { $match: filterConditions },
            {
                $addFields: {
                    matchScore: {
                        $sum: [
                            // Core travel preferences (50 points)
                            { 
                                $cond: [
                                    { $eq: ['$travelPreferences.pace', currentUser.travelPreferences.pace] },
                                    20,
                                    {
                                        $cond: [
                                            { 
                                                $or: [
                                                    { $and: [
                                                        { $eq: ['$travelPreferences.pace', 'moderate'] },
                                                        { $in: [currentUser.travelPreferences.pace, ['fast', 'slow']] }
                                                    ]},
                                                    { $and: [
                                                        { $eq: [currentUser.travelPreferences.pace, 'moderate'] },
                                                        { $in: ['$travelPreferences.pace', ['fast', 'slow']] }
                                                    ]}
                                                ]
                                            },
                                            10,
                                            0
                                        ]
                                    }
                                ]
                            },
                            {
                                $cond: [
                                    { $eq: ['$travelPreferences.budget', currentUser.travelPreferences.budget] },
                                    15,
                                    0
                                ]
                            },
                            {
                                $cond: [
                                    { $eq: ['$travelPreferences.accommodationPreference', currentUser.travelPreferences.accommodationPreference] },
                                    15,
                                    0
                                ]
                            },
                            // Enhanced personality matching (35 points)
                            {
                                $let: {
                                    vars: {
                                        personalityCompatibility: {
                                            $switch: {
                                                branches: [
                                                    { case: { $eq: ['$personalityType', currentUser.personalityType] }, then: 35 },
                                                    { case: { $and: [
                                                        { $eq: ['$personalityType', 'adventurer'] },
                                                        { $eq: [currentUser.personalityType, 'flexible'] }
                                                    ]}, then: 25 },
                                                    { case: { $and: [
                                                        { $eq: ['$personalityType', 'flexible'] },
                                                        { $eq: [currentUser.personalityType, 'adventurer'] }
                                                    ]}, then: 25 },
                                                    { case: { $and: [
                                                        { $eq: ['$personalityType', 'planner'] },
                                                        { $eq: [currentUser.personalityType, 'relaxed'] }
                                                    ]}, then: 20 },
                                                    { case: { $in: ['$personalityType', ['flexible', 'moderate']] }, then: 15 }
                                                ],
                                                default: 5
                                            }
                                        }
                                    },
                                    in: '$$personalityCompatibility'
                                }
                            },
                            // Shared interests (20 points)
                            {
                                $let: {
                                    vars: {
                                        intersectionSize: {
                                            $size: {
                                                $ifNull: [
                                                    { 
                                                        $setIntersection: [
                                                            { $ifNull: ['$travelPreferences.interests', []] },
                                                            { $ifNull: [currentUser.travelPreferences.interests, []] }
                                                        ]
                                                    },
                                                    []
                                                ]
                                            }
                                        },
                                        userInterestsSize: {
                                            $size: {
                                                $ifNull: [currentUser.travelPreferences.interests, []]
                                            }
                                        }
                                    },
                                    in: {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    '$$intersectionSize',
                                                    { $max: ['$$userInterestsSize', 1] }
                                                ]
                                            },
                                            20
                                        ]
                                    }
                                }
                            },
                            // Language compatibility (30 points)
                            {
                                $let: {
                                    vars: {
                                        commonLanguages: {
                                            $size: {
                                                $ifNull: [
                                                    {
                                                        $setIntersection: [
                                                            { $ifNull: ['$languages', []] },
                                                            { $ifNull: [currentUser.languages, []] }
                                                        ]
                                                    },
                                                    []
                                                ]
                                            }
                                        },
                                        maxLanguages: {
                                            $max: [
                                                {
                                                    $size: { $ifNull: ['$languages', []] }
                                                },
                                                {
                                                    $size: { $ifNull: [currentUser.languages, []] }
                                                },
                                                1
                                            ]
                                        }
                                    },
                                    in: {
                                        $multiply: [
                                            {
                                                $divide: ['$$commonLanguages', '$$maxLanguages']
                                            },
                                            30
                                        ]
                                    }
                                }
                            }
                        ]
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

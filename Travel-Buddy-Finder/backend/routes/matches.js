const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Rate limiting configuration
const matchesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const swipeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Swipe limit reached, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
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

// Get potential matches
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

        // Build filter conditions
        const filterConditions = {
            _id: { 
                $ne: currentUser._id,
                $nin: [...(currentUser.matches || []), ...(currentUser.blockedUsers || [])]
            },
            active: true
        };

        // Add location-based filtering
        if (currentUser.location?.coordinates) {
            filterConditions.location = {
                $geoWithin: {
                    $centerSphere: [
                        currentUser.location.coordinates,
                        100 / 6371 // 100km radius in radians
                    ]
                }
            };
        }

        // Add personality type filtering
        if (currentUser.personalityType) {
            const compatibleTypes = getCompatiblePersonalityTypes(currentUser.personalityType);
            filterConditions.$or = [
                { personalityType: { $in: compatibleTypes } },
                { personalityType: 'flexible' }
            ];
        }

        // Add budget filtering
        if (currentUser.travelPreferences?.budget) {
            const budgetRanges = getBudgetRanges(currentUser.travelPreferences.budget);
            filterConditions['travelPreferences.budget'] = {
                $in: budgetRanges
            };
        }

        // Find matches
        const potentialMatches = await User.aggregate([
            { $match: filterConditions },
            {
                $addFields: {
                    matchScore: {
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
                                    else: 15
                                }
                            },
                            // Interest overlap (25%)
                            {
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
                                            { $max: [{ $size: currentUser.travelPreferences.interests }, 1] }
                                        ]
                                    },
                                    25
                                ]
                            },
                            // Budget compatibility (15%)
                            {
                                $cond: {
                                    if: { $eq: ['$travelPreferences.budget', currentUser.travelPreferences.budget] },
                                    then: 15,
                                    else: 5
                                }
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
                }
            },
            { $match: { matchScore: { $gte: lastSwipeDirection === 'right' ? 60 : 40 } } },
            { $sort: { matchScore: -1, lastActive: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    password: 0,
                    __v: 0,
                    blockedUsers: 0
                }
            }
        ]);

        // Prepare response
        const response = {
            status: 'success',
            results: potentialMatches.length,
            page,
            data: potentialMatches,
            metadata: {
                averageScore: potentialMatches.reduce((acc, match) => acc + match.matchScore, 0) / (potentialMatches.length || 1),
                scoreRange: potentialMatches.length ? {
                    min: Math.min(...potentialMatches.map(m => m.matchScore)),
                    max: Math.max(...potentialMatches.map(m => m.matchScore))
                } : null
            }
        };

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

// Create a match
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

        if (currentUser.matches.includes(targetUser._id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Already matched with this user'
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

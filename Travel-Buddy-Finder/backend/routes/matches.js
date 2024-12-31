const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const MatchService = require('../services/matchService');
const Swipe = require('../models/Swipe');

// Rate limiting configuration
const matchesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Increased limit
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

const swipeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // Increased limit
    message: 'Swipe limit reached, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true, // Don't count failed requests
    keyGenerator: (req) => req.user.id // Rate limit per user instead of IP
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

// Helper function to get compatible travel styles
function getCompatibleTravelStyles(travelStyle) {
    const compatibilityMap = {
        'solo': ['solo', 'flexible', 'group'],
        'couple': ['couple', 'flexible', 'group'],
        'group': ['group', 'flexible'],
        'family': ['family', 'flexible', 'group'],
        'flexible': ['solo', 'couple', 'group', 'family', 'flexible']
    };
    return compatibilityMap[travelStyle] || ['flexible'];
}

// Helper function to calculate match score
function calculateMatchScore(user1, user2) {
    let score = 0;
    const weights = {
        personalityType: 0.25,
        travelStyle: 0.20,
        budget: 0.15,
        languages: 0.15,
        activityLevel: 0.15,
        location: 0.10
    };

    // Personality type compatibility
    if (user1.personalityType === user2.personalityType) {
        score += 100 * weights.personalityType;
    } else if (getCompatiblePersonalityTypes(user1.personalityType).includes(user2.personalityType)) {
        score += 75 * weights.personalityType;
    }

    // Travel style compatibility
    if (user1.travelPreferences?.travelStyle === user2.travelPreferences?.travelStyle) {
        score += 100 * weights.travelStyle;
    } else if (getCompatibleTravelStyles(user1.travelPreferences?.travelStyle).includes(user2.travelPreferences?.travelStyle)) {
        score += 75 * weights.travelStyle;
    }

    // Budget compatibility
    if (user1.travelPreferences?.budget === user2.travelPreferences?.budget) {
        score += 100 * weights.budget;
    } else if (getBudgetRanges(user1.travelPreferences?.budget).includes(user2.travelPreferences?.budget)) {
        score += 75 * weights.budget;
    }

    // Language compatibility
    const commonLanguages = user1.languages?.filter(l => user2.languages?.includes(l)) || [];
    score += Math.min(100, (commonLanguages.length / Math.max(1, user1.languages?.length)) * 100) * weights.languages;

    // Activity level compatibility
    const activityLevels = ['low', 'moderate', 'high'];
    const level1 = activityLevels.indexOf(user1.travelPreferences?.activityLevel);
    const level2 = activityLevels.indexOf(user2.travelPreferences?.activityLevel);
    if (level1 !== -1 && level2 !== -1) {
        const levelDiff = Math.abs(level1 - level2);
        score += (100 - (levelDiff * 33.33)) * weights.activityLevel;
    }

    // Location proximity (if available)
    if (user1.location?.coordinates && user2.location?.coordinates) {
        const distance = calculateDistance(
            user1.location.coordinates,
            user2.location.coordinates
        );
        score += Math.max(0, 100 - (distance / 100)) * weights.location; // Decreases with distance
    }

    return Math.round(score);
}

// Helper function to calculate distance between coordinates
function calculateDistance([lon1, lat1], [lon2, lat2]) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Get potential matches
router.get('/potential', protect, matchesLimiter, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const lastSwipeDirection = req.query.lastSwipeDirection;

        // Get current user with all necessary fields
        const currentUser = await User.findById(req.user.id)
            .select('+travelPreferences +personalityType +languages +location +active +matches +blockedUsers +likes +rejectedMatches')
            .lean();

        if (!currentUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        if (!currentUser.travelPreferences) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please complete your travel preferences before matching'
            });
        }

        // Validate location data if required
        if (currentUser.location?.coordinates && 
            (!Array.isArray(currentUser.location.coordinates) || 
             currentUser.location.coordinates.length !== 2)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid location data'
            });
        }

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 50) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid pagination parameters'
            });
        }

        // Add error handling for inactive users
        if (!currentUser.active) {
            return res.status(403).json({
                status: 'fail',
                message: 'Account is currently inactive'
            });
        }

        // Build filter conditions
        const filterConditions = {
            _id: { 
                $ne: currentUser._id,
                $nin: [
                    ...(currentUser.matches || []),
                    ...(currentUser.blockedUsers || []),
                    ...(currentUser.rejectedMatches || [])
                ]
            },
            active: true
        };

        // Add blocked users who have blocked the current user
        const blockedByUsers = await User.find(
            { blockedUsers: currentUser._id },
            { _id: 1 }
        ).lean();
        
        if (blockedByUsers.length > 0) {
            filterConditions._id.$nin.push(...blockedByUsers.map(u => u._id));
        }

        // Add personality type filtering with validation
        if (currentUser.personalityType) {
            const compatibleTypes = getCompatiblePersonalityTypes(currentUser.personalityType);
            if (!compatibleTypes || compatibleTypes.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid personality type configuration'
                });
            }
            filterConditions.$or = [
                { personalityType: { $in: compatibleTypes } },
                { personalityType: 'flexible' }
            ];
        }

        // Add budget filtering with validation
        if (currentUser.travelPreferences?.budget) {
            const budgetRanges = getBudgetRanges(currentUser.travelPreferences.budget);
            if (!budgetRanges || budgetRanges.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid budget configuration'
                });
            }
            filterConditions['travelPreferences.budget'] = {
                $in: budgetRanges
            };
        }

        // Add location-based filtering with enhanced validation and dynamic radius
        if (currentUser.location?.coordinates) {
            const matchRadius = currentUser.travelPreferences?.matchRadius || 100; // km
            if (matchRadius < 1 || matchRadius > 20000) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid match radius. Must be between 1 and 20000 km'
                });
            }

            filterConditions.location = {
                $geoWithin: {
                    $centerSphere: [
                        currentUser.location.coordinates,
                        matchRadius / 6371 // Convert km to radians
                    ]
                }
            };
        }

        // Add activity level compatibility
        if (currentUser.travelPreferences?.activityLevel) {
            const activityLevels = ['low', 'moderate', 'high'];
            const currentLevel = activityLevels.indexOf(currentUser.travelPreferences.activityLevel);
            if (currentLevel === -1) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid activity level'
                });
            }
            
            // Get adjacent activity levels for compatibility
            const compatibleLevels = activityLevels.filter((_, index) => 
                Math.abs(index - currentLevel) <= 1
            );
            
            filterConditions['travelPreferences.activityLevel'] = {
                $in: compatibleLevels
            };
        }

        // Add date range compatibility if specified
        if (currentUser.travelPreferences?.dateRange) {
            const { start, end } = currentUser.travelPreferences.dateRange;
            if (start && end) {
                filterConditions['travelPreferences.dateRange'] = {
                    $elemMatch: {
                        start: { $lte: new Date(end) },
                        end: { $gte: new Date(start) }
                    }
                };
            }
        }

        // Add language compatibility
        if (currentUser.languages?.length > 0) {
            filterConditions.languages = {
                $elemMatch: {
                    $in: currentUser.languages
                }
            };
        }

        // Add travel style compatibility
        if (currentUser.travelPreferences?.travelStyle) {
            const compatibleStyles = getCompatibleTravelStyles(currentUser.travelPreferences.travelStyle);
            if (!compatibleStyles || compatibleStyles.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid travel style configuration'
                });
            }
            filterConditions['travelPreferences.travelStyle'] = {
                $in: compatibleStyles
            };
        }

        // Add swipe direction based filtering
        if (lastSwipeDirection === 'right') {
            filterConditions.matchScore = { $gte: 60 };
        } else if (lastSwipeDirection === 'left') {
            filterConditions.matchScore = { $lt: 60 };
        }

        // Add active within last 30 days filter
        filterConditions.lastActive = {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };

        // Add verification level filter if enabled
        if (currentUser.travelPreferences?.verifiedMatchesOnly) {
            filterConditions.verificationLevel = { $gte: 2 };
        }

        // Use a simpler query first to avoid aggregation pipeline errors
        const potentialMatches = await User.find(filterConditions)
            .select('+travelPreferences +personalityType +languages +location')
            .limit(limit)
            .skip(skip)
            .lean();

        // Then process the matches in memory
        const processedMatches = potentialMatches.map(match => {
            try {
                // Calculate distance if location data is valid
                let distance = null;
                if (match.location?.coordinates?.length === 2 && 
                    currentUser.location?.coordinates?.length === 2) {
                    try {
                        distance = calculateDistance(
                            match.location.coordinates,
                            currentUser.location.coordinates
                        );
                    } catch (err) {
                        console.error('Distance calculation error:', err);
                    }
                }

                // Calculate match score
                let matchScore = 50; // Default score
                try {
                    matchScore = calculateMatchScore(match, currentUser);
                } catch (err) {
                    console.error('Match score calculation error:', err);
                }

                return {
                    ...match,
                    distance,
                    matchScore
                };
            } catch (err) {
                console.error('Match processing error:', err);
                return {
                    ...match,
                    distance: null,
                    matchScore: 50
                };
            }
        });

        // Sort matches by score and distance
        const sortedMatches = processedMatches.sort((a, b) => {
            if (a.matchScore === b.matchScore) {
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            }
            return b.matchScore - a.matchScore;
        });
        // Calculate statistics for metadata
        const scores = sortedMatches.map(m => m.matchScore);
        const distances = sortedMatches
            .filter(m => m.distance != null)
            .map(m => m.distance);

        // Get total count for pagination
        const totalCount = await User.countDocuments(filterConditions);

        // Prepare response
        const response = {
            status: 'success',
            results: sortedMatches.length,
            page,
            data: sortedMatches,
            metadata: {
                averageScore: scores.length ? 
                    Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length) : 0,
                scoreRange: scores.length ? {
                    min: Math.min(...scores),
                    max: Math.max(...scores)
                } : null,
                averageDistance: distances.length ?
                    Math.round(distances.reduce((acc, dist) => acc + dist, 0) / distances.length) : null,
                distanceRange: distances.length ? {
                    min: Math.round(Math.min(...distances)),
                    max: Math.round(Math.max(...distances))
                } : null,
                totalPages: Math.ceil(totalCount / limit)
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error in potential matches:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error finding potential matches',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Record a swipe action
router.post('/swipe', protect, swipeLimiter, async (req, res) => {
    try {
        const { swipedId, action } = req.body;

        // Validate request body
        if (!swipedId || !action || !['like', 'reject'].includes(action)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid request. Required fields: swipedId, action (like/reject)'
            });
        }

        // Check if swiped user exists
        const swipedUser = await User.findById(swipedId);
        if (!swipedUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Swiped user not found'
            });
        }

        const matchService = new MatchService();
        const result = await matchService.recordSwipe(req.user.id, swipedId, action);

        if (result.isMutualMatch) {
            // Return enhanced response for mutual match
            res.status(201).json({
                status: 'success',
                data: {
                    swipe: result.swipe,
                    match: result.match,
                    isMutualMatch: true,
                    matchDetails: {
                        matchScore: result.match.matchScore,
                        matchedUser: {
                            id: swipedUser._id,
                            name: swipedUser.name,
                            profilePicture: swipedUser.profilePicture
                        }
                    }
                },
                message: "It's a match! You both liked each other."
            });
        } else {
            // Return normal response for regular swipe
            res.status(201).json({
                status: 'success',
                data: {
                    swipe: result.swipe,
                    isMutualMatch: false
                }
            });
        }
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({
                status: 'fail',
                message: 'You have already swiped on this user'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Error recording swipe',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

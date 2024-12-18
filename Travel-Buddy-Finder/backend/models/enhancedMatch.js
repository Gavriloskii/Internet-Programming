const mongoose = require('mongoose');
const redis = require('redis');
const { promisify } = require('util');
const tf = require('@tensorflow/tfjs-node');

// Redis client setup
const redisClient = redis.createClient(process.env.REDIS_URL);
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

const enhancedMatchSchema = new mongoose.Schema({
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    matchScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0
    },
    compatibilityScores: {
        personality: Number,
        travel: Number,
        interests: Number,
        logistics: Number,
        behavioral: Number
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'expired'],
        default: 'pending'
    },
    matchedOn: {
        type: Date,
        default: Date.now
    },
    lastInteraction: {
        type: Date,
        default: Date.now
    },
    commonInterests: [{
        type: String
    }],
    travelCompatibility: {
        budgetMatch: Number,
        dateMatch: Number,
        destinationMatch: Number,
        styleMatch: Number,
        paceMatch: Number
    },
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    },
    metadata: {
        swipeTime: Number,
        initialMessageSent: Boolean,
        matchType: {
            type: String,
            enum: ['mutual', 'superlike', 'boost', 'ai_recommended'],
            default: 'mutual'
        },
        aiConfidenceScore: Number,
        behavioralScore: Number
    },
    mlFeatures: {
        interactionHistory: [{
            type: String,
            timestamp: Date,
            duration: Number
        }],
        userFeedback: {
            type: Map,
            of: Number
        },
        recommendationStrength: Number
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Enhanced indexing strategy
enhancedMatchSchema.index({ users: 1, status: 1 });
enhancedMatchSchema.index({ matchScore: -1, status: 1 });
enhancedMatchSchema.index({ 'metadata.matchType': 1, matchedOn: -1 });
enhancedMatchSchema.index({ 'compatibilityScores.personality': -1 });
enhancedMatchSchema.index({ 'travelCompatibility.dateMatch': -1 });

// Cache key generator
const generateCacheKey = (user1Id, user2Id) => `match:${[user1Id, user2Id].sort().join(':')}`;

// ML model initialization
let matchingModel;
async function loadModel() {
    try {
        matchingModel = await tf.loadLayersModel('file://./models/matching_model/model.json');
    } catch (error) {
        console.error('Error loading ML model:', error);
        // Fallback to traditional matching if model fails to load
        matchingModel = null;
    }
}
loadModel();

// Enhanced match score calculation with ML integration and caching
enhancedMatchSchema.methods.calculateMatchScore = async function(user1, user2) {
    const cacheKey = generateCacheKey(user1._id, user2._id);
    
    // Try to get from cache first
    try {
        const cachedScore = await getAsync(cacheKey);
        if (cachedScore) {
            const { score, compatibility } = JSON.parse(cachedScore);
            this.matchScore = score;
            this.compatibilityScores = compatibility;
            return score;
        }
    } catch (error) {
        console.error('Cache error:', error);
        // Continue without cache if there's an error
    }

    // Calculate component scores
    const [
        personalityScore,
        travelScore,
        interestScore,
        logisticsScore,
        behavioralScore
    ] = await Promise.all([
        this.calculatePersonalityCompatibility(user1, user2),
        this.calculateTravelCompatibility(user1, user2),
        this.calculateInterestSynergy(user1, user2),
        this.calculateLogisticalCompatibility(user1, user2),
        this.calculateBehavioralCompatibility(user1._id, user2._id)
    ]);

    // Use ML model if available
    let finalScore;
    if (matchingModel) {
        const mlFeatures = this.prepareMLFeatures(
            user1, user2,
            personalityScore,
            travelScore,
            interestScore,
            logisticsScore,
            behavioralScore
        );

        const prediction = matchingModel.predict(tf.tensor2d([mlFeatures]));
        finalScore = prediction.dataSync()[0] * 100;
        this.metadata.aiConfidenceScore = prediction.dataSync()[1] * 100;
    } else {
        // Fallback to weighted average if ML model is unavailable
        const weights = await this.calculateDynamicWeights(user1, user2);
        finalScore = (
            personalityScore * weights.personality +
            travelScore * weights.travel +
            interestScore * weights.interests +
            logisticsScore * weights.logistics +
            behavioralScore * weights.behavioral
        );
    }

    const compatibilityScores = {
        personality: personalityScore,
        travel: travelScore,
        interests: interestScore,
        logistics: logisticsScore,
        behavioral: behavioralScore
    };

    // Store in cache
    try {
        await setAsync(cacheKey, JSON.stringify({
            score: finalScore,
            compatibility: compatibilityScores
        }), 'EX', 3600);
    } catch (error) {
        console.error('Cache storage error:', error);
    }

    this.matchScore = Math.round(finalScore);
    this.compatibilityScores = compatibilityScores;
    return this.matchScore;
};

// Prepare features for ML model
enhancedMatchSchema.methods.prepareMLFeatures = function(user1, user2, ...scores) {
    return [
        ...scores,
        this.calculateLocationDistance(user1.location, user2.location) / 1000, // Distance in km
        user1.travelPreferences.dateFlexibility === user2.travelPreferences.dateFlexibility ? 1 : 0,
        this.calculateLanguageOverlap(user1.languages, user2.languages),
        user1.metadata.responseRate || 0.5,
        user2.metadata.responseRate || 0.5,
        user1.metadata.averageResponseTime || 60,
        user2.metadata.averageResponseTime || 60,
        this.calculateActivityOverlap(user1.travelPreferences.activityLevel, user2.travelPreferences.activityLevel)
    ];
};

// Calculate dynamic weights based on user behavior and preferences
enhancedMatchSchema.methods.calculateDynamicWeights = async function(user1, user2) {
    const baseWeights = {
        personality: 0.25,
        travel: 0.25,
        interests: 0.20,
        logistics: 0.15,
        behavioral: 0.15
    };

    // Adjust weights based on user preferences
    const preferenceAdjustments = {
        personality: user1.personalityWeight || 1,
        travel: Math.max(
            this.calculateTravelPriority(user1),
            this.calculateTravelPriority(user2)
        ),
        interests: this.calculateInterestPriority(user1, user2),
        logistics: this.calculateLogisticsPriority(user1, user2),
        behavioral: Math.min(user1.metadata.matchRate || 0.5, user2.metadata.matchRate || 0.5)
    };

    // Normalize weights
    const adjustedWeights = {};
    const totalWeight = Object.entries(baseWeights).reduce((sum, [key, weight]) => 
        sum + (weight * preferenceAdjustments[key]), 0);

    Object.entries(baseWeights).forEach(([key, weight]) => {
        adjustedWeights[key] = (weight * preferenceAdjustments[key]) / totalWeight;
    });

    return adjustedWeights;
};

// Helper methods for compatibility calculations
enhancedMatchSchema.methods.calculatePersonalityCompatibility = async function(user1, user2) {
    const complementaryPairs = {
        'adventurer': ['flexible', 'cultural'],
        'planner': ['relaxed', 'flexible'],
        'cultural': ['adventurer', 'planner'],
        'relaxed': ['planner', 'flexible'],
        'flexible': ['adventurer', 'cultural', 'planner', 'relaxed']
    };

    let score = 0;
    if (user1.personalityType === user2.personalityType) {
        score = 90;
    } else if (complementaryPairs[user1.personalityType]?.includes(user2.personalityType)) {
        score = 100;
    } else {
        score = 60;
    }

    // Adjust score based on historical match success
    const historicalSuccess = await this.getHistoricalMatchSuccess(
        user1.personalityType,
        user2.personalityType
    );
    
    return score * (0.8 + (historicalSuccess * 0.2));
};

// Statics for match queries with performance optimization
enhancedMatchSchema.statics.findPotentialMatches = async function(userId, preferences, options = {}) {
    const {
        limit = 10,
        page = 1,
        minScore = 0,
        maxDistance = Infinity,
        includeExpired = false
    } = options;

    const pipeline = [
        // Match stage
        {
            $match: {
                users: userId,
                status: includeExpired ? { $in: ['pending', 'expired'] } : 'pending',
                matchScore: { $gte: minScore }
            }
        },
        // Lookup user details
        {
            $lookup: {
                from: 'users',
                localField: 'users',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        // Filter by distance if specified
        ...(maxDistance < Infinity ? [{
            $match: {
                'userDetails.location': {
                    $geoWithin: {
                        $centerSphere: [preferences.location.coordinates, maxDistance / 6371] // Convert km to radians
                    }
                }
            }
        }] : []),
        // Sort by score and recency
        {
            $sort: {
                matchScore: -1,
                matchedOn: -1
            }
        },
        // Pagination
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ];

    return this.aggregate(pipeline);
};

const EnhancedMatch = mongoose.model('EnhancedMatch', enhancedMatchSchema);

module.exports = EnhancedMatch;

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

// Enhanced cache key generator with versioning and features
const generateCacheKey = (user1Id, user2Id, features = {}) => {
    const baseKey = `match:${[user1Id, user2Id].sort().join(':')}`;
    const featureHash = Object.entries(features)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((hash, [key, value]) => hash + `${key}:${value}`, '');
    return `${baseKey}:${modelVersion}:${featureHash}`;
};

// Cache management with TTL and background refresh
const CACHE_TTL = 3600; // 1 hour
const CACHE_REFRESH_THRESHOLD = 3000; // 50 minutes

async function getFromCache(key) {
    try {
        const data = await getAsync(key);
        if (!data) return null;

        const cached = JSON.parse(data);
        const age = Date.now() - cached.timestamp;

        // Background refresh if approaching TTL
        if (age > CACHE_REFRESH_THRESHOLD) {
            setTimeout(() => {
                calculateMatchScore(cached.user1, cached.user2, true)
                    .catch(console.error);
            }, 0);
        }

        return cached.data;
    } catch (error) {
        console.error('Cache retrieval error:', error);
        return null;
    }
}

async function setInCache(key, data, user1, user2) {
    try {
        const cacheData = {
            data,
            timestamp: Date.now(),
            user1,
            user2
        };
        await setAsync(key, JSON.stringify(cacheData), 'EX', CACHE_TTL);
    } catch (error) {
        console.error('Cache storage error:', error);
    }
}

// ML model initialization with versioning and warm-up
let matchingModel;
let modelVersion = '1.0.0';
const MODEL_WARM_UP_SAMPLES = 5;

async function loadModel() {
    try {
        // Load model with version check
        const modelPath = `file://./models/matching_model/model_${modelVersion}.json`;
        matchingModel = await tf.loadLayersModel(modelPath);
        
        // Warm up the model with dummy predictions
        const warmupTensor = tf.randomNormal([MODEL_WARM_UP_SAMPLES, 12]);
        await matchingModel.predict(warmupTensor).data();
        warmupTensor.dispose();
        
        console.log('ML model loaded and warmed up successfully');
    } catch (error) {
        console.error('Error loading ML model:', error);
        matchingModel = null;
    }
}

// Initialize model with error handling and retry
(async () => {
    let retries = 3;
    while (retries > 0 && !matchingModel) {
        try {
            await loadModel();
            break;
        } catch (error) {
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
})();

// Enhanced match score calculation with ML integration, caching, and performance optimization
enhancedMatchSchema.methods.calculateMatchScore = async function(user1, user2, isBackgroundRefresh = false) {
    // Generate cache key with relevant features
    const features = {
        u1_active: user1.metadata?.lastActive ? 'yes' : 'no',
        u2_active: user2.metadata?.lastActive ? 'yes' : 'no',
        matching_version: modelVersion
    };
    const cacheKey = generateCacheKey(user1._id, user2._id, features);
    
    // Try to get from cache first (skip for background refresh)
    if (!isBackgroundRefresh) {
        const cachedResult = await getFromCache(cacheKey);
        if (cachedResult) {
            this.matchScore = cachedResult.score;
            this.compatibilityScores = cachedResult.compatibility;
            return cachedResult.score;
        }
    }

    // Performance optimization: Run calculations in parallel
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

    // Enhanced ML-based scoring with error handling and fallback
    let finalScore;
    let aiConfidence = 0;
    
    if (matchingModel) {
        try {
            // Prepare features with TensorFlow memory management
            const mlFeatures = this.prepareMLFeatures(
                user1, user2,
                personalityScore,
                travelScore,
                interestScore,
                logisticsScore,
                behavioralScore
            );

            // Use tf.tidy for automatic memory cleanup
            const [score, confidence] = tf.tidy(() => {
                const inputTensor = tf.tensor2d([mlFeatures]);
                const predictions = matchingModel.predict(inputTensor);
                return [
                    predictions[0].dataSync()[0] * 100,
                    predictions[1].dataSync()[0] * 100
                ];
            });

            finalScore = score;
            aiConfidence = confidence;
            
            // Log prediction metrics if not a background refresh
            if (!isBackgroundRefresh) {
                this.logPredictionMetrics(mlFeatures, finalScore, aiConfidence);
            }
        } catch (error) {
            console.error('ML prediction error:', error);
            // Fallback to weighted average on ML error
            finalScore = await this.calculateFallbackScore(
                personalityScore,
                travelScore,
                interestScore,
                logisticsScore,
                behavioralScore,
                user1,
                user2
            );
        }
    } else {
        finalScore = await this.calculateFallbackScore(
            personalityScore,
            travelScore,
            interestScore,
            logisticsScore,
            behavioralScore,
            user1,
            user2
        );
    }

    const result = {
        score: Math.round(finalScore),
        compatibility: {
            personality: personalityScore,
            travel: travelScore,
            interests: interestScore,
            logistics: logisticsScore,
            behavioral: behavioralScore
        },
        aiConfidence
    };

    // Update instance properties
    this.matchScore = result.score;
    this.compatibilityScores = result.compatibility;
    this.metadata.aiConfidenceScore = aiConfidence;

    // Cache result if not a background refresh
    if (!isBackgroundRefresh) {
        await setInCache(cacheKey, result, user1, user2);
    }

    return this.matchScore;
};

// Helper methods for ML-based matching

// Calculate fallback score when ML model is unavailable or fails
enhancedMatchSchema.methods.calculateFallbackScore = async function(
    personalityScore,
    travelScore,
    interestScore,
    logisticsScore,
    behavioralScore,
    user1,
    user2
) {
    const weights = await this.calculateDynamicWeights(user1, user2);
    return (
        personalityScore * weights.personality +
        travelScore * weights.travel +
        interestScore * weights.interests +
        logisticsScore * weights.logistics +
        behavioralScore * weights.behavioral
    );
};

// Log prediction metrics for monitoring and improvement
enhancedMatchSchema.methods.logPredictionMetrics = function(features, score, confidence) {
    try {
        const metrics = {
            timestamp: Date.now(),
            features,
            score,
            confidence,
            modelVersion
        };
        
        // Emit metrics for real-time monitoring
        global.io?.emit('matchMetrics', metrics);
        
        // Store metrics for later analysis
        mongoose.model('MatchMetrics').create(metrics).catch(console.error);
    } catch (error) {
        console.error('Error logging prediction metrics:', error);
    }
};

// Enhanced feature preparation for ML model
enhancedMatchSchema.methods.prepareMLFeatures = function(user1, user2, ...scores) {
    return tf.tidy(() => {
        const baseFeatures = [
            ...scores,
            this.calculateLocationDistance(user1.location, user2.location) / 1000, // Distance in km
            user1.travelPreferences.dateFlexibility === user2.travelPreferences.dateFlexibility ? 1 : 0,
            this.calculateLanguageOverlap(user1.languages, user2.languages)
        ];

        // Enhanced behavioral features
        const behavioralFeatures = [
            user1.metadata.responseRate || 0.5,
            user2.metadata.responseRate || 0.5,
            Math.min(user1.metadata.averageResponseTime || 60, 300) / 300, // Normalized response time
            Math.min(user2.metadata.averageResponseTime || 60, 300) / 300,
            this.calculateActivityOverlap(
                user1.travelPreferences.activityLevel,
                user2.travelPreferences.activityLevel
            )
        ];

        // Travel style compatibility
        const travelFeatures = [
            this.calculateTravelStyleMatch(user1.travelPreferences, user2.travelPreferences),
            this.calculateBudgetCompatibility(user1.travelPreferences, user2.travelPreferences),
            this.calculateDestinationOverlap(user1.travelPreferences, user2.travelPreferences)
        ];

        // Interaction history features
        const interactionFeatures = [
            this.calculatePastInteractionScore(user1._id, user2._id),
            user1.metadata.matchSuccessRate || 0.5,
            user2.metadata.matchSuccessRate || 0.5
        ];

        return [...baseFeatures, ...behavioralFeatures, ...travelFeatures, ...interactionFeatures];
    });
};

// Enhanced dynamic weight calculation with behavioral analysis
enhancedMatchSchema.methods.calculateDynamicWeights = async function(user1, user2) {
    // Get historical success rates from cache or calculate
    const historicalWeights = await this.getHistoricalWeights(user1, user2);
    
    // Calculate base weights with behavioral adjustments
    const baseWeights = {
        personality: 0.25 * (1 + (user1.personalityWeight || 0)),
        travel: 0.25 * this.calculateTravelPriority(user1, user2),
        interests: 0.20 * this.calculateInterestPriority(user1, user2),
        logistics: 0.15 * this.calculateLogisticsPriority(user1, user2),
        behavioral: 0.15 * (1 + Math.min(
            user1.metadata.matchSuccessRate || 0.5,
            user2.metadata.matchSuccessRate || 0.5
        ))
    };

    // Apply historical success rates if available
    if (historicalWeights) {
        Object.keys(baseWeights).forEach(key => {
            baseWeights[key] *= (1 + (historicalWeights[key] || 0));
        });
    }

    // Normalize weights to ensure they sum to 1
    const totalWeight = Object.values(baseWeights).reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = {};

    Object.entries(baseWeights).forEach(([key, weight]) => {
        normalizedWeights[key] = weight / totalWeight;
    });

    return normalizedWeights;
};

// Helper method to calculate travel priority
enhancedMatchSchema.methods.calculateTravelPriority = function(user1, user2) {
    const dateOverlap = this.calculateDateOverlap(
        user1.travelPreferences?.travelDates,
        user2.travelPreferences?.travelDates
    );
    const destinationMatch = this.calculateDestinationMatch(
        user1.travelPreferences?.destinations,
        user2.travelPreferences?.destinations
    );
    return (dateOverlap + destinationMatch) / 2;
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

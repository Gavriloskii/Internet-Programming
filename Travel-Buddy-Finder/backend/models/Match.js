const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    notificationStatus: {
        type: String,
        enum: ['pending', 'sent', 'read'],
        default: 'pending'
    },
    matchInitiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    matchScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0
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
        styleMatch: Number
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
            enum: ['mutual', 'superlike', 'boost'],
            default: 'mutual'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
matchSchema.index({ users: 1 });
matchSchema.index({ matchScore: -1 });
matchSchema.index({ status: 1 });
matchSchema.index({ matchedOn: -1 });

// Virtual for match age
matchSchema.virtual('matchAge').get(function() {
    return Date.now() - this.matchedOn;
});

// Enhanced method to calculate match score with ML-based compatibility
matchSchema.methods.calculateMatchScore = function(user1Preferences = {}, user2Preferences = {}) {
    let score = 0;
    const weights = {
        budget: 0.20,
        dates: 0.15,
        destinations: 0.20,
        travelStyle: 0.15,
        personality: 0.15,
        interests: 0.15
    };

    // Handle undefined preferences
    if (!user1Preferences || !user2Preferences) {
        return 50; // Return default score if preferences are missing
    }

    // Enhanced budget compatibility with progressive scaling
    const budgetMap = { 'budget': 1, 'moderate': 2, 'luxury': 3 };
    const budgetDiff = Math.abs(budgetMap[user1Preferences.budget] - budgetMap[user2Preferences.budget]);
    const budgetScore = Math.max(0, 100 - (budgetDiff * 33.33));
    score += budgetScore * weights.budget;

    // Enhanced date compatibility with flexibility bonus
    const dateOverlap = this.calculateDateOverlap(
        user1Preferences.travelDates,
        user2Preferences.travelDates
    );
    const flexibilityBonus = user1Preferences.dateFlexibility && user2Preferences.dateFlexibility ? 15 : 0;
    score += (dateOverlap + flexibilityBonus) * weights.dates;

    // Enhanced destination compatibility with region matching
    const destinationMatch = this.calculateDestinationMatch(
        user1Preferences.destinations,
        user2Preferences.destinations
    );
    const regionBonus = this.calculateRegionMatch(
        user1Preferences.destinations,
        user2Preferences.destinations
    );
    score += (destinationMatch + regionBonus) * weights.destinations;

    // Enhanced travel style compatibility with pace consideration
    const styleMatch = this.calculateStyleMatch(
        user1Preferences.travelStyle,
        user2Preferences.travelStyle,
        user1Preferences.pace,
        user2Preferences.pace
    );
    score += styleMatch * weights.travelStyle;

    // New: Personality compatibility
    const personalityMatch = this.calculatePersonalityMatch(
        user1Preferences.personalityType,
        user2Preferences.personalityType
    );
    score += personalityMatch * weights.personality;

    // New: Interest synergy with weighted categories
    const interestMatch = this.calculateInterestSynergy(
        user1Preferences.interests,
        user2Preferences.interests
    );
    score += interestMatch * weights.interests;

    // Apply dynamic adjustments based on user activity and engagement
    score = this.applyDynamicAdjustments(score, user1Preferences, user2Preferences);

    this.matchScore = Math.round(score);
    return this.matchScore;
};

// New: Calculate personality match with complementary traits
matchSchema.methods.calculatePersonalityMatch = function(type1, type2) {
    const complementaryPairs = {
        'adventurer': ['flexible', 'cultural'],
        'planner': ['relaxed', 'flexible'],
        'cultural': ['adventurer', 'planner'],
        'relaxed': ['planner', 'flexible'],
        'flexible': ['adventurer', 'cultural', 'planner', 'relaxed']
    };

    if (type1 === type2) return 90;
    if (complementaryPairs[type1]?.includes(type2)) return 100;
    return 60;
};

// New: Calculate interest synergy with category weights
matchSchema.methods.calculateInterestSynergy = function(interests1, interests2) {
    const categoryWeights = {
        'adventure': 1.2,
        'culture': 1.1,
        'nature': 1.1,
        'food': 1.0,
        'history': 1.0,
        'photography': 0.9,
        'nightlife': 0.9,
        'shopping': 0.8,
        'art': 1.0,
        'sports': 0.9
    };

    const commonInterests = interests1.filter(i => interests2.includes(i));
    let weightedScore = commonInterests.reduce((score, interest) => 
        score + (categoryWeights[interest] || 1), 0);
    
    const maxPossibleScore = Math.min(interests1.length, interests2.length);
    return (weightedScore / maxPossibleScore) * 100;
};

// Enhanced: Calculate style match with pace consideration
matchSchema.methods.calculateStyleMatch = function(style1, style2, pace1, pace2) {
    const styleCategories = {
        'luxury': ['luxury', 'comfort'],
        'comfort': ['luxury', 'comfort', 'backpacker'],
        'backpacker': ['comfort', 'backpacker', 'budget'],
        'budget': ['backpacker', 'budget']
    };

    const paceCompatibility = {
        'slow': ['slow', 'moderate'],
        'moderate': ['slow', 'moderate', 'fast'],
        'fast': ['moderate', 'fast']
    };

    let styleScore = style1 === style2 ? 100 :
                     styleCategories[style1]?.includes(style2) ? 75 : 25;

    let paceScore = pace1 === pace2 ? 100 :
                    paceCompatibility[pace1]?.includes(pace2) ? 75 : 25;

    return (styleScore * 0.6) + (paceScore * 0.4);
};

// New: Calculate region match for broader destination compatibility
matchSchema.methods.calculateRegionMatch = function(destinations1, destinations2) {
    const getRegion = destination => {
        // Simplified region mapping
        const regionMap = {
            'europe': ['france', 'italy', 'spain', 'germany'],
            'asia': ['japan', 'thailand', 'vietnam', 'china'],
            'americas': ['usa', 'canada', 'mexico', 'brazil']
            // Add more regions as needed
        };

        for (const [region, countries] of Object.entries(regionMap)) {
            if (countries.some(country => 
                destination.toLowerCase().includes(country))) {
                return region;
            }
        }
        return null;
    };

    const regions1 = destinations1.map(getRegion).filter(Boolean);
    const regions2 = destinations2.map(getRegion).filter(Boolean);
    const commonRegions = regions1.filter(r => regions2.includes(r));

    return (commonRegions.length / Math.max(regions1.length, regions2.length)) * 25;
};

// New: Apply dynamic adjustments based on user behavior and preferences
matchSchema.methods.applyDynamicAdjustments = function(score, prefs1, prefs2) {
    let adjustedScore = score;

    // Adjust for activity level compatibility
    if (prefs1.activityLevel && prefs2.activityLevel) {
        const activityDiff = Math.abs(
            ['low', 'moderate', 'high'].indexOf(prefs1.activityLevel) -
            ['low', 'moderate', 'high'].indexOf(prefs2.activityLevel)
        );
        adjustedScore *= (1 - (activityDiff * 0.1));
    }

    // Adjust for language compatibility
    const commonLanguages = prefs1.languages?.filter(l => 
        prefs2.languages?.includes(l)
    ).length || 0;
    if (commonLanguages > 0) {
        adjustedScore *= (1 + (commonLanguages * 0.05));
    }

    // Cap the final score at 100
    return Math.min(adjustedScore, 100);
};

// Helper method to calculate date overlap
matchSchema.methods.calculateDateOverlap = function(dates1, dates2) {
    const start1 = new Date(dates1.start);
    const end1 = new Date(dates1.end);
    const start2 = new Date(dates2.start);
    const end2 = new Date(dates2.end);

    if (end1 < start2 || end2 < start1) return 0;

    const overlapStart = new Date(Math.max(start1, start2));
    const overlapEnd = new Date(Math.min(end1, end2));
    const overlap = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
    const maxPossibleOverlap = Math.min(
        (end1 - start1) / (1000 * 60 * 60 * 24),
        (end2 - start2) / (1000 * 60 * 60 * 24)
    );

    return (overlap / maxPossibleOverlap) * 100;
};

// Helper method to calculate destination match
matchSchema.methods.calculateDestinationMatch = function(destinations1, destinations2) {
    const commonDestinations = destinations1.filter(d => destinations2.includes(d));
    const maxPossibleMatch = Math.min(destinations1.length, destinations2.length);
    return (commonDestinations.length / maxPossibleMatch) * 100;
};

// Helper method to calculate travel style match
matchSchema.methods.calculateStyleMatch = function(style1, style2) {
    const styleCategories = {
        'luxury': ['luxury', 'comfort'],
        'comfort': ['luxury', 'comfort', 'backpacker'],
        'backpacker': ['comfort', 'backpacker', 'budget'],
        'budget': ['backpacker', 'budget']
    };

    if (style1 === style2) return 100;
    if (styleCategories[style1]?.includes(style2)) return 75;
    return 25;
};

// Statics for match queries
matchSchema.statics.findPotentialMatches = async function(userId, preferences, limit = 10) {
    const matches = await this.find({
        users: userId,
        status: 'pending'
    })
    .sort('-matchScore')
    .limit(limit)
    .populate('users', 'name profilePicture travelPreferences');

    return matches;
};

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;

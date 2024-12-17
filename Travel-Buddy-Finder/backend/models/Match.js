const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
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

// Method to calculate match score
matchSchema.methods.calculateMatchScore = function(user1Preferences, user2Preferences) {
    let score = 0;
    const weights = {
        budget: 0.25,
        dates: 0.20,
        destinations: 0.30,
        travelStyle: 0.25
    };

    // Budget compatibility
    const budgetDiff = Math.abs(user1Preferences.budget - user2Preferences.budget);
    const budgetScore = Math.max(0, 100 - (budgetDiff / 100));
    score += budgetScore * weights.budget;

    // Date compatibility
    const dateOverlap = this.calculateDateOverlap(
        user1Preferences.travelDates,
        user2Preferences.travelDates
    );
    score += dateOverlap * weights.dates;

    // Destination compatibility
    const destinationMatch = this.calculateDestinationMatch(
        user1Preferences.destinations,
        user2Preferences.destinations
    );
    score += destinationMatch * weights.destinations;

    // Travel style compatibility
    const styleMatch = this.calculateStyleMatch(
        user1Preferences.travelStyle,
        user2Preferences.travelStyle
    );
    score += styleMatch * weights.travelStyle;

    this.matchScore = Math.round(score);
    return this.matchScore;
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

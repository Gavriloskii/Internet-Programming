const mongoose = require('mongoose');

const travelJournalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Journal must belong to a user']
    },
    title: {
        type: String,
        required: [true, 'Journal must have a title'],
        trim: true,
        maxLength: [100, 'Title cannot exceed 100 characters']
    },
    content: {
        type: String,
        required: [true, 'Journal content cannot be empty'],
        trim: true,
        maxLength: [5000, 'Content cannot exceed 5000 characters']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        },
        name: {
            type: String,
            required: [true, 'Location name is required']
        },
        country: String,
        city: String
    },
    dates: {
        start: {
            type: Date,
            required: [true, 'Start date is required']
        },
        end: {
            type: Date,
            required: [true, 'End date is required']
        }
    },
    media: [{
        type: {
            type: String,
            enum: ['image', 'video'],
            required: true
        },
        url: {
            type: String,
            required: true
        },
        caption: String,
        thumbnail: String,
        order: Number
    }],
    tags: [{
        type: String,
        trim: true
    }],
    category: {
        type: String,
        enum: [
            'adventure',
            'culture',
            'food',
            'nature',
            'city',
            'beach',
            'mountains',
            'road-trip',
            'other'
        ],
        default: 'other'
    },
    mood: {
        type: String,
        enum: ['excited', 'happy', 'relaxed', 'tired', 'challenging'],
        required: true
    },
    weather: {
        type: String,
        enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'],
        required: true
    },
    expenses: [{
        category: {
            type: String,
            enum: ['accommodation', 'food', 'transport', 'activities', 'shopping', 'other'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true
        },
        description: String
    }],
    companions: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    group: {
        type: mongoose.Schema.ObjectId,
        ref: 'Group'
    },
    privacy: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public'
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    likes: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxLength: [500, 'Comment cannot exceed 500 characters']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    lastEditedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
travelJournalSchema.index({ user: 1, createdAt: -1 });
travelJournalSchema.index({ location: '2dsphere' });
travelJournalSchema.index({ 'dates.start': 1, 'dates.end': 1 });
travelJournalSchema.index({ tags: 1 });

// Virtual populate for user details
travelJournalSchema.virtual('author', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true
});

// Pre-save middleware
travelJournalSchema.pre('save', function(next) {
    if (this.isModified('content')) {
        this.isEdited = true;
        this.lastEditedAt = Date.now();
    }
    next();
});

// Instance methods
travelJournalSchema.methods.isOwner = function(userId) {
    return this.user.toString() === userId.toString();
};

travelJournalSchema.methods.canView = function(user) {
    if (this.privacy === 'public') return true;
    if (this.isOwner(user._id)) return true;
    if (this.privacy === 'friends' && user.matches.includes(this.user)) return true;
    return false;
};

travelJournalSchema.methods.addComment = function(userId, content) {
    this.comments.push({
        user: userId,
        content
    });
    return this.save();
};

travelJournalSchema.methods.toggleLike = function(userId) {
    const userIdStr = userId.toString();
    const index = this.likes.findIndex(id => id.toString() === userIdStr);
    
    if (index === -1) {
        this.likes.push(userId);
    } else {
        this.likes.splice(index, 1);
    }
    
    return this.save();
};

// Static methods
travelJournalSchema.statics.getPublicJournals = function(filters = {}) {
    const query = { privacy: 'public', status: 'published', ...filters };
    return this.find(query)
        .populate('user', 'name profilePicture')
        .populate('companions', 'name profilePicture')
        .sort('-createdAt');
};

travelJournalSchema.statics.getUserFeed = function(userId, page = 1, limit = 10) {
    return this.aggregate([
        {
            $match: {
                $or: [
                    { privacy: 'public' },
                    { user: mongoose.Types.ObjectId(userId) },
                    {
                        $and: [
                            { privacy: 'friends' },
                            { user: { $in: user.matches } }
                        ]
                    }
                ],
                status: 'published'
            }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);
};

const TravelJournal = mongoose.model('TravelJournal', travelJournalSchema);

module.exports = TravelJournal;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
        maxLength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false // Don't send password in queries by default
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function(el) {
                return el === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    profilePicture: {
        type: String,
        default: '/default-avatar.png'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    personalityType: {
        type: String,
        enum: ['adventurer', 'planner', 'flexible', 'relaxed', 'cultural'],
        default: 'flexible'
    },
    travelPreferences: {
        budget: {
            type: String,
            enum: ['budget', 'moderate', 'luxury'],
            default: 'moderate'
        },
        pace: {
            type: String,
            enum: ['slow', 'moderate', 'fast'],
            default: 'moderate'
        },
        interests: [{
            type: String,
            enum: [
                'nature',
                'culture',
                'food',
                'adventure',
                'history',
                'photography',
                'nightlife',
                'shopping',
                'art',
                'sports'
            ]
        }],
        accommodationPreference: {
            type: String,
            enum: ['hostel', 'hotel', 'apartment', 'camping', 'flexible'],
            default: 'flexible'
        }
    },
    languages: [{
        language: {
            type: String,
            required: true
        },
        proficiency: {
            type: String,
            enum: ['basic', 'intermediate', 'fluent', 'native'],
            required: true
        }
    }],
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
        country: String,
        city: String
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastActive: {
        type: Date,
        default: Date.now
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: undefined
    },
    matches: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    likes: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    conversations: [{
        type: String,
        ref: 'Conversation'
    }],
    blockedUsers: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    notifications: [{
        type: {
            type: String,
            enum: ['match', 'message', 'system'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();
    
    try {
        // Validate password confirmation
        if (this.isNew && this.password !== this.passwordConfirm) {
            throw new Error('Passwords do not match');
        }

        // Hash the password with cost of 12
        this.password = await bcrypt.hash(this.password, 12);
        
        // Remove passwordConfirm field after validation
        this.passwordConfirm = undefined;
        next();
    } catch (error) {
        next(error);
    }
});

// Add password confirmation validation
userSchema.path('password').validate(function(value) {
    if (this.isNew || this.isModified('password')) {
        if (value.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        if (!/\d/.test(value)) {
            throw new Error('Password must contain at least one number');
        }
        if (!/[A-Z]/.test(value)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(value)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        if (!/[!@#$%^&*]/.test(value)) {
            throw new Error('Password must contain at least one special character (!@#$%^&*)');
        }
    }
    return true;
});

// Update lastActive timestamp
userSchema.pre(/^find/, function(next) {
    if (this.options._id) {
        User.findByIdAndUpdate(this.options._id, { lastActive: Date.now() }).exec();
    }
    next();
});

// Instance method to check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if user can match with another user
userSchema.methods.canMatchWith = function(otherUser) {
    const otherUserId = otherUser._id.toString();
    const blockedUsers = this.blockedUsers.map(id => id.toString());
    const matches = this.matches.map(id => id.toString());
    const otherBlockedUsers = otherUser.blockedUsers.map(id => id.toString());

    return !blockedUsers.includes(otherUserId) && 
           !otherBlockedUsers.includes(this._id.toString()) &&
           !matches.includes(otherUserId);
};

// Virtual populate for travel journals
userSchema.virtual('travelJournals', {
    ref: 'TravelJournal',
    foreignField: 'user',
    localField: '_id'
});

// Virtual populate for reviews
userSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'user',
    localField: '_id'
});

const User = mongoose.model('User', userSchema);

module.exports = User;

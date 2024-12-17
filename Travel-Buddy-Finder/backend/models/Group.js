const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Group must have a name'],
        trim: true,
        maxLength: [50, 'Group name cannot exceed 50 characters']
    },
    description: {
        type: String,
        trim: true,
        maxLength: [200, 'Group description cannot exceed 200 characters']
    },
    creator: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Group must have a creator']
    },
    type: {
        type: String,
        enum: ['travel', 'chat', 'event'],
        default: 'travel'
    },
    members: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['admin', 'moderator', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'banned'],
            default: 'active'
        }
    }],
    travelDetails: {
        destination: {
            type: String,
            required: function() { return this.type === 'travel'; }
        },
        startDate: {
            type: Date,
            required: function() { return this.type === 'travel'; }
        },
        endDate: {
            type: Date,
            required: function() { return this.type === 'travel'; }
        },
        budget: {
            type: String,
            enum: ['budget', 'moderate', 'luxury'],
            required: function() { return this.type === 'travel'; }
        },
        maxMembers: {
            type: Number,
            min: [2, 'Group must allow at least 2 members'],
            max: [20, 'Group cannot exceed 20 members']
        },
        interests: [{
            type: String,
            enum: [
                'nature', 'culture', 'food', 'adventure', 'history',
                'photography', 'nightlife', 'shopping', 'art', 'sports'
            ]
        }],
        status: {
            type: String,
            enum: ['planning', 'ongoing', 'completed', 'cancelled'],
            default: 'planning'
        }
    },
    settings: {
        isPrivate: {
            type: Boolean,
            default: false
        },
        joinRequiresApproval: {
            type: Boolean,
            default: true
        },
        memberCanInvite: {
            type: Boolean,
            default: false
        },
        messageRetentionDays: {
            type: Number,
            default: 365
        }
    },
    pendingRequests: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        requestedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    }],
    lastActivity: {
        type: Date,
        default: Date.now
    },
    messageCount: {
        type: Number,
        default: 0
    },
    avatar: {
        type: String,
        default: 'default-group.jpg'
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ 'travelDetails.destination': 1 });
groupSchema.index({ 'travelDetails.startDate': 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });

// Virtual populate messages
groupSchema.virtual('messages', {
    ref: 'Message',
    foreignField: 'groupId',
    localField: '_id'
});

// Middleware
groupSchema.pre('save', function(next) {
    // Update lastActivity on any changes
    this.lastActivity = Date.now();
    next();
});

// Methods
groupSchema.methods.isMember = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString() && 
        member.status === 'active'
    );
};

groupSchema.methods.isAdmin = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString() && 
        (member.role === 'admin' || member.role === 'moderator')
    );
};

groupSchema.methods.addMember = async function(userId, role = 'member') {
    if (this.isMember(userId)) {
        throw new Error('User is already a member of this group');
    }

    if (this.travelDetails.maxMembers && 
        this.members.length >= this.travelDetails.maxMembers) {
        throw new Error('Group has reached maximum member limit');
    }

    this.members.push({
        user: userId,
        role,
        joinedAt: Date.now(),
        status: 'active'
    });

    return this.save();
};

groupSchema.methods.removeMember = async function(userId) {
    const memberIndex = this.members.findIndex(
        member => member.user.toString() === userId.toString()
    );

    if (memberIndex === -1) {
        throw new Error('User is not a member of this group');
    }

    this.members.splice(memberIndex, 1);
    return this.save();
};

groupSchema.methods.updateMemberRole = async function(userId, newRole) {
    const member = this.members.find(
        member => member.user.toString() === userId.toString()
    );

    if (!member) {
        throw new Error('User is not a member of this group');
    }

    member.role = newRole;
    return this.save();
};

// Static methods
groupSchema.statics.getActiveGroups = function(userId) {
    return this.find({
        'members.user': userId,
        'members.status': 'active',
        isArchived: false
    })
    .populate('members.user', 'name profilePicture')
    .sort('-lastActivity');
};

groupSchema.statics.searchGroups = function(query, filters = {}) {
    const searchQuery = {
        isArchived: false,
        $text: { $search: query }
    };

    if (filters.type) searchQuery.type = filters.type;
    if (filters.destination) searchQuery['travelDetails.destination'] = filters.destination;
    if (filters.startDate) searchQuery['travelDetails.startDate'] = { $gte: filters.startDate };
    if (filters.budget) searchQuery['travelDetails.budget'] = filters.budget;

    return this.find(searchQuery)
        .populate('creator', 'name profilePicture')
        .sort('-lastActivity');
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;

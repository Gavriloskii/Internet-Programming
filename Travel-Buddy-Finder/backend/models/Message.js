const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Message must have a sender']
    },
    recipient: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Message must have a recipient']
    },
    content: {
        type: String,
        required: [true, 'Message cannot be empty'],
        trim: true,
        maxLength: [2000, 'Message cannot exceed 2000 characters']
    },
    type: {
        type: String,
        enum: ['text', 'image', 'location', 'system'],
        default: 'text'
    },
    metadata: {
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                default: [0, 0]
            }
        },
        imageUrl: String,
        fileName: String,
        fileSize: Number
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    readAt: Date,
    deliveredAt: Date,
    groupId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Group'
    },
    replyTo: {
        type: mongoose.Schema.ObjectId,
        ref: 'Message'
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ groupId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({
    sender: 1,
    recipient: 1,
    createdAt: -1
});

// Virtual for time elapsed since message was sent
messageSchema.virtual('timeElapsed').get(function() {
    return Date.now() - this.createdAt;
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
    // Set delivered timestamp if status changes to delivered
    if (this.isModified('status') && this.status === 'delivered') {
        this.deliveredAt = Date.now();
    }
    
    // Set read timestamp if status changes to read
    if (this.isModified('status') && this.status === 'read') {
        this.readAt = Date.now();
    }

    // Handle message edits
    if (this.isModified('content') && !this.isNew) {
        this.isEdited = true;
        this.editHistory.push({
            content: this._original.content,
            editedAt: Date.now()
        });
    }

    next();
});

// Pre-find middleware to exclude deleted messages
messageSchema.pre(/^find/, function(next) {
    if (!this.getQuery().includeDeleted) {
        this.find({ isDeleted: { $ne: true } });
    }
    next();
});

// Static methods
messageSchema.statics.getConversation = async function(user1Id, user2Id, options = {}) {
    const query = {
        $or: [
            { sender: user1Id, recipient: user2Id },
            { sender: user2Id, recipient: user1Id }
        ]
    };

    if (options.after) {
        query.createdAt = { $gt: options.after };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .populate('sender', 'name profilePicture')
        .populate('recipient', 'name profilePicture')
        .populate('replyTo');
};

messageSchema.statics.markAsRead = async function(userId, senderId) {
    return this.updateMany(
        {
            recipient: userId,
            sender: senderId,
            status: { $ne: 'read' }
        },
        {
            $set: {
                status: 'read',
                readAt: Date.now()
            }
        }
    );
};

// Instance methods
messageSchema.methods.softDelete = async function() {
    this.isDeleted = true;
    this.deletedAt = Date.now();
    this.content = 'This message has been deleted';
    return this.save();
};

messageSchema.methods.edit = async function(newContent) {
    if (this.isDeleted) {
        throw new Error('Cannot edit deleted message');
    }

    this._original = {
        content: this.content
    };

    this.content = newContent;
    return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

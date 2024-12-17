const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/testAuth');
const User = require('../models/User');

// Create Express app
const app = express();

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(xss());
app.use(mongoSanitize());

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const user = await User.create(req.body);
        const token = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                personalityType: user.personalityType,
                travelPreferences: user.travelPreferences
            }, 
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            status: 'success',
            token,
            data: { user }
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: err.message
        });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    const user = await User.findById(req.user._id);
    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

// Store group memberships in memory for testing
const groupMemberships = new Map();

// Protected routes
app.use('/api/matches', protect, (req, res) => {
    if (req.method === 'GET') {
        res.status(200).json({
            status: 'success',
            data: { matches: [] }
        });
    } else if (req.method === 'POST' && req.path.includes('/swipe')) {
        if (!mongoose.Types.ObjectId.isValid(req.body.targetUserId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid user ID'
            });
        }
        res.status(200).json({
            status: 'success',
            data: { match: null }
        });
    }
});

app.use('/api/messages', protect, (req, res) => {
    if (req.method === 'POST') {
        const { content, recipientId } = req.body;
        
        if (content.length > 1000) {
            return res.status(400).json({
                status: 'error',
                message: 'Message content too long'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid recipient ID'
            });
        }

        res.status(201).json({
            status: 'success',
            data: {
                message: {
                    content,
                    recipientId,
                    senderId: req.user._id,
                    createdAt: new Date()
                }
            }
        });
    }
});

app.use('/api/groups', protect, (req, res) => {
    if (req.method === 'POST') {
        if (req.path.includes('/join')) {
            const groupId = req.path.split('/')[1];
            if (!mongoose.Types.ObjectId.isValid(groupId)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid group ID'
                });
            }

            // Check if user is already a member
            const members = groupMemberships.get(groupId) || new Set();
            if (members.has(req.user._id.toString())) {
                return res.status(400).json({
                    status: 'error',
                    message: 'User is already a member of this group'
                });
            }

            // Add user to group
            members.add(req.user._id.toString());
            groupMemberships.set(groupId, members);

            res.status(200).json({
                status: 'success',
                data: { message: 'Joined group successfully' }
            });
        } else {
            const groupId = new mongoose.Types.ObjectId();
            const group = {
                _id: groupId,
                ...req.body,
                members: [req.user._id],
                createdBy: req.user._id,
                createdAt: new Date()
            };

            // Initialize group membership
            groupMemberships.set(groupId.toString(), new Set([req.user._id.toString()]));

            res.status(201).json({
                status: 'success',
                data: { group }
            });
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Something went wrong!'
    });
});

module.exports = app;

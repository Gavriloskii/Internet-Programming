const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');

// Import the main auth middleware
const { protect: mainProtect, restrictTo: mainRestrictTo } = require('./auth');

// Extend the main protect middleware for test environment
exports.protect = async (req, res, next) => {
    try {
        // Try main protect first
        await mainProtect(req, res, async (err) => {
            // If error and we're in test environment, try to create test user
            if (err && process.env.NODE_ENV === 'test' && req.headers.authorization) {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Create test user if token is valid
                const user = await User.create({
                    _id: decoded.id,
                    name: 'Test User',
                    email: decoded.email || 'test@example.com',
                    password: 'Test123!@#',
                    personalityType: decoded.personalityType || 'adventurer',
                    travelPreferences: decoded.travelPreferences || {
                        budget: 'moderate',
                        pace: 'moderate',
                        interests: ['adventure'],
                        accommodationPreference: 'flexible'
                    }
                });
                
                req.user = user;
                return next();
            }
            return next(err);
        });
    } catch (error) {
        next(new AppError('Invalid token. Please log in again.', 401));
    }
};

// Use the main restrictTo middleware
exports.restrictTo = mainRestrictTo;

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const User = require('../models/User');
const logger = require('../utils/logger'); // Assuming a logger utility is available

// Protect routes - Authentication check
exports.protect = async (req, res, next) => {
    try {
        let token;

        // 1) Get token from signed cookie or Authorization header
        if (req.signedCookies && req.signedCookies.jwt) {
            token = req.signedCookies.jwt;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        // For development, allow test token
        if (process.env.NODE_ENV === 'development' && req.headers['x-test-auth']) {
            token = req.headers['x-test-auth'];
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'You are not logged in. Please log in to get access.'
            });
        }

        try {
            // 2) Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3) Check if user still exists
            const user = await User.findById(decoded.id).select('+active');
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'The user belonging to this token no longer exists.'
                });
            }

            // 4) Check if user is active
            if (!user.active) {
                return res.status(401).json({
                    status: 'error',
                    message: 'This user account has been deactivated.'
                });
            }

            // 5) Grant access to protected route
            req.user = user;
            next();
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid token. Please log in again.'
                });
            } else if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Your token has expired. Please log in again.'
                });
            }
            throw err;
        }
    } catch (error) {
        next(error);
    }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

// Check if user is verified
exports.isVerified = (req, res, next) => {
    if (!req.user.verified) {
        return next(new AppError('Please verify your email address to access this feature', 403));
    }
    next();
};

// Rate limiting for sensitive operations
exports.sensitiveOperationLimit = async (req, res, next) => {
    try {
        const key = `${req.user.id}:sensitiveOps`;
        const limit = 5; // Maximum operations per hour
        const current = await req.rateLimit.get(key);

        if (current && current >= limit) {
            throw new AppError('Too many sensitive operations. Please try again later.', 429);
        }

        await req.rateLimit.incr(key, 3600); // 1 hour expiry
        next();
    } catch (error) {
        next(error);
    }
};

// Verify CSRF token for sensitive operations
exports.verifyCsrfToken = (req, res, next) => {
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.csrfToken()) {
        return next(new AppError('Invalid CSRF token', 403));
    }
    next();
};

// Check if user can access resource
exports.checkResourceAccess = (Model) => async (req, res, next) => {
    try {
        const resource = await Model.findById(req.params.id);
        if (!resource) {
            return next(new AppError('Resource not found', 404));
        }

        // Check if user owns the resource or is admin
        if (resource.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return next(new AppError('You do not have permission to perform this action', 403));
        }

        req.resource = resource;
        next();
    } catch (error) {
        next(error);
    }
};

// Check if users can interact
exports.canInteract = async (req, res, next) => {
    try {
        const otherUser = await User.findById(req.params.userId);
        if (!otherUser) {
            return next(new AppError('User not found', 404));
        }

        if (!req.user.canMatchWith(otherUser)) {
            return next(new AppError('You cannot interact with this user', 403));
        }

        req.otherUser = otherUser;
        next();
    } catch (error) {
        next(error);
    }
};

// Update last active timestamp
exports.updateLastActive = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            lastActive: Date.now()
        });
        next();
    } catch (error) {
        next(error);
    }
};

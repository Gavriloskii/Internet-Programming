const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const User = require('../models/User');

// Protect routes - Authentication check
exports.protect = async (req, res, next) => {
    try {
        let token;

        // 1) Get token from cookie or Authorization header
        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError('You are not logged in. Please log in to get access.', 401);
        }

        // 2) Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const user = await User.findById(decoded.id).select('+active');
        if (!user) {
            throw new AppError('The user belonging to this token no longer exists.', 401);
        }

        // 4) Check if user is active
        if (!user.active) {
            throw new AppError('This user account has been deactivated.', 401);
        }

        // 5) Grant access to protected route
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new AppError('Invalid token. Please log in again.', 401));
        } else if (error.name === 'TokenExpiredError') {
            next(new AppError('Your token has expired. Please log in again.', 401));
        } else {
            next(error);
        }
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

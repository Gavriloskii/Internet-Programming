const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authLimiter } = require('../middleware/security');
const { AppError } = require('../middleware/errorHandler');

// Import User model
const User = require('../models/User');

// Helper function to verify token and get user
const verifyAndGetUser = async (req, includePassword = false) => {
    const { jwt: token } = req.signedCookies;

    if (!token) {
        throw new AppError('Not logged in', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user
    const query = User.findById(decoded.id);
    if (includePassword) {
        query.select('+password');
    }
    
    const user = await query;
    if (!user) {
        throw new AppError('User not found', 404);
    }

    return user;
};

// Helper function to create and send token
const createSendToken = (user, statusCode, res) => {
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from output
    user.password = undefined;

    // Set secure cookie with appropriate settings for both development and production
    res.cookie('jwt', token, {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Adjusted for better compatibility
        path: '/',
        signed: true
    });

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

// Register new user
router.post('/signup', async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        // Validate input
        if (!email || !password || !name) {
            throw new AppError('Please provide email, password and name', 400);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Please provide a valid email address', 400);
        }

        // Validate password strength
        if (password.length < 8) {
            throw new AppError('Password must be at least 8 characters long', 400);
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email already registered', 400);
        }

        // Create new user
        const user = await User.create({
            email,
            password,
            name,
            travelPreferences: {
                budget: 'moderate',
                pace: 'moderate',
                accommodationPreference: 'flexible'
            }
        });

        createSendToken(user, 201, res);
    } catch (error) {
        next(error);
    }
});

// Login user
router.post('/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            throw new AppError('Please provide both email and password', 400);
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Please provide a valid email address', 400);
        }

        // Add initial delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 100));

        // Check if user exists with password
        const user = await User.findOne({ email }).select('+password');
        
        // Use constant-time comparison for password
        const isPasswordCorrect = user ? await user.correctPassword(password, user.password) : false;

        // Check if account exists (after password check to prevent timing attacks)
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw new AppError(`Account is temporarily locked. Please try again in ${remainingTime} minutes.`, 423);
        }

        // Handle failed login attempt
        if (!isPasswordCorrect) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            
            if (user.loginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes lock
                await user.save({ validateBeforeSave: false });
                throw new AppError('Account temporarily locked. Please try again in 5 minutes.', 423);
            }
            
            await user.save({ validateBeforeSave: false });
            throw new AppError(`Invalid credentials. ${5 - user.loginAttempts} attempts remaining.`, 401);
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0 || user.lockUntil) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save({ validateBeforeSave: false });
        }

        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

// Logout user
router.post('/logout', (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        signed: true
    });
    res.status(200).json({ status: 'success' });
});

// Refresh token
router.post('/refresh-token', async (req, res, next) => {
    try {
        const user = await verifyAndGetUser(req);
        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

// Get current user
router.get('/me', async (req, res, next) => {
    try {
        const user = await verifyAndGetUser(req);
        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (error) {
        next(error);
    }
});

// Update password
router.patch('/update-password', async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await verifyAndGetUser(req, true); // true to include password field

        // Check current password
        if (!(await user.correctPassword(currentPassword, user.password))) {
            throw new AppError('Current password is incorrect', 401);
        }

        // Update password
        user.password = newPassword;
        await user.save();

        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;

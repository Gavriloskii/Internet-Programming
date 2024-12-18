 const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authLimiter } = require('../middleware/security');
const { AppError } = require('../middleware/errorHandler');

// Import User model (to be created)
const User = require('../models/User');

// Helper function to create and send token
const createSendToken = (user, statusCode, res) => {
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from output
    user.password = undefined;

    // Set secure cookie
    res.cookie('jwt', token, {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
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

    // Create token and send response with cookie
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

        // Set cookie options
        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        };

    // Send cookie
    res.cookie('jwt', token, cookieOptions);

    // Send response
    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                personalityType: user.personalityType,
                travelPreferences: user.travelPreferences
            }
        }
    });
    } catch (error) {
        next(error);
    }
});

// Login user
router.post('/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if email and password exist
        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        // Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.correctPassword(password, user.password))) {
            throw new AppError('Incorrect email or password', 401);
        }

        // Create token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Set cookie options
        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        };

        // Send cookie
        res.cookie('jwt', token, cookieOptions);

        // Remove password from output
        user.password = undefined;

        // Send response
        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    personalityType: user.personalityType,
                    travelPreferences: user.travelPreferences
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Logout user
router.post('/logout', (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
});

// Refresh token
router.post('/refresh-token', async (req, res, next) => {
    try {
        const { jwt: token } = req.cookies;

        if (!token) {
            throw new AppError('No token provided', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AppError('User no longer exists', 401);
        }

        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

// Get current user
router.get('/me', async (req, res, next) => {
    try {
        const { jwt: token } = req.cookies;

        if (!token) {
            throw new AppError('Not logged in', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

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
        const { jwt: token } = req.cookies;

        if (!token) {
            throw new AppError('Not logged in', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user
        const user = await User.findById(decoded.id).select('+password');
        if (!user) {
            throw new AppError('User not found', 404);
        }

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

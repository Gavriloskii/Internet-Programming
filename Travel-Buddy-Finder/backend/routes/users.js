const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const uploadWithLogging = require('../middleware/uploadMiddleware');
const { request } = require('express');

// File upload endpoint with logging
router.post('/upload-profile-picture', protect, uploadWithLogging('profilePicture'), async (req, res) => {
    try {
        console.log('File upload request received');
        
        if (!req.file) {
            console.log('No file received');
            return res.status(400).json({
                status: 'error',
                message: 'Please upload a file'
            });
        }

        // Log successful file upload
        console.log('File upload details:', {
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Update user profile with new picture path
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilePicture: `/uploads/${req.file.filename}` },
            { new: true }
        ).select('-password');

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser,
                file: {
                    filename: req.file.filename,
                    path: req.file.path
                }
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Update user profile
router.put('/profile', protect, uploadWithLogging('profilePicture'), async (req, res) => {
    try {
        const allowedFields = ['name', 'profilePicture', 'personalityType', 'travelPreferences', 'languages', 'location', 'bio', 'interests'];
        const updateData = {};
        
        // Handle file upload if present
        if (req.file) {
            updateData.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
            console.log('Updated profile picture path:', updateData.profilePicture);
        }

        // Process other fields
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                try {
                    // Try to parse JSON strings
                    updateData[key] = typeof req.body[key] === 'string' && 
                        (key === 'travelPreferences' || key === 'location' || key === 'languages' || key === 'interests') ? 
                        JSON.parse(req.body[key]) : req.body[key];
                } catch (e) {
                    updateData[key] = req.body[key];
                }
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;

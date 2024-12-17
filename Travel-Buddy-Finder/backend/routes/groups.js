const express = require('express');
const router = express.Router();
const { protect, restrictTo, canInteract } = require('../middleware/auth');
const { createValidation } = require('../middleware/validation');
const Group = require('../models/Group');
const { AppError } = require('../middleware/errorHandler');

// Validation schemas
const createGroupSchema = {
    name: {
        required: true,
        minLength: 3,
        maxLength: 50
    },
    description: {
        maxLength: 200
    },
    type: {
        required: true,
        enum: ['travel', 'chat', 'event']
    },
    'travelDetails.destination': {
        required: true,
        minLength: 2,
        maxLength: 100
    },
    'travelDetails.startDate': {
        required: true,
        custom: (value) => {
            if (new Date(value) < new Date()) {
                return 'Start date must be in the future';
            }
            return null;
        }
    },
    'travelDetails.endDate': {
        required: true,
        custom: (value, body) => {
            if (new Date(value) < new Date(body.travelDetails.startDate)) {
                return 'End date must be after start date';
            }
            return null;
        }
    }
};

// Create new group
router.post('/',
    protect,
    createValidation(createGroupSchema),
    async (req, res, next) => {
        try {
            const group = await Group.create({
                ...req.body,
                creator: req.user._id,
                members: [{
                    user: req.user._id,
                    role: 'admin',
                    status: 'active'
                }]
            });

            res.status(201).json({
                status: 'success',
                data: {
                    group
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get all groups (with filters)
router.get('/', protect, async (req, res, next) => {
    try {
        const {
            type,
            destination,
            startDate,
            budget,
            query,
            page = 1,
            limit = 10
        } = req.query;

        const filters = {};
        if (type) filters.type = type;
        if (destination) filters['travelDetails.destination'] = { $regex: destination, $options: 'i' };
        if (startDate) filters['travelDetails.startDate'] = { $gte: new Date(startDate) };
        if (budget) filters['travelDetails.budget'] = budget;

        const groups = await Group.find(filters)
            .populate('creator', 'name profilePicture')
            .populate('members.user', 'name profilePicture')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort('-lastActivity');

        const total = await Group.countDocuments(filters);

        res.status(200).json({
            status: 'success',
            results: groups.length,
            data: {
                groups,
                pagination: {
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get single group
router.get('/:id', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('creator', 'name profilePicture')
            .populate('members.user', 'name profilePicture')
            .populate('pendingRequests.user', 'name profilePicture');

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        res.status(200).json({
            status: 'success',
            data: {
                group
            }
        });
    } catch (error) {
        next(error);
    }
});

// Update group
router.patch('/:id', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isAdmin(req.user._id)) {
            throw new AppError('Only admins can update group details', 403);
        }

        // Prevent updating certain fields
        delete req.body.creator;
        delete req.body.members;
        delete req.body.pendingRequests;

        const updatedGroup = await Group.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate('members.user', 'name profilePicture');

        res.status(200).json({
            status: 'success',
            data: {
                group: updatedGroup
            }
        });
    } catch (error) {
        next(error);
    }
});

// Join group request
router.post('/:id/join', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (group.isMember(req.user._id)) {
            throw new AppError('You are already a member of this group', 400);
        }

        if (group.settings.joinRequiresApproval) {
            // Add to pending requests
            group.pendingRequests.push({
                user: req.user._id,
                status: 'pending'
            });
            await group.save();

            res.status(200).json({
                status: 'success',
                message: 'Join request sent successfully'
            });
        } else {
            // Direct join
            await group.addMember(req.user._id);
            
            res.status(200).json({
                status: 'success',
                message: 'Joined group successfully'
            });
        }
    } catch (error) {
        next(error);
    }
});

// Handle join request
router.patch('/:id/requests/:userId', protect, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            throw new AppError('Invalid status', 400);
        }

        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isAdmin(req.user._id)) {
            throw new AppError('Only admins can handle join requests', 403);
        }

        const request = group.pendingRequests.find(
            req => req.user.toString() === req.params.userId && req.status === 'pending'
        );

        if (!request) {
            throw new AppError('Join request not found', 404);
        }

        if (status === 'approved') {
            await group.addMember(req.params.userId);
        }

        request.status = status;
        await group.save();

        res.status(200).json({
            status: 'success',
            message: `Join request ${status}`
        });
    } catch (error) {
        next(error);
    }
});

// Leave group
router.delete('/:id/leave', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isMember(req.user._id)) {
            throw new AppError('You are not a member of this group', 400);
        }

        if (group.creator.toString() === req.user._id.toString()) {
            throw new AppError('Group creator cannot leave. Transfer ownership first.', 400);
        }

        await group.removeMember(req.user._id);

        res.status(200).json({
            status: 'success',
            message: 'Left group successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Update member role
router.patch('/:id/members/:userId/role', protect, async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['admin', 'moderator', 'member'].includes(role)) {
            throw new AppError('Invalid role', 400);
        }

        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (!group.isAdmin(req.user._id)) {
            throw new AppError('Only admins can update member roles', 403);
        }

        await group.updateMemberRole(req.params.userId, role);

        res.status(200).json({
            status: 'success',
            message: 'Member role updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Delete group
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (group.creator.toString() !== req.user._id.toString()) {
            throw new AppError('Only group creator can delete the group', 403);
        }

        await Group.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { createValidation } = require('../middleware/validation');
const TravelJournal = require('../models/TravelJournal');
const { AppError } = require('../middleware/errorHandler');

// Validation schemas
const journalSchema = {
    title: {
        required: true,
        minLength: 3,
        maxLength: 100
    },
    content: {
        required: true,
        minLength: 10,
        maxLength: 5000
    },
    'location.name': {
        required: true,
        minLength: 2,
        maxLength: 100
    },
    'dates.start': {
        required: true,
        custom: (value) => {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return 'Invalid start date format';
            }
            return null;
        }
    },
    'dates.end': {
        required: true,
        custom: (value, body) => {
            const endDate = new Date(value);
            const startDate = new Date(body.dates.start);
            if (isNaN(endDate.getTime())) {
                return 'Invalid end date format';
            }
            if (endDate < startDate) {
                return 'End date must be after start date';
            }
            return null;
        }
    }
};

// Create journal
router.post('/',
    protect,
    createValidation(journalSchema),
    async (req, res, next) => {
        try {
            const journal = await TravelJournal.create({
                ...req.body,
                user: req.user._id
            });

            res.status(201).json({
                status: 'success',
                data: {
                    journal
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get all journals (with filters)
router.get('/', async (req, res, next) => {
    try {
        const {
            user,
            category,
            location,
            startDate,
            endDate,
            privacy,
            status,
            page = 1,
            limit = 10
        } = req.query;

        const filters = {};
        if (user) filters.user = user;
        if (category) filters.category = category;
        if (location) filters['location.name'] = { $regex: location, $options: 'i' };
        if (startDate) filters['dates.start'] = { $gte: new Date(startDate) };
        if (endDate) filters['dates.end'] = { $lte: new Date(endDate) };
        if (privacy) filters.privacy = privacy;
        if (status) filters.status = status;

        const journals = await TravelJournal.find(filters)
            .populate('user', 'name profilePicture')
            .populate('companions', 'name profilePicture')
            .populate('group', 'name')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort('-createdAt');

        const total = await TravelJournal.countDocuments(filters);

        res.status(200).json({
            status: 'success',
            results: journals.length,
            data: {
                journals,
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

// Get user feed
router.get('/feed', protect, async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const journals = await TravelJournal.getUserFeed(req.user._id, page, limit);

        res.status(200).json({
            status: 'success',
            data: {
                journals
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get single journal
router.get('/:id', async (req, res, next) => {
    try {
        const journal = await TravelJournal.findById(req.params.id)
            .populate('user', 'name profilePicture')
            .populate('companions', 'name profilePicture')
            .populate('group', 'name')
            .populate('comments.user', 'name profilePicture')
            .populate('likes', 'name profilePicture');

        if (!journal) {
            throw new AppError('Journal not found', 404);
        }

        // Check if user can view the journal
        if (req.user && !journal.canView(req.user)) {
            throw new AppError('You do not have permission to view this journal', 403);
        }

        res.status(200).json({
            status: 'success',
            data: {
                journal
            }
        });
    } catch (error) {
        next(error);
    }
});

// Update journal
router.patch('/:id', protect, async (req, res, next) => {
    try {
        const journal = await TravelJournal.findById(req.params.id);
        
        if (!journal) {
            throw new AppError('Journal not found', 404);
        }

        if (!journal.isOwner(req.user._id)) {
            throw new AppError('You can only edit your own journals', 403);
        }

        // Prevent updating certain fields
        delete req.body.user;
        delete req.body.likes;
        delete req.body.comments;

        const updatedJournal = await TravelJournal.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate('user', 'name profilePicture');

        res.status(200).json({
            status: 'success',
            data: {
                journal: updatedJournal
            }
        });
    } catch (error) {
        next(error);
    }
});

// Delete journal
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const journal = await TravelJournal.findById(req.params.id);
        
        if (!journal) {
            throw new AppError('Journal not found', 404);
        }

        if (!journal.isOwner(req.user._id)) {
            throw new AppError('You can only delete your own journals', 403);
        }

        await TravelJournal.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
});

// Like/Unlike journal
router.post('/:id/like', protect, async (req, res, next) => {
    try {
        const journal = await TravelJournal.findById(req.params.id);
        
        if (!journal) {
            throw new AppError('Journal not found', 404);
        }

        await journal.toggleLike(req.user._id);

        res.status(200).json({
            status: 'success',
            message: 'Journal like status updated'
        });
    } catch (error) {
        next(error);
    }
});

// Add comment
router.post('/:id/comments', protect, async (req, res, next) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            throw new AppError('Comment content is required', 400);
        }

        const journal = await TravelJournal.findById(req.params.id);
        
        if (!journal) {
            throw new AppError('Journal not found', 404);
        }

        await journal.addComment(req.user._id, content);

        res.status(201).json({
            status: 'success',
            message: 'Comment added successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

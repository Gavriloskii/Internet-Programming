const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Store analytics events
router.post('/events', protect, async (req, res) => {
    try {
        const { eventName, data, timestamp, sessionId } = req.body;
        
        // Add user context to the event
        const event = {
            userId: req.user._id,
            eventName,
            data,
            timestamp,
            sessionId,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        };

        // Log event (in production this would go to a proper analytics service)
        if (process.env.NODE_ENV === 'production') {
            // Example: Send to analytics service
            // await analyticsService.trackEvent(event);
            console.log('Analytics Event:', event);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to process analytics event'
        });
    }
});

// Get analytics data (admin only)
router.get('/events', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }

        // In production, fetch from analytics service
        // const events = await analyticsService.getEvents(req.query);

        // For development, return mock data
        const events = {
            matchQuality: {
                averageScore: 75.5,
                totalMatches: 1250,
                successfulMatches: 850
            },
            userEngagement: {
                dailyActiveUsers: 450,
                averageSwipesPerUser: 25,
                averageMatchesPerUser: 3
            },
            systemHealth: {
                averageResponseTime: 120,
                errorRate: 0.02,
                uptime: 99.95
            }
        };

        res.status(200).json({
            status: 'success',
            data: events
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics data'
        });
    }
});

module.exports = router;

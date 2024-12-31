const express = require('express');
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
    res.status(200).json({ message: 'API is working' });
});

// Message endpoint
router.get('/message', (req, res) => {
    res.status(200).json({ message: 'Hello from the backend' });
});

module.exports = router;

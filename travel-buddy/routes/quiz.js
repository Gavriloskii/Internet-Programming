const express = require('express');
const jwt = require('jsonwebtoken');
const Quiz = require('../models/Quiz');
const router = express.Router();

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// POST route to save quiz results
router.post('/', authenticateJWT, async (req, res) => {
    const { results } = req.body;
    const userId = req.user.id; // Assuming user ID is stored in the token

    try {
        const quizResult = new Quiz({ userId, results });
        await quizResult.save();
        res.status(201).json({ message: 'Quiz results saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save quiz results' });
    }
});

// GET route to fetch quiz results
router.get('/', authenticateJWT, async (req, res) => {
    const userId = req.user.id;

    try {
        const quizResults = await Quiz.find({ userId });
        res.status(200).json(quizResults);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz results' });
    }
});

module.exports = router;

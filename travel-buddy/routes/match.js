const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const authMiddleware = require('./auth').authMiddleware; // Import the auth middleware

// Match endpoint
router.get('/match', authMiddleware, async (req, res) => {
    try {
        // Fetch the logged-in user's quiz results
        const userId = req.user.id; // Assuming the user ID is stored in the token
        const userResults = await Quiz.findOne({ userId });

        if (!userResults) {
            return res.status(404).json({ message: 'User quiz results not found' });
        }

        // Fetch all other users' quiz results
        const allUsersResults = await Quiz.find({ userId: { $ne: userId } });

        // Calculate compatibility scores
        const matches = allUsersResults.map(otherUser => {
            const score = calculateCompatibility(userResults, otherUser);
            return {
                userId: otherUser.userId,
                score,
                // Add other user information as needed
            };
        });

        // Sort matches by score in descending order
        matches.sort((a, b) => b.score - a.score);

        // Return top matches
        const topMatches = matches.slice(0, 5); // Get top 5 matches
        res.status(200).json(topMatches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Simple compatibility algorithm
const calculateCompatibility = (userResults, otherUserResults) => {
    // Implement a simple algorithm to calculate compatibility score
    // For example, you could compare answers and return a score based on matches
    let score = 0;
    // Example logic (this should be replaced with actual comparison logic)
    if (JSON.stringify(userResults.answers) === JSON.stringify(otherUserResults.answers)) {
        score += 100; // Full match
    }
    return score;
};

module.exports = router;

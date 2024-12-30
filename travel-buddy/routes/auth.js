const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Mock database
let users = [];

// Register route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in mock database
    users.push({ name, email, password: hashedPassword });

    // Respond with success message
    res.status(201).json({ message: 'User registered successfully!' });
});

module.exports = router;

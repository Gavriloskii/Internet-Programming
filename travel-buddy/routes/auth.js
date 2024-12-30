const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');  

// Middleware for JWT verification
const authMiddleware = (req, res, next) => {  
    const token = req.headers['authorization']?.split(' ')[1];  
    if (!token) {  
        return res.status(401).json({ message: 'Token is missing or invalid' });  
    }  
    jwt.verify(token, 'your_jwt_secret', (err, decoded) => {  
        if (err) {  
            return res.status(401).json({ message: 'Token is invalid' });  
        }  
        req.user = decoded;  
        next();  
    });  
};  

// Apply middleware to protected routes
// Example: router.get('/protected-route', authMiddleware, (req, res) => { ... });

// Register route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in MongoDB
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    // Respond with success message
    res.status(201).json({ message: 'User registered successfully!' });
});

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Find user in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ email: user.email }, 'your_jwt_secret', { expiresIn: '1h' });

    // Respond with token
    res.status(200).json({ token });
});

module.exports = router;

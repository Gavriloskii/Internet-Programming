require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Route for /api/test
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// Sample route to return .env values
app.get('/env', (req, res) => {
    res.json({
        mongodbUri: process.env.MONGODB_URI,
        backendPort: process.env.BACKEND_PORT,
        frontendPort: process.env.FRONTEND_PORT,
        jwtSecret: process.env.JWT_SECRET
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
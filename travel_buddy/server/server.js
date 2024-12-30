require('dotenv').config(); // Load environment variables
console.log('Environment Variables:', process.env); // Log all environment variables
const express = require('express');
const app = express();
const PORT = process.env.BACKEND_PORT || 5000; 
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the .env file');
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

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

app.get('/api/message', (req, res) => {
    res.json({ message: 'Hello from the backend' });
});

const User = require('./models/model');

// Insert a sample user document
const insertSampleUser = async () => {
    const sampleUser = new User({
        name: 'John Doe',
        email: 'john.doe@example.com'
    });

    try {
        await sampleUser.save();
        console.log('Sample user inserted');
    } catch (error) {
        console.error('Error inserting sample user:', error);
    }
};

// Call the function to insert the sample user
insertSampleUser();

// Test endpoint to retrieve the user
app.get('/api/user', async (req, res) => {
    try {
        const user = await User.findOne({ email: 'john.doe@example.com' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving user' });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose'); // Import Mongoose
const { router: authRoutes } = require('./routes/auth'); // Import the auth routes
const quizRoutes = require('./routes/quiz'); // Import the quiz routes
const cors = require('cors');  
const matchRoutes = require('./routes/match'); // Import the match routes
const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

app.use('/api', authRoutes); // Use the auth routes under the /api path

const PORT = process.env.PORT || 5000; // Use PORT from .env or default to 5000

console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.DATABASE_URL)
    .then(() => {
        console.log('Connected to MongoDB successfully.');
        // Start the server only after successful connection
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', matchRoutes); // Use the match routes under the /api path
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Function to close the MongoDB connection
const closeMongoConnection = () => {
    return mongoose.connection.close();
};

// Export the app, start function, and close function for testing
module.exports = { app, closeMongoConnection };

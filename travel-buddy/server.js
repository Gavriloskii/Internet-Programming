require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const authRoutes = require('./routes/auth'); // Import the auth routes
const cors = require('cors');
const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

app.use('/api', authRoutes); // Use the auth routes under the /api path

const PORT = process.env.PORT || 5000; // Use PORT from .env or default to 5000

// Test route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

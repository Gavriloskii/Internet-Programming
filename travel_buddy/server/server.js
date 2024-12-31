require('dotenv').config(); // Load environment variables
console.log('Environment Variables:', process.env); // Log all environment variables
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const generalRoutes = require('./routes/generalRoutes'); // Import general routes
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Use authentication routes
app.use('/api', authRoutes);
app.use('/api', generalRoutes); // Use general routes

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app instance for testing
module.exports = app;

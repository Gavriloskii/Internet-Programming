const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Delete existing test user if exists
        await User.deleteOne({ email: 'test.user@example.com' });

        // Create new test user with a password that meets all requirements:
        // - At least 8 characters
        // - Contains numbers
        // - Contains uppercase and lowercase letters
        // - Contains special characters
        const testUser = await User.create({
            name: 'Test User',
            email: 'test.user@example.com',
            password: 'Test@User123',  // Updated to meet all requirements
            passwordConfirm: 'Test@User123', // Added password confirmation
            verified: true,
            travelPreferences: {
                budget: 'moderate',
                pace: 'moderate',
                accommodationPreference: 'flexible'
            }
        });

        console.log('Test user created successfully:', {
            id: testUser._id,
            email: testUser.email,
            name: testUser.name
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error creating test user:', error);
        process.exit(1);
    }
};

createTestUser();

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
        await User.deleteOne({ email: 'test@example.com' });

        // Create new test user
        const testUser = await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'Test123!@#',
            personalityType: 'adventurer',
            travelPreferences: {
                budget: 'moderate',
                pace: 'moderate',
                interests: ['nature', 'culture', 'food'],
                accommodationPreference: 'flexible'
            },
            languages: [{
                language: 'English',
                proficiency: 'native'
            }],
            location: {
                coordinates: [0, 0],
                country: 'United States',
                city: 'New York'
            },
            verified: true,
            active: true
        });

        console.log('Test user created:', testUser);
        process.exit(0);
    } catch (error) {
        console.error('Error creating test user:', error);
        process.exit(1);
    }
};

createTestUser();

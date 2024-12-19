const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-buddy-finder');
        
        // Check if test user exists
        const testUser = await User.findOne({ email: 'test.user@example.com' });
        
        if (!testUser) {
            // Create test user
            const hashedPassword = await bcrypt.hash('Test@User123', 12);
            await User.create({
                email: 'test.user@example.com',
                password: hashedPassword,
                name: 'Test User',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'moderate',
                    accommodationPreference: 'flexible'
                }
            });
            console.log('Test user created successfully');
        } else {
            console.log('Test user already exists');
        }
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createTestUser();

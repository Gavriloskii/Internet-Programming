const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const testMatches = [
    {
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Test123!@#',
        profilePicture: 'https://randomuser.me/api/portraits/women/1.jpg',
        personalityType: 'adventurer',
        travelPreferences: {
            budget: 'moderate',
            pace: 'moderate',
            interests: ['nature', 'culture', 'photography'],
            accommodationPreference: 'flexible',
            dateRange: [{ start: new Date(), end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }]
        },
        languages: [{ language: 'English', proficiency: 'native' }],
        location: {
            coordinates: [0, 0],
            country: 'United States',
            city: 'Los Angeles',
            type: 'Point'
        },
        bio: 'Adventure seeker looking for travel companions!'
    },
    {
        name: 'Bob',
        email: 'bob@example.com',
        password: 'Test123!@#',
        profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
        personalityType: 'planner',
        travelPreferences: {
            budget: 'luxury',
            pace: 'slow',
            interests: ['food', 'culture', 'history'],
            accommodationPreference: 'hotel',
            dateRange: [{ start: new Date(), end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }]
        },
        languages: [{ language: 'English', proficiency: 'native' }],
        location: {
            coordinates: [0, 0],
            country: 'United States',
            city: 'San Francisco',
            type: 'Point'
        },
        bio: 'Food lover and history buff seeking travel partners!'
    },
    {
        name: 'Carol',
        email: 'carol@example.com',
        password: 'Test123!@#',
        profilePicture: 'https://randomuser.me/api/portraits/women/2.jpg',
        personalityType: 'flexible',
        travelPreferences: {
            budget: 'budget',
            pace: 'fast',
            interests: ['adventure', 'sports', 'nature'],
            accommodationPreference: 'hostel',
            dateRange: [{ start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }]
        },
        languages: [{ language: 'English', proficiency: 'native' }],
        location: {
            coordinates: [0, 0],
            country: 'United States',
            city: 'Denver',
            type: 'Point'
        },
        bio: 'Adrenaline junkie looking for adventure buddies!'
    }
];

async function createTestMatches() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create test matches
        for (const matchData of testMatches) {
            const existingUser = await User.findOne({ email: matchData.email });
            if (!existingUser) {
                const user = new User({
                    ...matchData,
                    active: true,
                    verified: true,
                    matches: [],
                    conversations: [],
                    blockedUsers: [],
                    lastActive: new Date()
                });
                await user.save();
                console.log(`Created test match: ${matchData.name}`);
            } else {
                console.log(`User ${matchData.email} already exists`);
            }
        }

        console.log('Test matches created successfully');
    } catch (error) {
        console.error('Error creating test matches:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createTestMatches();

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const personalityTypes = ['adventurer', 'planner', 'flexible', 'relaxed', 'cultural'];
const budgetRanges = ['budget', 'moderate', 'luxury'];
const pacePreferences = ['slow', 'moderate', 'fast'];
const activityLevels = ['low', 'moderate', 'high'];
const languages = ['english', 'spanish', 'french', 'german', 'mandarin', 'japanese'];
const interests = [
    'nature', 'adventure', 'photography', 'culture', 'food', 
    'history', 'art', 'nightlife', 'shopping', 'sports'
];

const destinations = [
    'Paris, France', 'Tokyo, Japan', 'New York, USA', 'Barcelona, Spain',
    'Bangkok, Thailand', 'London, UK', 'Rome, Italy', 'Sydney, Australia',
    'Dubai, UAE', 'Vancouver, Canada'
];

function generateRandomProfile(index) {
    const numInterests = Math.floor(Math.random() * 5) + 2; // 2-6 interests
    const numLanguages = Math.floor(Math.random() * 3) + 1; // 1-3 languages
    const numDestinations = Math.floor(Math.random() * 4) + 1; // 1-4 destinations

    // Generate travel dates within next 6 months
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 180));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 5);

    return {
        name: `Test User ${index}`,
        email: `testuser${index}@example.com`,
        password: 'password123',
        personalityType: personalityTypes[Math.floor(Math.random() * personalityTypes.length)],
        travelPreferences: {
            budget: budgetRanges[Math.floor(Math.random() * budgetRanges.length)],
            pace: pacePreferences[Math.floor(Math.random() * pacePreferences.length)],
            interests: shuffle(interests).slice(0, numInterests),
            activityLevel: activityLevels[Math.floor(Math.random() * activityLevels.length)],
            destinations: shuffle(destinations).slice(0, numDestinations),
            travelDates: {
                start: startDate,
                end: endDate
            },
            dateFlexibility: Math.random() > 0.5
        },
        languages: shuffle(languages).slice(0, numLanguages),
        bio: generateBio(),
        profilePicture: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${index % 100}.jpg`,
        metadata: {
            lastActive: new Date(),
            swipeHistory: [],
            matchRate: Math.random(),
            responseRate: 0.7 + (Math.random() * 0.3), // 70-100% response rate
            averageResponseTime: Math.floor(Math.random() * 120) + 10 // 10-130 minutes
        }
    };
}

function generateBio() {
    const bios = [
        "Passionate traveler seeking adventure companions",
        "Love exploring new cultures and meeting people",
        "Looking for fellow wanderers to share experiences",
        "Adventure seeker with a camera always ready",
        "Cultural explorer interested in local experiences",
        "Foodie traveler hunting for authentic cuisines",
        "Digital nomad looking for travel buddies",
        "History buff seeking heritage exploration partners",
        "Nature lover searching for outdoor adventures",
        "Photography enthusiast capturing world moments"
    ];
    
    return bios[Math.floor(Math.random() * bios.length)];
}

function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function generateProfiles(count = 1000) {
    try {
        console.log(`Generating ${count} test profiles...`);
        
        // Generate profiles with diverse characteristics
        const profiles = Array(count).fill().map((_, i) => generateRandomProfile(i));
        
        // Create users in batches to avoid overwhelming the database
        const BATCH_SIZE = 50;
        for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
            const batch = profiles.slice(i, i + BATCH_SIZE);
            await User.insertMany(batch);
            console.log(`Created profiles ${i + 1} to ${Math.min(i + BATCH_SIZE, profiles.length)}`);
        }

        // Generate some special test cases
        await generateSpecialTestCases();

        console.log('Successfully generated all test profiles!');
        
    } catch (error) {
        console.error('Error generating profiles:', error);
        process.exit(1);
    }
}

async function generateSpecialTestCases() {
    // Create edge cases for testing
    const specialCases = [
        {
            // Perfect match case
            name: 'Perfect Match A',
            email: 'perfecta@test.com',
            personalityType: 'adventurer',
            travelPreferences: {
                budget: 'moderate',
                pace: 'fast',
                interests: ['adventure', 'photography', 'nature'],
                activityLevel: 'high'
            }
        },
        {
            // Perfect match counterpart
            name: 'Perfect Match B',
            email: 'perfectb@test.com',
            personalityType: 'adventurer',
            travelPreferences: {
                budget: 'moderate',
                pace: 'fast',
                interests: ['adventure', 'photography', 'nature'],
                activityLevel: 'high'
            }
        },
        {
            // Complete mismatch case
            name: 'Mismatch Test',
            email: 'mismatch@test.com',
            personalityType: 'relaxed',
            travelPreferences: {
                budget: 'budget',
                pace: 'slow',
                interests: ['art', 'culture'],
                activityLevel: 'low'
            }
        },
        {
            // Edge case: No preferences
            name: 'No Preferences',
            email: 'noprefs@test.com',
            personalityType: 'flexible',
            travelPreferences: {}
        }
    ];

    await User.insertMany(specialCases);
    console.log('Generated special test cases');
}

// Connect to database and generate profiles
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        const count = process.argv.includes('--count') 
            ? parseInt(process.argv[process.argv.indexOf('--count') + 1]) 
            : 1000;
        
        return generateProfiles(count);
    })
    .then(() => {
        console.log('Profile generation complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Database connection error:', error);
        process.exit(1);
    });

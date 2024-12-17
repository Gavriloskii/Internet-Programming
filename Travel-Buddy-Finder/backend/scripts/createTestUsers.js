const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const travelStyles = ['luxury', 'comfort', 'backpacker', 'budget'];
const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Mandarin', 'Japanese'];
const destinations = [
    'Paris, France',
    'Tokyo, Japan',
    'New York, USA',
    'Barcelona, Spain',
    'Bangkok, Thailand',
    'London, UK',
    'Rome, Italy',
    'Sydney, Australia',
    'Dubai, UAE',
    'Singapore'
];

const interests = [
    'nature',
    'culture',
    'food',
    'adventure',
    'history',
    'photography',
    'nightlife',
    'shopping',
    'art',
    'sports'
];

const generateUser = (index) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);

    return {
        email: `testuser${index}@example.com`,
        password: 'Test123!@#',
        name: `Test User ${index}`,
        age: 20 + Math.floor(Math.random() * 40),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        location: (() => {
            const destination = destinations[Math.floor(Math.random() * destinations.length)];
            const [city, country] = destination.split(',').map(s => s.trim());
            return {
                city,
                country: country || 'Unknown'
            };
        })(),
        bio: `Passionate traveler looking for adventure! Love exploring new places and meeting new people.`,
        profilePicture: `https://picsum.photos/400/400?random=${index}`,
        travelPreferences: {
            budget: ['budget', 'moderate', 'luxury'][Math.floor(Math.random() * 3)],
            travelStyle: travelStyles[Math.floor(Math.random() * travelStyles.length)],
            destinations: Array.from(
                { length: 2 + Math.floor(Math.random() * 4) },
                () => destinations[Math.floor(Math.random() * destinations.length)]
            ),
            travelDates: {
                start: now,
                end: futureDate
            },
            interests: Array.from(
                { length: 3 + Math.floor(Math.random() * 4) },
                () => interests[Math.floor(Math.random() * interests.length)]
            ),
            languages: Array.from(
                { length: 1 + Math.floor(Math.random() * 3) },
                () => languages[Math.floor(Math.random() * languages.length)]
            )
        },
        personalityTraits: {
            adventurous: Math.random() * 100,
            organized: Math.random() * 100,
            social: Math.random() * 100,
            flexible: Math.random() * 100
        },
        verified: true,
        active: true
    };
};

const createTestUsers = async (count = 20) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing test users
        await User.deleteMany({ email: /testuser.*@example\.com/ });
        console.log('Cleared existing test users');

        const users = [];
        for (let i = 1; i <= count; i++) {
            const userData = generateUser(i);
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            users.push({
                ...userData,
                password: hashedPassword
            });
        }

        const createdUsers = await User.create(users);
        console.log(`Created ${createdUsers.length} test users`);

        // Create some initial likes to test matching
        for (let i = 0; i < createdUsers.length; i++) {
            const user = createdUsers[i];
            const potentialMatches = createdUsers
                .filter(u => u._id.toString() !== user._id.toString())
                .slice(0, 3);

            await User.findByIdAndUpdate(user._id, {
                $addToSet: { likes: { $each: potentialMatches.map(m => m._id) } }
            });
        }

        console.log('Added initial likes for testing matches');
        console.log('\nTest User Credentials:');
        console.log('Email: testuser1@example.com');
        console.log('Password: Test123!@#');

        mongoose.connection.close();
    } catch (error) {
        console.error('Error creating test users:', error);
        process.exit(1);
    }
};

createTestUsers();

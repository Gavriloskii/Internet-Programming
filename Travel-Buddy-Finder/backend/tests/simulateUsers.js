const axios = require('axios');
const io = require('socket.io-client');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-buddy-finder';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
    runSimulation().catch(console.error);
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

const testUsers = [
    {
        name: 'Adventure Seeker',
        email: 'adventure@test.com',
        password: 'Adventure123!@#',
        personalityType: 'adventurer',
        travelPreferences: {
            budget: 'moderate',
            pace: 'fast',
            interests: ['adventure', 'nature', 'photography'],
            accommodationPreference: 'flexible'
        },
        languages: [
            { language: 'English', proficiency: 'native' },
            { language: 'Spanish', proficiency: 'intermediate' }
        ],
        location: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
            country: 'USA',
            city: 'San Francisco'
        }
    },
    {
        name: 'Cultural Explorer',
        email: 'culture@test.com',
        password: 'Culture123!@#',
        personalityType: 'cultural',
        travelPreferences: {
            budget: 'luxury',
            pace: 'moderate',
            interests: ['culture', 'history', 'art'],
            accommodationPreference: 'hotel'
        },
        languages: [
            { language: 'English', proficiency: 'native' },
            { language: 'French', proficiency: 'fluent' }
        ],
        location: {
            type: 'Point',
            coordinates: [2.3522, 48.8566],
            country: 'France',
            city: 'Paris'
        }
    },
    {
        name: 'Beach Lover',
        email: 'beach@test.com',
        password: 'Beach123!@#',
        personalityType: 'relaxed',
        travelPreferences: {
            budget: 'budget',
            pace: 'slow',
            interests: ['nature', 'food', 'photography'],
            accommodationPreference: 'hostel'
        },
        languages: [
            { language: 'English', proficiency: 'native' },
            { language: 'Portuguese', proficiency: 'basic' }
        ],
        location: {
            type: 'Point',
            coordinates: [-43.1729, -22.9068],
            country: 'Brazil',
            city: 'Rio de Janeiro'
        }
    }
];

const activeSessions = new Map();

async function createUser(userData) {
    try {
        const response = await axios.post(`${API_URL}/auth/signup`, userData);
        console.log(`Created user: ${userData.name}`);
        return {
            token: response.data.token,
            userId: response.data.data.user.id
        };
    } catch (error) {
        if (error.response?.data?.message === 'Email already registered') {
            try {
                const loginResponse = await axios.post(`${API_URL}/auth/login`, {
                    email: userData.email,
                    password: userData.password
                });
                console.log(`Logged in existing user: ${userData.name}`);
                return {
                    token: loginResponse.data.token,
                    userId: loginResponse.data.data.user.id
                };
            } catch (loginError) {
                console.error(`Failed to login existing user ${userData.name}:`, loginError.response?.data || loginError.message);
            }
        } else {
            console.error(`Failed to create user ${userData.name}:`, error.response?.data || error.message);
        }
        return null;
    }
}

function connectSocket(token, userId) {
    const socket = io(SOCKET_URL, {
        auth: { token },
        query: { userId }
    });

    socket.on('connect', () => {
        console.log(`Socket connected for user: ${userId}`);
    });

    socket.on('match', (data) => {
        console.log(`Match found for user ${userId}:`, data);
    });

    socket.on('message', (data) => {
        console.log(`Message received for user ${userId}:`, data);
    });

    return socket;
}

async function simulateUserActivity(user, token, userId) {
    try {
        // Create travel journal entry
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const journalResponse = await axios.post(`${API_URL}/journals`, {
            title: `${user.name}'s Travel Adventure`,
            content: `Excited to explore ${user.location.city}! Looking forward to experiencing the local culture, meeting fellow travelers, and creating unforgettable memories.`,
            location: {
                name: user.location.city
            },
            dates: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Created journal for user ${user.name}`);

        // Create a group
        const groupResponse = await axios.post(`${API_URL}/groups`, {
            name: `${user.name}'s Travel Group`,
            description: 'A group for fellow adventurers',
            type: 'public',
            interests: user.travelPreferences.interests,
            location: user.location.city
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Created group for user ${user.name}`);

        console.log(`Simulated activities for user: ${user.name}`);
    } catch (error) {
        console.error(`Failed to simulate activities for ${user.name}:`, error.response?.data || error.message);
    }
}

async function cleanupExistingUsers() {
    for (const user of testUsers) {
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: user.email,
                password: user.password
            });
            console.log(`Using existing user: ${user.name}`);
            return true;
        } catch (error) {
            console.log(`User ${user.name} doesn't exist yet`);
        }
    }
    return false;
}

async function runSimulation() {
    await cleanupExistingUsers();

    for (const user of testUsers) {
        const userData = await createUser(user);
        if (!userData) continue;

        const socket = connectSocket(userData.token, userData.userId);
        activeSessions.set(user.email, {
            token: userData.token,
            userId: userData.userId,
            socket
        });

        await simulateUserActivity(user, userData.token, userData.userId);
    }

    // Simulate matches and messages
    const sessions = Array.from(activeSessions.values());
    for (let i = 0; i < sessions.length; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
            const sender = sessions[i];
            const receiver = sessions[j];

            try {
                // Create match
                await axios.post(`${API_URL}/matches/${receiver.userId}`, {}, {
                    headers: { Authorization: `Bearer ${sender.token}` }
                });
                console.log(`Created match between ${sender.userId} and ${receiver.userId}`);

                // Send message
                if (sender.socket && receiver.socket) {
                    sender.socket.emit('message', {
                        receiverId: receiver.userId,
                        content: `Hello from ${sender.userId}! Would you like to travel together?`
                    });
                }
            } catch (error) {
                console.error(`Failed to create match between ${sender.userId} and ${receiver.userId}:`, error.response?.data || error.message);
            }
        }
    }

    console.log('Simulation completed successfully!');
}

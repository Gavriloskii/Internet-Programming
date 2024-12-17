const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Group = require('../models/Group');
const TravelJournal = require('../models/TravelJournal');

let mongoServer;
let token;
let testUser;
let testGroup;
let testJournal;

beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Authentication Endpoints', () => {
    const testUserData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!@#'
    };

    test('POST /api/auth/register - Register new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUserData);

        expect(res.status).toBe(201);
        expect(res.body.data.user.email).toBe(testUserData.email);
        expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/login - Login user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUserData.email,
                password: testUserData.password
            });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        token = res.body.token;
        testUser = res.body.data.user;
    });

    test('GET /api/auth/me - Get current user', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.user._id).toBe(testUser._id);
    });
});

describe('Group Endpoints', () => {
    const testGroupData = {
        name: 'Test Travel Group',
        description: 'A group for testing',
        type: 'travel',
        travelDetails: {
            destination: 'Test City',
            startDate: new Date(Date.now() + 86400000),
            endDate: new Date(Date.now() + 172800000),
            budget: 'moderate'
        }
    };

    test('POST /api/groups - Create new group', async () => {
        const res = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${token}`)
            .send(testGroupData);

        expect(res.status).toBe(201);
        expect(res.body.data.group.name).toBe(testGroupData.name);
        testGroup = res.body.data.group;
    });

    test('GET /api/groups - Get all groups', async () => {
        const res = await request(app)
            .get('/api/groups')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.groups)).toBeTruthy();
    });

    test('GET /api/groups/:id - Get single group', async () => {
        const res = await request(app)
            .get(`/api/groups/${testGroup._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.group._id).toBe(testGroup._id);
    });
});

describe('Travel Journal Endpoints', () => {
    const testJournalData = {
        title: 'Test Travel Journal',
        content: 'This is a test journal entry',
        location: {
            name: 'Test Location',
            coordinates: [0, 0]
        },
        dates: {
            start: new Date(),
            end: new Date(Date.now() + 86400000)
        },
        mood: 'happy',
        weather: 'sunny'
    };

    test('POST /api/journals - Create new journal', async () => {
        const res = await request(app)
            .post('/api/journals')
            .set('Authorization', `Bearer ${token}`)
            .send(testJournalData);

        expect(res.status).toBe(201);
        expect(res.body.data.journal.title).toBe(testJournalData.title);
        testJournal = res.body.data.journal;
    });

    test('GET /api/journals - Get all journals', async () => {
        const res = await request(app)
            .get('/api/journals')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.journals)).toBeTruthy();
    });

    test('GET /api/journals/:id - Get single journal', async () => {
        const res = await request(app)
            .get(`/api/journals/${testJournal._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.journal._id).toBe(testJournal._id);
    });

    test('POST /api/journals/:id/like - Like journal', async () => {
        const res = await request(app)
            .post(`/api/journals/${testJournal._id}/like`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });
});

describe('Error Handling', () => {
    test('404 - Route not found', async () => {
        const res = await request(app)
            .get('/api/nonexistent');

        expect(res.status).toBe(404);
    });

    test('401 - Unauthorized access', async () => {
        const res = await request(app)
            .get('/api/auth/me');

        expect(res.status).toBe(401);
    });

    test('400 - Invalid input', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'invalid-email',
                password: '123'
            });

        expect(res.status).toBe(400);
    });
});

describe('User Profile Endpoints', () => {
    const updateData = {
        name: 'Updated Name',
        travelPreferences: {
            destinations: ['Paris', 'Tokyo'],
            travelStyle: 'adventure',
            budget: 'luxury'
        }
    };

    test('PUT /api/users/profile - Update user profile', async () => {
        const res = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${token}`)
            .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.data.user.name).toBe(updateData.name);
        expect(res.body.data.user.travelPreferences).toBeDefined();
    });

    test('GET /api/users/:id - Get user profile', async () => {
        const res = await request(app)
            .get(`/api/users/${testUser._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.user._id).toBe(testUser._id);
    });
});

describe('Matching Endpoints', () => {
    test('GET /api/matches - Get potential matches', async () => {
        const res = await request(app)
            .get('/api/matches')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.matches)).toBeTruthy();
    });

    test('POST /api/matches/:userId/swipe - Swipe on a user', async () => {
        // Create another test user to swipe on
        const anotherUser = await User.create({
            name: 'Match User',
            email: 'match@example.com',
            password: 'Test123!@#'
        });

        const res = await request(app)
            .post(`/api/matches/${anotherUser._id}/swipe`)
            .set('Authorization', `Bearer ${token}`)
            .send({ direction: 'right' });

        expect(res.status).toBe(200);
        expect(res.body.data.match).toBeDefined();
    });
});

describe('Message Endpoints', () => {
    let testMessage;

    test('POST /api/messages - Send message', async () => {
        const messageData = {
            recipientId: testUser._id,
            content: 'Test message content'
        };

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${token}`)
            .send(messageData);

        expect(res.status).toBe(201);
        expect(res.body.data.message.content).toBe(messageData.content);
        testMessage = res.body.data.message;
    });

    test('GET /api/messages - Get conversation messages', async () => {
        const res = await request(app)
            .get(`/api/messages?conversationId=${testMessage.conversationId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.messages)).toBeTruthy();
    });
});

describe('Group Chat Endpoints', () => {
    test('POST /api/groups/:id/messages - Send group message', async () => {
        const messageData = {
            content: 'Test group message'
        };

        const res = await request(app)
            .post(`/api/groups/${testGroup._id}/messages`)
            .set('Authorization', `Bearer ${token}`)
            .send(messageData);

        expect(res.status).toBe(201);
        expect(res.body.data.message.content).toBe(messageData.content);
    });

    test('GET /api/groups/:id/messages - Get group messages', async () => {
        const res = await request(app)
            .get(`/api/groups/${testGroup._id}/messages`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.messages)).toBeTruthy();
    });
});

describe('Real-time Features', () => {
    test('Socket connection authentication', (done) => {
        const io = require('socket.io-client');
        const socket = io(`http://localhost:${process.env.PORT || 5000}`, {
            auth: { token }
        });

        socket.on('connect', () => {
            expect(socket.connected).toBeTruthy();
            socket.disconnect();
            done();
        });

        socket.on('connect_error', (err) => {
            done(err);
        });
    });

    test('Socket message events', (done) => {
        const io = require('socket.io-client');
        const socket = io(`http://localhost:${process.env.PORT || 5000}`, {
            auth: { token }
        });

        socket.on('connect', () => {
            socket.emit('message', {
                type: 'chat',
                content: 'Test socket message'
            });

            socket.on('message', (data) => {
                expect(data.content).toBe('Test socket message');
                socket.disconnect();
                done();
            });
        });
    });
});

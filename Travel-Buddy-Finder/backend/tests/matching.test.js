const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Match = require('../models/Match');
const request = require('supertest');
const app = require('../server');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Match.deleteMany({});
});

describe('Matching System Tests', () => {
    describe('Match Score Calculation', () => {
        test('Perfect match should have high score', async () => {
            const user1Prefs = {
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'fast',
                    interests: ['nature', 'adventure', 'photography'],
                    activityLevel: 'high'
                },
                languages: ['english', 'spanish']
            };

            const user2Prefs = {
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'fast',
                    interests: ['nature', 'adventure', 'photography'],
                    activityLevel: 'high'
                },
                languages: ['english', 'spanish']
            };

            const match = new Match();
            const score = match.calculateMatchScore(user1Prefs, user2Prefs);
            expect(score).toBeGreaterThanOrEqual(90);
        });

        test('Complementary personalities should have good score', async () => {
            const user1Prefs = {
                personalityType: 'planner',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'moderate',
                    interests: ['culture', 'history'],
                    activityLevel: 'moderate'
                }
            };

            const user2Prefs = {
                personalityType: 'flexible',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'moderate',
                    interests: ['culture', 'art'],
                    activityLevel: 'moderate'
                }
            };

            const match = new Match();
            const score = match.calculateMatchScore(user1Prefs, user2Prefs);
            expect(score).toBeGreaterThanOrEqual(75);
        });

        test('Incompatible preferences should have low score', async () => {
            const user1Prefs = {
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'luxury',
                    pace: 'fast',
                    interests: ['adventure', 'sports'],
                    activityLevel: 'high'
                }
            };

            const user2Prefs = {
                personalityType: 'relaxed',
                travelPreferences: {
                    budget: 'budget',
                    pace: 'slow',
                    interests: ['culture', 'art'],
                    activityLevel: 'low'
                }
            };

            const match = new Match();
            const score = match.calculateMatchScore(user1Prefs, user2Prefs);
            expect(score).toBeLessThan(50);
        });
    });

    describe('Match Filtering', () => {
        test('Should filter by personality type', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                personalityType: 'adventurer'
            });

            const token = user.generateAuthToken();

            const response = await request(app)
                .get('/api/matches/potential')
                .set('Authorization', `Bearer ${token}`)
                .query({ personalityType: 'adventurer' });

            expect(response.status).toBe(200);
            expect(response.body.data.every(match => 
                match.personalityType === 'adventurer' || match.personalityType === 'flexible'
            )).toBe(true);
        });

        test('Should filter by budget range', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                travelPreferences: { budget: 'moderate' }
            });

            const token = user.generateAuthToken();

            const response = await request(app)
                .get('/api/matches/potential')
                .set('Authorization', `Bearer ${token}`)
                .query({ budget: 'moderate' });

            expect(response.status).toBe(200);
            expect(response.body.data.every(match => 
                ['budget', 'moderate', 'luxury'].includes(match.travelPreferences.budget)
            )).toBe(true);
        });

        test('Should filter by interests with minimum overlap', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                travelPreferences: { interests: ['nature', 'adventure', 'photography'] }
            });

            const token = user.generateAuthToken();

            const response = await request(app)
                .get('/api/matches/potential')
                .set('Authorization', `Bearer ${token}`)
                .query({ interests: ['nature', 'adventure'] });

            expect(response.status).toBe(200);
            response.body.data.forEach(match => {
                const commonInterests = match.travelPreferences.interests
                    .filter(i => ['nature', 'adventure'].includes(i));
                expect(commonInterests.length).toBeGreaterThanOrEqual(1);
            });
        });
    });

    describe('Match Creation', () => {
        test('Should create mutual match when both users swipe right', async () => {
            const user1 = await User.create({
                name: 'User 1',
                email: 'user1@example.com',
                password: 'password123'
            });

            const user2 = await User.create({
                name: 'User 2',
                email: 'user2@example.com',
                password: 'password123'
            });

            const token1 = user1.generateAuthToken();
            const token2 = user2.generateAuthToken();

            // User 1 swipes right on User 2
            await request(app)
                .post(`/api/matches/${user2.id}`)
                .set('Authorization', `Bearer ${token1}`)
                .send({ direction: 'right' });

            // User 2 swipes right on User 1
            const response = await request(app)
                .post(`/api/matches/${user1.id}`)
                .set('Authorization', `Bearer ${token2}`)
                .send({ direction: 'right' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');

            // Verify match was created
            const match = await Match.findOne({
                users: { $all: [user1.id, user2.id] }
            });
            expect(match).toBeTruthy();
            expect(match.status).toBe('accepted');
        });

        test('Should handle rate limiting', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });

            const token = user.generateAuthToken();

            // Make multiple rapid requests
            const requests = Array(70).fill().map(() => 
                request(app)
                    .get('/api/matches/potential')
                    .set('Authorization', `Bearer ${token}`)
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);
            expect(rateLimited).toBe(true);
        });
    });

    describe('Match Performance', () => {
        test('Should handle large number of potential matches efficiently', async () => {
            // Create 1000 test users
            const users = await User.insertMany(
                Array(1000).fill().map((_, i) => ({
                    name: `Test User ${i}`,
                    email: `test${i}@example.com`,
                    password: 'password123',
                    personalityType: ['adventurer', 'planner', 'flexible', 'relaxed', 'cultural'][i % 5],
                    travelPreferences: {
                        budget: ['budget', 'moderate', 'luxury'][i % 3],
                        interests: ['nature', 'culture', 'food', 'adventure'].slice(0, (i % 4) + 1)
                    }
                }))
            );

            const testUser = users[0];
            const token = testUser.generateAuthToken();

            const startTime = Date.now();
            const response = await request(app)
                .get('/api/matches/potential')
                .set('Authorization', `Bearer ${token}`);
            const endTime = Date.now();

            expect(response.status).toBe(200);
            expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
            expect(response.body.data.length).toBeLessThanOrEqual(10); // Should respect pagination
        });
    });
});

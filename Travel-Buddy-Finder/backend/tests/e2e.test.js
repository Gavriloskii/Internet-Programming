const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./testServer');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');

describe('Travel Buddy Finder E2E Testing', () => {
    let registeredUsers = [];
    let userTokens = [];
    let testGroups = [];

    beforeAll(async () => {
        // Clear test database collections
        await User.deleteMany({});
        await Message.deleteMany({});
        await Group.deleteMany({});
    });

    describe('User Registration and Profile Setup', () => {
        const testUserData = [
            {
                name: 'Adventure Seeker',
                email: 'adventurer@test.com',
                password: 'Test123!@#',
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'fast',
                    interests: ['adventure', 'nature', 'sports'],
                    accommodationPreference: 'hostel'
                },
                languages: [
                    { language: 'English', proficiency: 'native' },
                    { language: 'Spanish', proficiency: 'intermediate' }
                ],
                location: {
                    coordinates: [-122.419416, 37.774929],
                    country: 'USA',
                    city: 'San Francisco'
                }
            },
            {
                name: 'Culture Explorer',
                email: 'culture@test.com',
                password: 'Test123!@#',
                personalityType: 'cultural',
                travelPreferences: {
                    budget: 'luxury',
                    pace: 'slow',
                    interests: ['culture', 'history', 'art'],
                    accommodationPreference: 'hotel'
                },
                languages: [
                    { language: 'English', proficiency: 'fluent' },
                    { language: 'French', proficiency: 'native' }
                ],
                location: {
                    coordinates: [2.352222, 48.856614],
                    country: 'France',
                    city: 'Paris'
                }
            }
        ];

        test('Should register multiple users with diverse profiles', async () => {
            for (const userData of testUserData) {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(userData);

                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('token');
                expect(response.body.data.user).toHaveProperty('_id');

                userTokens.push(response.body.token);
                registeredUsers.push(response.body.data.user);
            }

            expect(registeredUsers.length).toBe(testUserData.length);
        }, 10000);

        test('Should verify user profiles are created correctly', async () => {
            for (let i = 0; i < registeredUsers.length; i++) {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${userTokens[i]}`);

                expect(response.status).toBe(200);
                expect(response.body.data.user.email).toBe(testUserData[i].email);
                expect(response.body.data.user.personalityType).toBe(testUserData[i].personalityType);
            }
        });
    });

    describe('Matching System', () => {
        test('Should get potential matches based on preferences', async () => {
            const response = await request(app)
                .get('/api/matches')
                .set('Authorization', `Bearer ${userTokens[0]}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data.matches)).toBeTruthy();
        });

        test('Should create matches between compatible users', async () => {
            const response = await request(app)
                .post('/api/matches/swipe')
                .set('Authorization', `Bearer ${userTokens[0]}`)
                .send({
                    targetUserId: registeredUsers[1]._id.toString(),
                    direction: 'right'
                });

            expect(response.status).toBe(200);
        });
    });

    describe('Messaging System', () => {
        test('Should send and receive messages between matched users', async () => {
            const message = {
                recipientId: registeredUsers[1]._id.toString(),
                content: 'Hey! Want to plan a hiking trip?'
            };

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${userTokens[0]}`)
                .send(message);

            expect(response.status).toBe(201);
            expect(response.body.data.message.content).toBe(message.content);
        });
    });

    describe('Group Features', () => {
        test('Should create a travel group', async () => {
            const groupData = {
                name: 'Europe Backpackers 2024',
                description: 'Looking for travel buddies for Europe trip',
                type: 'travel',
                travelDetails: {
                    destination: 'Europe',
                    startDate: new Date('2024-06-01').toISOString(),
                    endDate: new Date('2024-06-15').toISOString(),
                    budget: 'moderate'
                }
            };

            const response = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${userTokens[0]}`)
                .send(groupData);

            expect(response.status).toBe(201);
            expect(response.body.data.group).toHaveProperty('_id');
            testGroups.push(response.body.data.group);
        });

        test('Should join existing travel group', async () => {
            const response = await request(app)
                .post(`/api/groups/${testGroups[0]._id}/join`)
                .set('Authorization', `Bearer ${userTokens[1]}`);

            expect(response.status).toBe(200);
        });
    });

    describe('Edge Cases', () => {
        test('Should handle invalid swipe attempts', async () => {
            const response = await request(app)
                .post('/api/matches/swipe')
                .set('Authorization', `Bearer ${userTokens[0]}`)
                .send({
                    targetUserId: 'invalid-id',
                    direction: 'right'
                });

            expect(response.status).toBe(400);
        });

        test('Should prevent duplicate group joins', async () => {
            const response = await request(app)
                .post(`/api/groups/${testGroups[0]._id}/join`)
                .set('Authorization', `Bearer ${userTokens[1]}`);

            expect(response.status).toBe(400);
        });

        test('Should handle large message content', async () => {
            const largeMessage = {
                recipientId: registeredUsers[1]._id.toString(),
                content: 'A'.repeat(5000)
            };

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${userTokens[0]}`)
                .send(largeMessage);

            expect(response.status).toBe(400);
        });
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });
});

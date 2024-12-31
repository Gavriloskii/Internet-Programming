const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const EnhancedMatch = require('../models/enhancedMatch');
const User = require('../models/User');
const redis = require('redis-mock');
const tf = require('@tensorflow/tfjs-node');

let mongoServer;
let redisClient;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    redisClient = redis.createClient();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    redisClient.quit();
});

beforeEach(async () => {
    await User.deleteMany({});
    await EnhancedMatch.deleteMany({});
    await redisClient.flushall();
});

describe('Enhanced Matching System Tests', () => {
    describe('ML-Based Match Score Calculation', () => {
        test('Should calculate accurate match scores with ML model', async () => {
            const user1 = await User.create({
                name: 'Test User 1',
                email: 'test1@example.com',
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'fast',
                    interests: ['nature', 'adventure', 'photography'],
                    activityLevel: 'high',
                    dateFlexibility: true
                },
                languages: ['english', 'spanish'],
                location: {
                    type: 'Point',
                    coordinates: [-73.935242, 40.730610], // NYC
                },
                metadata: {
                    responseRate: 0.95,
                    averageResponseTime: 15
                }
            });

            const user2 = await User.create({
                name: 'Test User 2',
                email: 'test2@example.com',
                personalityType: 'flexible',
                travelPreferences: {
                    budget: 'moderate',
                    pace: 'fast',
                    interests: ['nature', 'adventure', 'culture'],
                    activityLevel: 'high',
                    dateFlexibility: true
                },
                languages: ['english', 'french'],
                location: {
                    type: 'Point',
                    coordinates: [-73.935242, 40.730610], // NYC
                },
                metadata: {
                    responseRate: 0.90,
                    averageResponseTime: 20
                }
            });

            const match = new EnhancedMatch();
            const score = await match.calculateMatchScore(user1, user2);

            expect(score).toBeGreaterThanOrEqual(80);
            expect(match.compatibilityScores.personality).toBeGreaterThanOrEqual(90);
            expect(match.compatibilityScores.travel).toBeGreaterThanOrEqual(85);
            expect(match.metadata.aiConfidenceScore).toBeGreaterThanOrEqual(70);
        });

        test('Should handle ML model fallback gracefully', async () => {
            // Simulate ML model failure
            jest.spyOn(tf, 'loadLayersModel').mockRejectedValue(new Error('Model load failed'));

            const user1 = await User.create({
                name: 'Test User 1',
                email: 'test1@example.com',
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'moderate',
                    interests: ['nature', 'adventure']
                }
            });

            const user2 = await User.create({
                name: 'Test User 2',
                email: 'test2@example.com',
                personalityType: 'flexible',
                travelPreferences: {
                    budget: 'moderate',
                    interests: ['nature', 'culture']
                }
            });

            const match = new EnhancedMatch();
            const score = await match.calculateMatchScore(user1, user2);

            expect(score).toBeDefined();
            expect(match.compatibilityScores).toBeDefined();
        });
    });

    describe('Caching System', () => {
        test('Should cache and retrieve match scores correctly', async () => {
            const user1 = await User.create({
                name: 'Cache Test 1',
                email: 'cache1@example.com',
                personalityType: 'adventurer'
            });

            const user2 = await User.create({
                name: 'Cache Test 2',
                email: 'cache2@example.com',
                personalityType: 'flexible'
            });

            const match = new EnhancedMatch();
            
            // First calculation
            const startTime1 = Date.now();
            const score1 = await match.calculateMatchScore(user1, user2);
            const duration1 = Date.now() - startTime1;

            // Second calculation (should use cache)
            const startTime2 = Date.now();
            const score2 = await match.calculateMatchScore(user1, user2);
            const duration2 = Date.now() - startTime2;

            expect(score1).toBe(score2);
            expect(duration2).toBeLessThan(duration1);
        });

        test('Should handle cache failures gracefully', async () => {
            // Simulate Redis failure
            jest.spyOn(redisClient, 'get').mockImplementation((key, callback) => {
                callback(new Error('Redis error'));
            });

            const user1 = await User.create({
                name: 'Cache Error Test 1',
                email: 'cacheerror1@example.com'
            });

            const user2 = await User.create({
                name: 'Cache Error Test 2',
                email: 'cacheerror2@example.com'
            });

            const match = new EnhancedMatch();
            const score = await match.calculateMatchScore(user1, user2);

            expect(score).toBeDefined();
        });
    });

    describe('Match Finding Performance', () => {
        test('Should efficiently find potential matches with pagination', async () => {
            // Create 100 test users
            const users = await Promise.all(
                Array(100).fill().map((_, i) => User.create({
                    name: `Performance Test ${i}`,
                    email: `perf${i}@example.com`,
                    personalityType: ['adventurer', 'planner', 'flexible'][i % 3],
                    location: {
                        type: 'Point',
                        coordinates: [-73.935242, 40.730610]
                    }
                }))
            );

            // Create matches for first user
            const mainUser = users[0];
            await Promise.all(
                users.slice(1).map(user => EnhancedMatch.create({
                    users: [mainUser._id, user._id],
                    matchScore: Math.floor(Math.random() * 100)
                }))
            );

            const startTime = Date.now();
            const matches = await EnhancedMatch.findPotentialMatches(mainUser._id, {
                location: mainUser.location
            }, {
                limit: 10,
                page: 1,
                minScore: 70,
                maxDistance: 100
            });

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100); // Should complete within 100ms
            expect(matches.length).toBeLessThanOrEqual(10);
            expect(matches.every(m => m.matchScore >= 70)).toBe(true);
        });
    });

    describe('Behavioral Compatibility', () => {
        test('Should consider user interaction patterns', async () => {
            const user1 = await User.create({
                name: 'Behavioral Test 1',
                email: 'behavioral1@example.com',
                metadata: {
                    responseRate: 0.95,
                    averageResponseTime: 10,
                    matchRate: 0.8
                }
            });

            const user2 = await User.create({
                name: 'Behavioral Test 2',
                email: 'behavioral2@example.com',
                metadata: {
                    responseRate: 0.90,
                    averageResponseTime: 15,
                    matchRate: 0.75
                }
            });

            const match = new EnhancedMatch();
            await match.calculateMatchScore(user1, user2);

            expect(match.compatibilityScores.behavioral).toBeGreaterThanOrEqual(85);
        });
    });

    describe('Edge Cases', () => {
        test('Should handle incomplete user profiles gracefully', async () => {
            const user1 = await User.create({
                name: 'Incomplete Profile 1',
                email: 'incomplete1@example.com'
            });

            const user2 = await User.create({
                name: 'Incomplete Profile 2',
                email: 'incomplete2@example.com'
            });

            const match = new EnhancedMatch();
            const score = await match.calculateMatchScore(user1, user2);

            expect(score).toBeDefined();
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('Should handle extreme preference differences', async () => {
            const user1 = await User.create({
                name: 'Extreme Test 1',
                email: 'extreme1@example.com',
                personalityType: 'adventurer',
                travelPreferences: {
                    budget: 'luxury',
                    pace: 'fast',
                    activityLevel: 'high'
                }
            });

            const user2 = await User.create({
                name: 'Extreme Test 2',
                email: 'extreme2@example.com',
                personalityType: 'relaxed',
                travelPreferences: {
                    budget: 'budget',
                    pace: 'slow',
                    activityLevel: 'low'
                }
            });

            const match = new EnhancedMatch();
            const score = await match.calculateMatchScore(user1, user2);

            expect(score).toBeLessThan(50);
        });
    });
});

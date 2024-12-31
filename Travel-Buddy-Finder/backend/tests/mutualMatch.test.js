const mongoose = require('mongoose');
const MatchService = require('../services/matchService');
const User = require('../models/User');
const Swipe = require('../models/Swipe');
const Match = require('../models/Match');

describe('Mutual Match Functionality', () => {
    let user1, user2, matchService;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/travel-buddy-test');
    });

    beforeEach(async () => {
        await Promise.all([
            User.deleteMany({}),
            Swipe.deleteMany({}),
            Match.deleteMany({})
        ]);

        user1 = await User.create({
            name: 'Test User 1',
            email: 'test1@example.com',
            password: 'TestPass123!',
            passwordConfirm: 'TestPass123!',
            personalityType: 'adventurer',
            travelPreferences: {
                budget: 'moderate',
                pace: 'moderate',
                interests: ['nature', 'adventure'],
                accommodationPreference: 'flexible'
            },
            languages: [{
                language: 'English',
                proficiency: 'native'
            }],
            location: {
                coordinates: [0, 0],
                country: 'TestCountry',
                city: 'TestCity'
            }
        });

        user2 = await User.create({
            name: 'Test User 2',
            email: 'test2@example.com',
            password: 'TestPass123!',
            passwordConfirm: 'TestPass123!',
            personalityType: 'flexible',
            travelPreferences: {
                budget: 'moderate',
                pace: 'moderate',
                interests: ['nature', 'culture'],
                accommodationPreference: 'flexible'
            },
            languages: [{
                language: 'English',
                proficiency: 'native'
            }],
            location: {
                coordinates: [0, 0],
                country: 'TestCountry',
                city: 'TestCity'
            }
        });

        matchService = new MatchService();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Should create a mutual match when both users like each other', async () => {
        const swipe1Result = await matchService.recordSwipe(user1._id, user2._id, 'like');
        expect(swipe1Result.isMutualMatch).toBe(false);
        
        const swipe2Result = await matchService.recordSwipe(user2._id, user1._id, 'like');
        expect(swipe2Result.isMutualMatch).toBe(true);
        expect(swipe2Result.match).toBeDefined();
        
        const match = swipe2Result.match;
        expect(match.users).toContain(user1._id);
        expect(match.users).toContain(user2._id);
        expect(match.notificationStatus).toBe('pending');
        expect(match.status).toBe('pending');
        expect(match.metadata.matchType).toBe('mutual');
        expect(match.matchScore).toBeGreaterThan(0);
    });

    test('Should not create a match if one user rejects', async () => {
        const swipe1Result = await matchService.recordSwipe(user1._id, user2._id, 'like');
        expect(swipe1Result.isMutualMatch).toBe(false);
        
        const swipe2Result = await matchService.recordSwipe(user2._id, user1._id, 'reject');
        expect(swipe2Result.isMutualMatch).toBe(false);
        expect(swipe2Result.match).toBeUndefined();
        
        const matches = await Match.find({});
        expect(matches.length).toBe(0);
    });

    test('Should calculate correct match score for mutual match', async () => {
        await matchService.recordSwipe(user1._id, user2._id, 'like');
        
        const result = await matchService.recordSwipe(user2._id, user1._id, 'like');
        
        expect(result.match.matchScore).toBeDefined();
        expect(result.match.matchScore).toBeGreaterThanOrEqual(60);
    });

    test('Should prevent duplicate swipes', async () => {
        await matchService.recordSwipe(user1._id, user2._id, 'like');
        
        await expect(
            matchService.recordSwipe(user1._id, user2._id, 'like')
        ).rejects.toThrow();
    });
});

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const app = require('./testServer');

// Helper function to generate test JWT tokens
const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1d'
  });
};

describe('Matches API', () => {
  let testUser;
  let testUserToken;
  let otherUsers;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/travel-buddy-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create a test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      passwordConfirm: 'Password123!',
      personalityType: 'adventurer',
      travelPreferences: {
        budget: 'moderate',
        pace: 'moderate',
        interests: ['culture', 'food', 'art'],
        accommodationPreference: 'hotel',
        travelStyle: 'flexible',
        activityLevel: 'moderate',
        matchRadius: 1000
      },
      languages: [{ language: 'English', proficiency: 'native' }],
      active: true,
      lastActive: new Date(),
      location: {
        type: 'Point',
        coordinates: [0, 0],
        country: 'TestCountry',
        city: 'TestCity'
      }
    });

    // Generate token for test user
    testUserToken = generateTestToken(testUser._id);

    // Create other users with varying match potential
    otherUsers = await User.create([
      {
        name: 'Perfect Match',
        email: 'perfect@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        personalityType: 'adventurer',
        travelPreferences: {
          budget: 'moderate',
          pace: 'moderate',
          interests: ['culture', 'food', 'art'],
          accommodationPreference: 'hotel',
          travelStyle: 'flexible',
          activityLevel: 'moderate',
          matchRadius: 1000
        },
        languages: [{ language: 'English', proficiency: 'native' }],
        active: true,
        lastActive: new Date(),
        location: {
          type: 'Point',
          coordinates: [0.1, 0.1],
          country: 'TestCountry',
          city: 'TestCity'
        }
      },
      {
        name: 'Partial Match',
        email: 'partial@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        personalityType: 'flexible',
        travelPreferences: {
          budget: 'moderate',
          pace: 'fast',
          interests: ['food', 'shopping'],
          accommodationPreference: 'flexible',
          travelStyle: 'flexible',
          activityLevel: 'high',
          matchRadius: 1000
        },
        languages: [{ language: 'English', proficiency: 'intermediate' }],
        active: true,
        lastActive: new Date(),
        location: {
          type: 'Point',
          coordinates: [1, 1],
          country: 'AnotherCountry',
          city: 'AnotherCity'
        }
      }
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /matches/potential', () => {
    test('should return potential matches sorted by match score', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      
      // Verify matches are sorted by score (highest first)
      const scores = response.body.data.map(match => match.matchScore);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));

      // Verify first match has highest compatibility
      expect(response.body.data[0].name).toBe('Perfect Match');
      expect(response.body.data[0].matchScore).toBeGreaterThan(65); // Perfect match should have at least 65% compatibility
    });

    test('should apply pagination correctly', async () => {
      const response = await request(app)
        .get('/api/matches/potential?page=1&limit=1')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.metadata.totalPages).toBe(2);
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/matches/potential')
        .expect(401);
    });

    test('should include match metadata', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.metadata).toHaveProperty('averageScore');
      expect(response.body.metadata).toHaveProperty('scoreRange');
      expect(response.body.metadata).toHaveProperty('averageDistance');
      expect(response.body.metadata).toHaveProperty('distanceRange');
    });

    test('should filter by lastSwipeDirection', async () => {
      const response = await request(app)
        .get('/api/matches/potential?lastSwipeDirection=right')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // High match scores for right swipe
      expect(response.body.data.every(match => match.matchScore >= 60)).toBe(true);
    });
  });
});

const request = require('supertest');
const app = require('../testServer');
const User = require('../models/User');
const Event = require('../models/Event');
const Post = require('../models/Post');
const Itinerary = require('../models/Itinerary');
const Journal = require('../models/Journal');
const { setupTestDB } = require('./setup');

describe('Travel Buddy Feature Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    await setupTestDB();
    
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      preferences: {
        travelStyle: ['adventure', 'budget'],
        languages: ['english', 'spanish'],
        interests: ['hiking', 'photography']
      }
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Log any unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  });

  describe('Events Feature', () => {
    it('should create a new event', async () => {
      const newEvent = {
        title: 'Group Hiking Trip',
        description: 'Weekend hiking adventure in the mountains',
        date: new Date('2024-06-15'),
        location: 'Rocky Mountains',
        type: 'outdoor',
        maxParticipants: 10
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEvent);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newEvent.title);
    });

    it('should list all events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Forum Feature', () => {
    it('should create a new forum post', async () => {
      const newPost = {
        title: 'Best Time for Southeast Asia',
        content: 'Looking for advice on the best season to visit Southeast Asia',
        category: 'Trip Planning',
        tags: ['asia', 'seasonal-travel']
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPost);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newPost.title);
    });

    it('should list all forum posts', async () => {
      const response = await request(app)
        .get('/api/forum/posts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Itinerary Feature', () => {
    it('should create a new itinerary', async () => {
      const newItinerary = {
        title: 'European Adventure 2024',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-21'),
        destinations: ['Paris', 'Amsterdam', 'Berlin'],
        description: 'A 3-week journey through Western Europe',
        budget: 5000,
        currency: 'EUR'
      };

      const response = await request(app)
        .post('/api/itineraries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newItinerary);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newItinerary.title);
    });

    it('should list all itineraries', async () => {
      const response = await request(app)
        .get('/api/itineraries')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Journal Feature', () => {
    it('should create a new journal entry', async () => {
      const newEntry = {
        title: 'First Day in Paris',
        location: 'Paris, France',
        date: new Date('2024-06-01'),
        content: 'Today was amazing exploring the streets of Paris...',
        mood: 'excited',
        weather: 'sunny',
        tags: ['paris', 'france', 'first-day']
      };

      const response = await request(app)
        .post('/api/journal/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEntry);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newEntry.title);
    });

    it('should list all journal entries', async () => {
      const response = await request(app)
        .get('/api/journal/entries')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid event creation', async () => {
      const invalidEvent = {
        // Missing required fields
        description: 'Invalid event'
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({ title: 'Unauthorized Event' });

      expect(response.status).toBe(401);
    });
  });

  describe('Data Validation', () => {
    it('should validate date formats', async () => {
      const invalidItinerary = {
        title: 'Invalid Dates',
        startDate: 'invalid-date',
        endDate: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/itineraries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItinerary);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const invalidPost = {
        // Missing title and content
        category: 'Trip Planning'
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });
});

const request = require('supertest');
const app = require('../server'); // Adjust the path as necessary
const mongoose = require('mongoose');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

beforeAll(async () => {
    // Clear the database before running tests
    await User.deleteMany({});
});

describe('API Endpoints', () => {
    it('should return a message from /api/test', async () => {
        const response = await request(app).get('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message', 'API is working'); // Updated expected message
    });

    it('should return a message from /api/message', async () => {
        const response = await request(app).get('/api/message');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message', 'Hello from the backend'); // Updated expected message
    });

    // Test User Registration
    it('should register a new user', async () => {
        const response = await request(app)
            .post('/api/register')
            .send({ email: 'testuser@example.com', password: 'password123' }); // Corrected syntax
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('message', 'User registered successfully'); // Check expected message
    });

    // Test User Login
    it('should login a user', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ email: 'testuser@example.com', password: 'password123' });
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
    });

    // Test Invalid Login
    it('should return 401 for invalid login', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ email: 'testuser@example.com', password: 'wrongpassword' });
        expect(response.statusCode).toBe(401);
    });

    // Test Token Validation
    it('should validate the token', async () => {
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ email: 'testuser@example.com', password: 'password123' });
        const token = loginResponse.body.token;

        // Decode the token to check if it contains the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded).toHaveProperty('id');
    });
});

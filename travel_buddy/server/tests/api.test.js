const request = require('supertest');
const app = require('../server'); // Adjust the path as necessary

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
});

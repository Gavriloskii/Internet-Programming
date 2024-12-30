const request = require('supertest');
const { app, startServer, closeMongoConnection } = require('../server'); // Import the app instance and close function

describe('GET /', () => {
    let server;

    beforeAll((done) => {
        server = startServer(); // Use the startServer function
        done();
    });

    afterAll((done) => {
        closeMongoConnection().then(() => {
            console.log('MongoDB connection closed.');
            server.close(() => {
                console.log('Server closed.');
                done();
            });
        });
    });

    it('should respond with "Server is running!"', async () => {
        const response = await request(server).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Server is running!');
    });
});

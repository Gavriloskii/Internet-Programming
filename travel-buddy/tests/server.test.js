const request = require('supertest');
const { app, closeMongoConnection } = require('../server'); // Import the app instance and close function

describe('GET /', () => {
    let server;

    beforeAll((done) => {
        server = app.listen(() => {
            done();
        });
    });

    afterAll((done) => {
        closeMongoConnection().then(() => {
            server.close(done);
        });
    });

    it('should respond with "Server is running!"', async () => {
        const response = await request(server).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Server is running!');
    });
});

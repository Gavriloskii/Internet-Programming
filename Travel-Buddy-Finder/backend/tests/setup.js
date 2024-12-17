const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Configure environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_COOKIE_EXPIRES_IN = '1';
process.env.PORT = '5002';

let mongoServer;

// Increase timeout for tests
jest.setTimeout(60000);

// Suppress console logs during tests unless there's an error
if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
}

// Keep error logging enabled
console.error = console.error;

beforeAll(async () => {
    try {
        // Create new in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Disconnect from any existing connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        // Connect to the in-memory database
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

    } catch (error) {
        console.error('MongoDB Setup Error:', error);
        throw error;
    }
});

afterAll(async () => {
    try {
        // Clean up and close connection
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    } catch (error) {
        console.error('MongoDB Cleanup Error:', error);
        throw error;
    }
});

// Clean up database between tests
afterEach(async () => {
    try {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    } catch (error) {
        console.error('Test Cleanup Error:', error);
        throw error;
    }
});

// Helper functions for tests
global.createTestUser = async (User, userData = {}) => {
    const defaultUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!@#',
        ...userData
    };

    const user = await User.create(defaultUser);
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    return { user, token };
};

// Mock socket.io for tests
jest.mock('socket.io', () => {
    const mockOn = jest.fn();
    const mockEmit = jest.fn();
    const mockTo = jest.fn(() => ({ emit: mockEmit }));

    return jest.fn(() => ({
        on: mockOn,
        emit: mockEmit,
        to: mockTo,
        use: jest.fn(),
    }));
});

// Mock external services
jest.mock('../services/socketService', () => {
    return jest.fn().mockImplementation(() => ({
        initialize: jest.fn(),
        handleConnection: jest.fn(),
        handleDisconnection: jest.fn(),
        emitToUser: jest.fn(),
        broadcast: jest.fn(),
    }));
});

// Mock server listen to prevent port conflicts
jest.mock('../server', () => {
    const app = jest.requireActual('./testServer');
    app.listen = jest.fn();
    return app;
});

// Global test utilities
global.generateAuthToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Add custom matchers
expect.extend({
    toBeValidMongoId(received) {
        const pass = mongoose.Types.ObjectId.isValid(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid MongoDB ObjectId`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid MongoDB ObjectId`,
                pass: false
            };
        }
    }
});

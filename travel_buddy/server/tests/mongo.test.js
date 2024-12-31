const mongoose = require('mongoose');
const User = require('../models/model'); // Adjust the path as necessary

beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

afterAll(async () => {
    await User.deleteMany({}); // Clean up the test database
    await mongoose.connection.close(); // Ensure the connection is closed
});

describe('MongoDB CRUD Operations', () => {
    it('should create a new document', async () => {
        const doc = await User.create({ name: 'Test Document', email: `test1-${Date.now()}@example.com` });
        expect(doc).toHaveProperty('_id');
        expect(doc.name).toBe('Test Document');
    });

    it('should read a document', async () => {
        const doc = await User.findOne({ name: 'Test Document' });
        expect(doc).toHaveProperty('_id');
        expect(doc.name).toBe('Test Document');
    });

    it('should update a document', async () => {
        const doc = await User.findOneAndUpdate(
            { name: 'Test Document' },
            { name: 'Updated Document' },
            { new: true }
        );
        expect(doc.name).toBe('Updated Document');
    });

    it('should delete a document', async () => {
        const result = await User.deleteOne({ name: 'Updated Document' });
        expect(result.deletedCount).toBe(1);
    });
});

const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    results: {
        type: Array,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);

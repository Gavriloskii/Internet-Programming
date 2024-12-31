const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  swiper_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Swiper ID is required']
  },
  swiped_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Swiped user ID is required']
  },
  action: {
    type: String,
    enum: ['like', 'reject'],
    required: [true, 'Swipe action is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for swiper and swiped IDs to prevent duplicate swipes
swipeSchema.index({ swiper_id: 1, swiped_id: 1 }, { unique: true });

const Swipe = mongoose.model('Swipe', swipeSchema);

module.exports = Swipe;

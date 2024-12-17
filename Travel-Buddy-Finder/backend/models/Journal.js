const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  mood: {
    type: String,
    enum: ['excited', 'happy', 'peaceful', 'neutral', 'tired', 'frustrated', 'other'],
    required: true
  },
  weather: {
    type: String,
    enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'hot', 'cold', 'perfect', 'other'],
    required: true
  },
  photos: [{
    url: String,
    caption: String,
    location: String,
    takenAt: Date
  }],
  tags: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ['private', 'friends', 'public'],
    default: 'private'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedItinerary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary'
  },
  expenses: [{
    category: {
      type: String,
      enum: ['food', 'accommodation', 'transportation', 'activities', 'shopping', 'other']
    },
    amount: Number,
    currency: String,
    description: String
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  recommendations: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
journalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Text search index
journalSchema.index({ 
  title: 'text', 
  content: 'text', 
  location: 'text', 
  tags: 'text' 
});

module.exports = mongoose.model('Journal', journalSchema);

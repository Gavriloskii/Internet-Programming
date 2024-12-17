const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  destinations: [{
    type: String,
    required: true
  }],
  description: {
    type: String,
    required: true
  },
  activities: [{
    day: Number,
    location: String,
    description: String,
    startTime: String,
    endTime: String,
    cost: Number,
    notes: String
  }],
  budget: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['planning', 'ongoing', 'completed', 'cancelled'],
    default: 'planning'
  },
  visibility: {
    type: String,
    enum: ['private', 'shared', 'public'],
    default: 'private'
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer'
    }
  }],
  transportation: [{
    type: {
      type: String,
      enum: ['flight', 'train', 'bus', 'car', 'other']
    },
    from: String,
    to: String,
    date: Date,
    bookingReference: String,
    cost: Number
  }],
  accommodation: [{
    name: String,
    location: String,
    checkIn: Date,
    checkOut: Date,
    bookingReference: String,
    cost: Number
  }],
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
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

// Middleware to update the updatedAt timestamp
itinerarySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validate that endDate is after startDate
itinerarySchema.pre('validate', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Index for searching
itinerarySchema.index({ title: 'text', description: 'text', destinations: 'text' });

module.exports = mongoose.model('Itinerary', itinerarySchema);

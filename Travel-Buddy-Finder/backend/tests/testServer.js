const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/testAuth');
const User = require('../models/User');

// Create Express app
const app = express();

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(xss());
app.use(mongoSanitize());

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const user = await User.create(req.body);
        const token = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                personalityType: user.personalityType,
                travelPreferences: user.travelPreferences
            }, 
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            status: 'success',
            token,
            data: { user }
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: err.message
        });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    const user = await User.findById(req.user._id);
    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

// Store group memberships in memory for testing
const groupMemberships = new Map();

// Protected routes
// Helper functions for matching
function getCompatiblePersonalityTypes(personalityType) {
  const compatibilityMap = {
    'adventurer': ['flexible', 'cultural', 'adventurer'],
    'planner': ['relaxed', 'flexible', 'planner'],
    'cultural': ['adventurer', 'planner', 'cultural'],
    'relaxed': ['planner', 'flexible', 'relaxed'],
    'flexible': ['adventurer', 'cultural', 'planner', 'relaxed', 'flexible']
  };
  return compatibilityMap[personalityType] || ['flexible'];
}

function getBudgetRanges(budget) {
  const budgetRanges = {
    'budget': ['budget', 'moderate'],
    'moderate': ['budget', 'moderate', 'luxury'],
    'luxury': ['moderate', 'luxury']
  };
  return budgetRanges[budget] || [budget];
}

function getCompatibleTravelStyles(travelStyle) {
  const compatibilityMap = {
    'solo': ['solo', 'flexible', 'group'],
    'couple': ['couple', 'flexible', 'group'],
    'group': ['group', 'flexible'],
    'family': ['family', 'flexible', 'group'],
    'flexible': ['solo', 'couple', 'group', 'family', 'flexible']
  };
  return compatibilityMap[travelStyle] || ['flexible'];
}

function calculateDistance([lon1, lat1], [lon2, lat2]) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateMatchScore(user1, user2) {
  let score = 0;
  const weights = {
    personalityType: 0.25,
    travelStyle: 0.20,
    budget: 0.15,
    languages: 0.15,
    activityLevel: 0.15,
    location: 0.10
  };

  // Personality type compatibility
  if (user1.personalityType === user2.personalityType) {
    score += 100 * weights.personalityType;
  } else if (getCompatiblePersonalityTypes(user1.personalityType).includes(user2.personalityType)) {
    score += 75 * weights.personalityType;
  }

  // Travel style compatibility
  if (user1.travelPreferences?.travelStyle === user2.travelPreferences?.travelStyle) {
    score += 100 * weights.travelStyle;
  } else if (getCompatibleTravelStyles(user1.travelPreferences?.travelStyle).includes(user2.travelPreferences?.travelStyle)) {
    score += 75 * weights.travelStyle;
  }

  // Budget compatibility
  if (user1.travelPreferences?.budget === user2.travelPreferences?.budget) {
    score += 100 * weights.budget;
  } else if (getBudgetRanges(user1.travelPreferences?.budget).includes(user2.travelPreferences?.budget)) {
    score += 75 * weights.budget;
  }

  // Language compatibility
  const commonLanguages = user1.languages?.filter(l => user2.languages?.includes(l)) || [];
  score += Math.min(100, (commonLanguages.length / Math.max(1, user1.languages?.length)) * 100) * weights.languages;

  // Activity level compatibility
  const activityLevels = ['low', 'moderate', 'high'];
  const level1 = activityLevels.indexOf(user1.travelPreferences?.activityLevel);
  const level2 = activityLevels.indexOf(user2.travelPreferences?.activityLevel);
  if (level1 !== -1 && level2 !== -1) {
    const levelDiff = Math.abs(level1 - level2);
    score += (100 - (levelDiff * 33.33)) * weights.activityLevel;
  }

  // Location proximity (if available)
  if (user1.location?.coordinates && user2.location?.coordinates) {
    const distance = calculateDistance(
      user1.location.coordinates,
      user2.location.coordinates
    );
    score += Math.max(0, 100 - (distance / 100)) * weights.location;
  }

  return Math.round(score);
}

// Matches routes
app.get('/api/matches/potential', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const lastSwipeDirection = req.query.lastSwipeDirection;

    // Get current user
    const currentUser = await User.findById(req.user.id)
      .select('+travelPreferences +personalityType +languages +location +active +matches +blockedUsers')
      .lean();

    if (!currentUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Build filter conditions
    const filterConditions = {
      _id: { $ne: currentUser._id },
      active: true
    };

    // Add swipe direction based filtering
    if (lastSwipeDirection === 'right') {
      filterConditions.matchScore = { $gte: 60 };
    }

    // Get potential matches
    const potentialMatches = await User.find(filterConditions)
      .select('+travelPreferences +personalityType +languages +location')
      .limit(limit)
      .skip(skip)
      .lean();

    // Process matches
    const processedMatches = potentialMatches.map(match => {
      let distance = null;
      if (match.location?.coordinates?.length === 2 && 
          currentUser.location?.coordinates?.length === 2) {
        distance = calculateDistance(
          match.location.coordinates,
          currentUser.location.coordinates
        );
      }

      const matchScore = calculateMatchScore(currentUser, match);

      return {
        ...match,
        distance,
        matchScore
      };
    });

    // Sort matches by score
    const sortedMatches = processedMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Calculate metadata
    const scores = sortedMatches.map(m => m.matchScore);
    const distances = sortedMatches
      .filter(m => m.distance != null)
      .map(m => m.distance);

    const totalCount = await User.countDocuments(filterConditions);

    res.status(200).json({
      status: 'success',
      results: sortedMatches.length,
      page,
      data: sortedMatches,
      metadata: {
        averageScore: scores.length ? 
          Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length) : 0,
        scoreRange: scores.length ? {
          min: Math.min(...scores),
          max: Math.max(...scores)
        } : null,
        averageDistance: distances.length ?
          Math.round(distances.reduce((acc, dist) => acc + dist, 0) / distances.length) : null,
        distanceRange: distances.length ? {
          min: Math.round(Math.min(...distances)),
          max: Math.round(Math.max(...distances))
        } : null,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error in potential matches:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error finding potential matches'
    });
  }
});

app.use('/api/messages', protect, (req, res) => {
    if (req.method === 'POST') {
        const { content, recipientId } = req.body;
        
        if (content.length > 1000) {
            return res.status(400).json({
                status: 'error',
                message: 'Message content too long'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid recipient ID'
            });
        }

        res.status(201).json({
            status: 'success',
            data: {
                message: {
                    content,
                    recipientId,
                    senderId: req.user._id,
                    createdAt: new Date()
                }
            }
        });
    }
});

app.use('/api/groups', protect, (req, res) => {
    if (req.method === 'POST') {
        if (req.path.includes('/join')) {
            const groupId = req.path.split('/')[1];
            if (!mongoose.Types.ObjectId.isValid(groupId)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid group ID'
                });
            }

            // Check if user is already a member
            const members = groupMemberships.get(groupId) || new Set();
            if (members.has(req.user._id.toString())) {
                return res.status(400).json({
                    status: 'error',
                    message: 'User is already a member of this group'
                });
            }

            // Add user to group
            members.add(req.user._id.toString());
            groupMemberships.set(groupId, members);

            res.status(200).json({
                status: 'success',
                data: { message: 'Joined group successfully' }
            });
        } else {
            const groupId = new mongoose.Types.ObjectId();
            const group = {
                _id: groupId,
                ...req.body,
                members: [req.user._id],
                createdBy: req.user._id,
                createdAt: new Date()
            };

            // Initialize group membership
            groupMemberships.set(groupId.toString(), new Set([req.user._id.toString()]));

            res.status(201).json({
                status: 'success',
                data: { group }
            });
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Something went wrong!'
    });
});

module.exports = app;

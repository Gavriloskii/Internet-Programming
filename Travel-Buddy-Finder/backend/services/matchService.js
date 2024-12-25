const User = require('../models/User');
const Match = require('../models/Match');
const Swipe = require('../models/Swipe');
const logger = require('../utils/logger');
const socketService = require('./socketService');

class MatchService {
  /**
   * Records a swipe action in the database
   * @param {string} swiperId - ID of the user who is swiping
   * @param {string} swipedId - ID of the user being swiped
   * @param {string} action - The swipe action ('like' or 'reject')
   * @returns {Promise<Object>} The created swipe record
   */
  async recordSwipe(swiperId, swipedId, action) {
    try {
      // Create new swipe record
      const swipe = await Swipe.create({
        swiper_id: swiperId,
        swiped_id: swipedId,
        action
      });

      logger.info(`Swipe recorded: ${swiperId} ${action}d ${swipedId}`);

      // If action is like, check for mutual match
      if (action === 'like') {
        const mutualLike = await Swipe.findOne({
          swiper_id: swipedId,
          swiped_id: swiperId,
          action: 'like'
        });

        if (mutualLike) {
          // Get both users for score calculation
          const [user1, user2] = await Promise.all([
            User.findById(swiperId),
            User.findById(swipedId)
          ]);

          // Calculate match score using the static method
          const matchScore = MatchService.calculateMatchScore(user1, user2);

          // Create match with score and metadata
          const match = await Match.create({
            users: [swiperId, swipedId],
            matchScore,
            matchedOn: new Date(),
            status: 'pending',
            notificationStatus: 'pending',
            matchInitiatedBy: swiperId,
            metadata: {
              matchType: 'mutual',
              swipeTime: Date.now(),
              initialMessageSent: false
            }
          });

          logger.info(`Mutual match created between users ${swiperId} and ${swipedId} with score ${matchScore}`);

          // Notify both users about the match through socket
          socketService.notifyMatch({
            matchId: match._id,
            users: [swiperId, swipedId],
            matchScore: matchScore
          });

          return {
            swipe,
            match,
            isMutualMatch: true
          };
        }
      }

      return {
        swipe,
        isMutualMatch: false
      };
    } catch (error) {
      logger.error('Error in recordSwipe:', error);
      throw error;
    }
  }

  /**
   * Calculate match score between two users based on their preferences
   * @param {Object} user1Prefs - First user's preferences
   * @param {Object} user2Prefs - Second user's preferences
   * @returns {number} Score between 0-1 indicating match strength
   */
  static calculateMatchScore(user1Prefs, user2Prefs) {
    let score = 0;
    let totalWeight = 0;

    // Budget match (weight: 20)
    if (user1Prefs.travelPreferences?.budget && user2Prefs.travelPreferences?.budget) {
      const weight = 20;
      totalWeight += weight;
      if (user1Prefs.travelPreferences.budget === user2Prefs.travelPreferences.budget) {
        score += weight;
      }
    }

    // Pace match (weight: 20)
    if (user1Prefs.travelPreferences?.pace && user2Prefs.travelPreferences?.pace) {
      const weight = 20;
      totalWeight += weight;
      if (user1Prefs.travelPreferences.pace === user2Prefs.travelPreferences.pace) {
        score += weight;
      }
    }

    // Interests match (weight: 40)
    if (user1Prefs.travelPreferences?.interests && user2Prefs.travelPreferences?.interests) {
      const weight = 40;
      totalWeight += weight;
      const commonInterests = user1Prefs.travelPreferences.interests.filter(interest =>
        user2Prefs.travelPreferences.interests.includes(interest)
      );
      score += (weight * commonInterests.length) / Math.max(
        user1Prefs.travelPreferences.interests.length,
        user2Prefs.travelPreferences.interests.length
      );
    }

    // Accommodation preference match (weight: 20)
    if (user1Prefs.travelPreferences?.accommodationPreference && user2Prefs.travelPreferences?.accommodationPreference) {
      const weight = 20;
      totalWeight += weight;
      if (user1Prefs.travelPreferences.accommodationPreference === user2Prefs.travelPreferences.accommodationPreference ||
          user1Prefs.travelPreferences.accommodationPreference === 'flexible' ||
          user2Prefs.travelPreferences.accommodationPreference === 'flexible') {
        score += weight;
      }
    }

    // Return score as a percentage (0-100)
    return Math.round(totalWeight > 0 ? score : 0);
  }

  /**
   * Find potential matches for a user based on their preferences
   * @param {Object} userPreferences - User's travel preferences
   * @param {string} userId - ID of the user seeking matches
   * @param {number} limit - Maximum number of matches to return
   * @param {number} minScore - Minimum match score threshold (0-1)
   * @returns {Promise<Array>} Array of potential matches sorted by relevance
   */
  static async findMatches(userPreferences, userId, limit = 10, minScore = 0.3) {
    try {
      // Get all users except the requesting user
      const potentialMatches = await User.find({
        _id: { $ne: userId },
        'travelPreferences.interests': { $exists: true }
      }).select('travelPreferences name _id personalityType').lean();

      // Calculate match scores
      const scoredMatches = potentialMatches.map(user => ({
        user,
        score: this.calculateMatchScore(userPreferences, user)
      }));

      // Filter by minimum score, sort by score (highest first) and limit results
      return scoredMatches
        .filter(match => match.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(match => ({
          userId: match.user._id,
          name: match.user.name,
          score: match.score,
          matchDetails: match.user.travelPreferences
        }));
    } catch (error) {
      throw new Error(`Error finding matches: ${error.message}`);
    }
  }
}

module.exports = MatchService;

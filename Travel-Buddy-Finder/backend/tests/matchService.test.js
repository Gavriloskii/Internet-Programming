const MatchService = require('../services/matchService');
const mongoose = require('mongoose');
const User = require('../models/User');

describe('MatchService', () => {
  describe('calculateMatchScore', () => {
    test('should return perfect score for identical preferences', () => {
      const prefs1 = {
        travelPreferences: {
          budget: 'moderate',
          pace: 'moderate',
          interests: ['culture', 'food', 'art'],
          accommodationPreference: 'hotel'
        }
      };
      const prefs2 = { ...prefs1 };

      const score = MatchService.calculateMatchScore(prefs1, prefs2);
      expect(score).toBe(1);
    });

    test('should return 0 for completely different preferences', () => {
      const prefs1 = {
        travelPreferences: {
          budget: 'moderate',
          pace: 'moderate',
          interests: ['culture', 'food', 'art'],
          accommodationPreference: 'hotel'
        }
      };
      const prefs2 = {
        travelPreferences: {
          budget: 'luxury',
          pace: 'fast',
          interests: ['adventure', 'sports', 'nature'],
          accommodationPreference: 'camping'
        }
      };

      const score = MatchService.calculateMatchScore(prefs1, prefs2);
      expect(score).toBe(0);
    });

    test('should handle partial matches correctly', () => {
      const prefs1 = {
        travelPreferences: {
          budget: 'moderate',
          pace: 'moderate',
          interests: ['culture', 'food', 'art'],
          accommodationPreference: 'hotel'
        }
      };
      const prefs2 = {
        travelPreferences: {
          budget: 'moderate',
          pace: 'fast',
          interests: ['food', 'shopping', 'art'],
          accommodationPreference: 'flexible'
        }
      };

      const score = MatchService.calculateMatchScore(prefs1, prefs2);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    test('should handle missing preferences gracefully', () => {
      const prefs1 = {
        travelPreferences: {
          budget: 'moderate'
        }
      };
      const prefs2 = {
        travelPreferences: {
          budget: 'moderate',
          interests: ['food', 'shopping']
        }
      };

      const score = MatchService.calculateMatchScore(prefs1, prefs2);
      expect(score).toBe(1); // Only budget matches, and it's the only comparable field
    });
  });

  describe('findMatches', () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    test('should find and sort matches correctly', async () => {
      // Create test users
      const testUsers = [
        {
          name: 'Perfect Match',
          email: 'perfect@example.com',
          password: 'Password123!',
          travelPreferences: {
            budget: 'moderate',
            pace: 'moderate',
            interests: ['culture', 'food', 'art'],
            accommodationPreference: 'hotel'
          }
        },
        {
          name: 'Partial Match',
          email: 'partial@example.com',
          password: 'Password123!',
          travelPreferences: {
            budget: 'moderate',
            pace: 'fast',
            interests: ['food', 'shopping', 'art'],
            accommodationPreference: 'flexible'
          }
        },
        {
          name: 'No Match',
          email: 'nomatch@example.com',
          password: 'Password123!',
          travelPreferences: {
            budget: 'luxury',
            pace: 'fast',
            interests: ['adventure', 'sports'],
            accommodationPreference: 'camping'
          }
        }
      ];

      const createdUsers = await User.create(testUsers);

      const userPreferences = {
        travelPreferences: {
          budget: 'moderate',
          pace: 'moderate',
          interests: ['culture', 'food', 'art'],
          accommodationPreference: 'hotel'
        }
      };

      const matches = await MatchService.findMatches(
        userPreferences,
        new mongoose.Types.ObjectId(),
        10,
        0.3
      );

      expect(matches).toHaveLength(2); // Should only include Perfect Match and Partial Match
      expect(matches[0].name).toBe('Perfect Match'); // First match should be Perfect Match
      expect(matches[0].score).toBe(1); // Perfect match should have score of 1
      expect(matches[1].name).toBe('Partial Match'); // Second match should be Partial Match
      expect(matches[1].score).toBeLessThan(1); // Partial match should have score less than 1
    });

    test('should handle no matches found', async () => {
      const userPreferences = {
        travelPreferences: {
          budget: 'moderate',
          pace: 'moderate',
          interests: ['culture', 'food', 'art'],
          accommodationPreference: 'hotel'
        }
      };

      const matches = await MatchService.findMatches(
        userPreferences,
        new mongoose.Types.ObjectId()
      );

      expect(matches).toHaveLength(0);
    });
  });
});

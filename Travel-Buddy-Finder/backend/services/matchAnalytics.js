const mongoose = require('mongoose');
const redis = require('redis');
const { promisify } = require('util');
const EnhancedMatch = require('../models/enhancedMatch');

class MatchAnalytics {
    constructor() {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.incrAsync = promisify(this.redisClient.incr).bind(this.redisClient);
        this.zaddAsync = promisify(this.redisClient.zadd).bind(this.redisClient);
        this.zrangeAsync = promisify(this.redisClient.zrange).bind(this.redisClient);
    }

    // Track match creation and quality
    async trackMatch(match, user1, user2) {
        try {
            const timestamp = Date.now();
            const matchData = {
                matchId: match._id,
                score: match.matchScore,
                compatibilityScores: match.compatibilityScores,
                timestamp,
                users: [user1._id, user2._id],
                metadata: match.metadata
            };

            // Store match analytics in Redis for real-time access
            await this.setAsync(
                `match:analytics:${match._id}`,
                JSON.stringify(matchData),
                'EX',
                86400 // 24 hours
            );

            // Track match score distribution
            await this.zaddAsync(
                'match:scores:distribution',
                match.matchScore,
                match._id.toString()
            );

            // Update match quality metrics
            await this.updateMatchQualityMetrics(match);

            // Track user-specific metrics
            await Promise.all([
                this.trackUserMatchMetrics(user1._id, match),
                this.trackUserMatchMetrics(user2._id, match)
            ]);

            return true;
        } catch (error) {
            console.error('Error tracking match analytics:', error);
            return false;
        }
    }

    // Track user interaction with matches
    async trackInteraction(userId, matchId, interactionType, data = {}) {
        try {
            const timestamp = Date.now();
            const interactionData = {
                userId,
                matchId,
                type: interactionType,
                timestamp,
                ...data
            };

            // Store interaction in Redis
            await this.setAsync(
                `interaction:${userId}:${matchId}:${timestamp}`,
                JSON.stringify(interactionData),
                'EX',
                604800 // 7 days
            );

            // Update interaction counters
            await this.incrAsync(`interactions:${interactionType}:count`);
            await this.incrAsync(`user:${userId}:${interactionType}:count`);

            // Track interaction timing
            if (data.responseTime) {
                await this.zaddAsync(
                    'interaction:response:times',
                    data.responseTime,
                    `${userId}:${matchId}:${timestamp}`
                );
            }

            return true;
        } catch (error) {
            console.error('Error tracking interaction:', error);
            return false;
        }
    }

    // Track match quality metrics
    async updateMatchQualityMetrics(match) {
        try {
            const metricsKey = 'match:quality:metrics';
            const currentMetrics = JSON.parse(await this.getAsync(metricsKey) || '{}');

            // Update score distribution
            const scoreRange = Math.floor(match.matchScore / 10) * 10;
            currentMetrics.scoreDistribution = currentMetrics.scoreDistribution || {};
            currentMetrics.scoreDistribution[scoreRange] = (currentMetrics.scoreDistribution[scoreRange] || 0) + 1;

            // Update compatibility metrics
            Object.entries(match.compatibilityScores).forEach(([key, value]) => {
                if (!currentMetrics.compatibilityAverages) {
                    currentMetrics.compatibilityAverages = {};
                }
                if (!currentMetrics.compatibilityAverages[key]) {
                    currentMetrics.compatibilityAverages[key] = { sum: 0, count: 0 };
                }
                currentMetrics.compatibilityAverages[key].sum += value;
                currentMetrics.compatibilityAverages[key].count += 1;
            });

            // Store updated metrics
            await this.setAsync(metricsKey, JSON.stringify(currentMetrics));

            return true;
        } catch (error) {
            console.error('Error updating match quality metrics:', error);
            return false;
        }
    }

    // Track user-specific match metrics
    async trackUserMatchMetrics(userId, match) {
        try {
            const userMetricsKey = `user:${userId}:match:metrics`;
            const currentMetrics = JSON.parse(await this.getAsync(userMetricsKey) || '{}');

            // Update user's match history
            currentMetrics.matchCount = (currentMetrics.matchCount || 0) + 1;
            currentMetrics.averageScore = (
                (currentMetrics.averageScore || 0) * (currentMetrics.matchCount - 1) +
                match.matchScore
            ) / currentMetrics.matchCount;

            // Track personality type matches
            if (match.compatibilityScores.personality) {
                currentMetrics.personalityScores = currentMetrics.personalityScores || [];
                currentMetrics.personalityScores.push(match.compatibilityScores.personality);
            }

            // Store updated metrics
            await this.setAsync(userMetricsKey, JSON.stringify(currentMetrics));

            return true;
        } catch (error) {
            console.error('Error tracking user match metrics:', error);
            return false;
        }
    }

    // Get match quality report
    async getMatchQualityReport(timeRange = '24h') {
        try {
            const metrics = JSON.parse(await this.getAsync('match:quality:metrics') || '{}');
            const scoreDistribution = await this.zrangeAsync('match:scores:distribution', 0, -1, 'WITHSCORES');
            
            // Calculate average scores
            const compatibilityAverages = {};
            Object.entries(metrics.compatibilityAverages || {}).forEach(([key, data]) => {
                compatibilityAverages[key] = data.sum / data.count;
            });

            return {
                scoreDistribution: metrics.scoreDistribution || {},
                averageScores: compatibilityAverages,
                matchCount: metrics.matchCount || 0,
                timeRange,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error generating match quality report:', error);
            return null;
        }
    }

    // Get user match analytics
    async getUserMatchAnalytics(userId) {
        try {
            const userMetrics = JSON.parse(
                await this.getAsync(`user:${userId}:match:metrics`) || '{}'
            );

            const interactionCounts = {
                likes: parseInt(await this.getAsync(`user:${userId}:like:count`) || '0'),
                dislikes: parseInt(await this.getAsync(`user:${userId}:dislike:count`) || '0'),
                messages: parseInt(await this.getAsync(`user:${userId}:message:count`) || '0')
            };

            return {
                matchCount: userMetrics.matchCount || 0,
                averageScore: userMetrics.averageScore || 0,
                personalityScores: userMetrics.personalityScores || [],
                interactions: interactionCounts,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error getting user match analytics:', error);
            return null;
        }
    }

    // Get system-wide analytics
    async getSystemAnalytics() {
        try {
            const [
                matchQuality,
                interactionCounts,
                responseTimes
            ] = await Promise.all([
                this.getMatchQualityReport(),
                this.getInteractionCounts(),
                this.getResponseTimes()
            ]);

            return {
                matchQuality,
                interactions: interactionCounts,
                responseTimes,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error getting system analytics:', error);
            return null;
        }
    }

    // Helper method to get interaction counts
    async getInteractionCounts() {
        try {
            const types = ['like', 'dislike', 'message', 'match'];
            const counts = await Promise.all(
                types.map(type => 
                    this.getAsync(`interactions:${type}:count`)
                        .then(count => ({ [type]: parseInt(count) || 0 }))
                )
            );

            return Object.assign({}, ...counts);
        } catch (error) {
            console.error('Error getting interaction counts:', error);
            return {};
        }
    }

    // Helper method to get response times
    async getResponseTimes() {
        try {
            const times = await this.zrangeAsync('interaction:response:times', 0, -1, 'WITHSCORES');
            const values = times.filter((_, i) => i % 2 === 1).map(Number);
            
            return {
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length
            };
        } catch (error) {
            console.error('Error getting response times:', error);
            return null;
        }
    }
}

module.exports = new MatchAnalytics();

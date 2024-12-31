const BaseAnalyticsService = require('./base/BaseAnalyticsService');
const EnhancedMatch = require('../models/enhancedMatch');

class MatchAnalytics extends BaseAnalyticsService {
    constructor() {
        super({
            retentionPeriod: 86400 // 24 hours
        });
    }

    async trackMatch(match, user1, user2) {
        try {
            const matchData = {
                matchId: match._id,
                score: match.matchScore,
                compatibilityScores: match.compatibilityScores,
                users: [user1._id, user2._id],
                metadata: match.metadata
            };

            // Store match analytics
            await this.storeMetric(`match:analytics:${match._id}`, matchData);

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
            await this.logAlert('Match', 'Error tracking match analytics', error);
            return false;
        }
    }

    async trackInteraction(userId, matchId, interactionType, data = {}) {
        try {
            const interactionData = {
                userId,
                matchId,
                type: interactionType,
                ...data
            };

            // Store interaction
            await this.storeMetric(`interaction:${userId}:${matchId}`, interactionData, 604800); // 7 days

            // Update interaction counters
            await this.incrByAsync(`interactions:${interactionType}:count`, 1);
            await this.incrByAsync(`user:${userId}:${interactionType}:count`, 1);

            // Track interaction timing
            if (data.responseTime) {
                await this.zaddAsync(
                    'interaction:response:times',
                    data.responseTime,
                    `${userId}:${matchId}:${Date.now()}`
                );
            }

            return true;
        } catch (error) {
            await this.logAlert('Interaction', 'Error tracking interaction', error);
            return false;
        }
    }

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

            await this.setAsync(metricsKey, JSON.stringify(currentMetrics));
            return true;
        } catch (error) {
            await this.logAlert('MatchQuality', 'Error updating match quality metrics', error);
            return false;
        }
    }

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

            await this.setAsync(userMetricsKey, JSON.stringify(currentMetrics));
            return true;
        } catch (error) {
            await this.logAlert('UserMetrics', 'Error tracking user match metrics', error);
            return false;
        }
    }

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
            await this.logAlert('Report', 'Error generating match quality report', error);
            return null;
        }
    }

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
            await this.logAlert('UserAnalytics', 'Error getting user match analytics', error);
            return null;
        }
    }

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
            await this.logAlert('SystemAnalytics', 'Error getting system analytics', error);
            return null;
        }
    }

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

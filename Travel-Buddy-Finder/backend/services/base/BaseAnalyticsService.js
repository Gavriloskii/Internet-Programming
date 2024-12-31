const redis = require('redis');
const { promisify } = require('util');

class BaseAnalyticsService {
    constructor(options = {}) {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.incrByAsync = promisify(this.redisClient.incrby).bind(this.redisClient);
        this.zaddAsync = promisify(this.redisClient.zadd).bind(this.redisClient);
        this.zrangeAsync = promisify(this.redisClient.zrange).bind(this.redisClient);
        
        this.metrics = new Map();
        this.retentionPeriod = options.retentionPeriod || 86400; // 24 hours default
    }

    async storeMetric(key, data, expiration = this.retentionPeriod) {
        try {
            await this.setAsync(
                `${key}:${Date.now()}`,
                JSON.stringify({
                    ...data,
                    timestamp: Date.now()
                }),
                'EX',
                expiration
            );
            return true;
        } catch (error) {
            console.error(`Error storing metric ${key}:`, error);
            return false;
        }
    }

    async getMetricsInRange(prefix, startTime, endTime) {
        try {
            const keys = await this.redisClient.keys(`${prefix}:*`);
            const metrics = [];

            for (const key of keys) {
                const timestamp = parseInt(key.split(':')[1]);
                if (timestamp >= startTime && timestamp <= endTime) {
                    const data = JSON.parse(await this.getAsync(key));
                    metrics.push(data);
                }
            }

            return metrics;
        } catch (error) {
            console.error(`Error getting metrics for ${prefix}:`, error);
            return [];
        }
    }

    aggregateMetrics(metrics) {
        if (!metrics.length) return null;

        const aggregated = {
            min: Infinity,
            max: -Infinity,
            avg: 0,
            count: metrics.length,
            latest: metrics[metrics.length - 1]
        };

        let sum = 0;
        metrics.forEach(metric => {
            const value = metric.duration || metric.value || 0;
            sum += value;
            aggregated.min = Math.min(aggregated.min, value);
            aggregated.max = Math.max(aggregated.max, value);
        });

        aggregated.avg = sum / metrics.length;
        return aggregated;
    }

    async cleanupOldMetrics(prefixes, threshold = Date.now() - 604800000) { // 7 days default
        try {
            for (const prefix of prefixes) {
                const keys = await this.redisClient.keys(`${prefix}:*`);
                for (const key of keys) {
                    const timestamp = parseInt(key.split(':')[1]);
                    if (timestamp < threshold) {
                        await this.redisClient.del(key);
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Error cleaning up old metrics:', error);
            return false;
        }
    }

    getTimeRangeInMs(timeRange) {
        const units = {
            h: 3600000,    // 1 hour
            d: 86400000,   // 1 day
            w: 604800000   // 1 week
        };

        const value = parseInt(timeRange);
        const unit = timeRange.slice(-1);
        return value * (units[unit] || units.h);
    }

    async logAlert(type, message, data) {
        const alert = {
            type,
            message,
            data,
            timestamp: Date.now()
        };

        console.warn(`${type} Alert:`, alert);

        await this.storeMetric('alert', alert, 604800); // Store alerts for 7 days

        // Emit alert for real-time monitoring if socket.io is available
        if (global.io) {
            global.io.emit(`${type.toLowerCase()}Alert`, alert);
        }

        return alert;
    }
}

module.exports = BaseAnalyticsService;

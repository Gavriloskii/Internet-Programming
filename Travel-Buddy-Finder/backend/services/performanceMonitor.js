const redis = require('redis');
const { promisify } = require('util');
const mongoose = require('mongoose');
const os = require('os');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
    constructor() {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.incrByAsync = promisify(this.redisClient.incrby).bind(this.redisClient);
        this.metrics = new Map();
        this.thresholds = {
            matchCalculationTime: 100, // ms
            apiResponseTime: 200,      // ms
            cacheHitRate: 0.8,        // 80%
            memoryUsage: 0.85,        // 85%
            cpuUsage: 0.75            // 75%
        };
        this.initializeMetrics();
    }

    async initializeMetrics() {
        // Initialize base metrics
        this.metrics.set('matchCalculations', 0);
        this.metrics.set('cacheHits', 0);
        this.metrics.set('cacheMisses', 0);
        this.metrics.set('apiRequests', 0);
        this.metrics.set('errors', 0);

        // Start periodic monitoring
        this.startPeriodicMonitoring();
    }

    startPeriodicMonitoring() {
        // Monitor system metrics every minute
        setInterval(() => {
            this.monitorSystemResources();
        }, 60000);

        // Monitor database metrics every 5 minutes
        setInterval(() => {
            this.monitorDatabaseMetrics();
        }, 300000);

        // Monitor cache metrics every minute
        setInterval(() => {
            this.monitorCacheMetrics();
        }, 60000);
    }

    // Track match calculation performance
    async trackMatchCalculation(startTime, endTime, matchData) {
        const duration = endTime - startTime;
        await this.incrByAsync('total_match_calculations', 1);
        await this.setAsync(`match_calc_time:${Date.now()}`, duration);

        // Store detailed metrics
        const metrics = {
            duration,
            matchScore: matchData.matchScore,
            userCount: matchData.users.length,
            timestamp: Date.now()
        };

        await this.setAsync(
            `match_metrics:${matchData._id}`,
            JSON.stringify(metrics),
            'EX',
            86400 // Store for 24 hours
        );

        // Alert if calculation time exceeds threshold
        if (duration > this.thresholds.matchCalculationTime) {
            this.logPerformanceAlert('Match calculation time exceeded threshold', {
                duration,
                matchId: matchData._id,
                threshold: this.thresholds.matchCalculationTime
            });
        }

        return metrics;
    }

    // Monitor system resources
    async monitorSystemResources() {
        const metrics = {
            cpu: os.loadavg()[0] / os.cpus().length,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: Date.now()
        };

        await this.setAsync(
            `system_metrics:${Date.now()}`,
            JSON.stringify(metrics),
            'EX',
            86400
        );

        // Check resource thresholds
        if (metrics.cpu > this.thresholds.cpuUsage) {
            this.logPerformanceAlert('High CPU usage detected', {
                cpu: metrics.cpu,
                threshold: this.thresholds.cpuUsage
            });
        }

        const memoryUsage = metrics.memory.heapUsed / metrics.memory.heapTotal;
        if (memoryUsage > this.thresholds.memoryUsage) {
            this.logPerformanceAlert('High memory usage detected', {
                memory: memoryUsage,
                threshold: this.thresholds.memoryUsage
            });
        }

        return metrics;
    }

    // Monitor database performance
    async monitorDatabaseMetrics() {
        const metrics = {
            connections: mongoose.connection.base.connections.length,
            collections: Object.keys(mongoose.connection.collections).length,
            modelCount: Object.keys(mongoose.models).length,
            timestamp: Date.now()
        };

        // Get MongoDB server status
        const status = await mongoose.connection.db.admin().serverStatus();
        metrics.operations = status.opcounters;
        metrics.connections = status.connections;
        metrics.network = status.network;

        await this.setAsync(
            `db_metrics:${Date.now()}`,
            JSON.stringify(metrics),
            'EX',
            86400
        );

        return metrics;
    }

    // Monitor cache performance
    async monitorCacheMetrics() {
        const hits = parseInt(await this.getAsync('cache_hits') || '0');
        const misses = parseInt(await this.getAsync('cache_misses') || '0');
        const total = hits + misses;

        const metrics = {
            hits,
            misses,
            hitRate: total > 0 ? hits / total : 0,
            timestamp: Date.now()
        };

        if (total > 0 && metrics.hitRate < this.thresholds.cacheHitRate) {
            this.logPerformanceAlert('Low cache hit rate detected', {
                hitRate: metrics.hitRate,
                threshold: this.thresholds.cacheHitRate
            });
        }

        await this.setAsync(
            `cache_metrics:${Date.now()}`,
            JSON.stringify(metrics),
            'EX',
            86400
        );

        return metrics;
    }

    // Track API response times
    async trackApiRequest(method, path, startTime, endTime, status) {
        const duration = endTime - startTime;
        const metrics = {
            method,
            path,
            duration,
            status,
            timestamp: Date.now()
        };

        await this.setAsync(
            `api_request:${Date.now()}`,
            JSON.stringify(metrics),
            'EX',
            86400
        );

        if (duration > this.thresholds.apiResponseTime) {
            this.logPerformanceAlert('Slow API response detected', {
                duration,
                path,
                threshold: this.thresholds.apiResponseTime
            });
        }

        return metrics;
    }

    // Log performance alerts
    async logPerformanceAlert(message, data) {
        const alert = {
            message,
            data,
            timestamp: Date.now()
        };

        console.warn('Performance Alert:', alert);

        await this.setAsync(
            `performance_alert:${Date.now()}`,
            JSON.stringify(alert),
            'EX',
            604800 // Store for 7 days
        );

        // Emit alert for real-time monitoring
        if (global.io) {
            global.io.emit('performanceAlert', alert);
        }
    }

    // Get performance report
    async getPerformanceReport(timeRange = '24h') {
        const endTime = Date.now();
        const startTime = endTime - this.getTimeRangeInMs(timeRange);

        const [
            systemMetrics,
            dbMetrics,
            cacheMetrics,
            matchMetrics,
            apiMetrics,
            alerts
        ] = await Promise.all([
            this.getMetricsInRange('system_metrics', startTime, endTime),
            this.getMetricsInRange('db_metrics', startTime, endTime),
            this.getMetricsInRange('cache_metrics', startTime, endTime),
            this.getMetricsInRange('match_metrics', startTime, endTime),
            this.getMetricsInRange('api_request', startTime, endTime),
            this.getMetricsInRange('performance_alert', startTime, endTime)
        ]);

        return {
            timeRange,
            systemMetrics: this.aggregateMetrics(systemMetrics),
            dbMetrics: this.aggregateMetrics(dbMetrics),
            cacheMetrics: this.aggregateMetrics(cacheMetrics),
            matchMetrics: this.aggregateMetrics(matchMetrics),
            apiMetrics: this.aggregateMetrics(apiMetrics),
            alerts,
            timestamp: Date.now()
        };
    }

    // Helper method to get metrics within time range
    async getMetricsInRange(prefix, startTime, endTime) {
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
    }

    // Helper method to aggregate metrics
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
            const value = metric.duration || metric.cpu || metric.hitRate || 0;
            sum += value;
            aggregated.min = Math.min(aggregated.min, value);
            aggregated.max = Math.max(aggregated.max, value);
        });

        aggregated.avg = sum / metrics.length;
        return aggregated;
    }

    // Helper method to convert time range to milliseconds
    getTimeRangeInMs(timeRange) {
        const units = {
            h: 3600000,
            d: 86400000,
            w: 604800000
        };

        const value = parseInt(timeRange);
        const unit = timeRange.slice(-1);
        return value * (units[unit] || units.h);
    }

    // Update monitoring thresholds
    updateThresholds(newThresholds) {
        this.thresholds = {
            ...this.thresholds,
            ...newThresholds
        };
    }

    // Clean up old metrics
    async cleanupOldMetrics() {
        const prefixes = [
            'system_metrics',
            'db_metrics',
            'cache_metrics',
            'match_metrics',
            'api_request'
        ];

        for (const prefix of prefixes) {
            const keys = await this.redisClient.keys(`${prefix}:*`);
            const threshold = Date.now() - 604800000; // 7 days

            for (const key of keys) {
                const timestamp = parseInt(key.split(':')[1]);
                if (timestamp < threshold) {
                    await this.redisClient.del(key);
                }
            }
        }
    }
}

module.exports = new PerformanceMonitor();

const BaseAnalyticsService = require('./base/BaseAnalyticsService');
const os = require('os');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

class PerformanceMonitor extends BaseAnalyticsService {
    constructor() {
        super({
            retentionPeriod: 86400 // 24 hours
        });
        
        this.thresholds = {
            matchCalculationTime: 100, // ms
            apiResponseTime: 200,      // ms
            cacheHitRate: 0.8,        // 80%
            memoryUsage: 0.85,        // 85%
            cpuUsage: 0.75            // 75%
        };

        this.initializeMonitoring();
    }

    initializeMonitoring() {
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

    async trackMatchCalculation(startTime, endTime, matchData) {
        const duration = endTime - startTime;
        const metrics = {
            duration,
            matchScore: matchData.matchScore,
            userCount: matchData.users.length,
            value: duration // for base class aggregation
        };

        await this.storeMetric(`match_calc:${matchData._id}`, metrics);

        if (duration > this.thresholds.matchCalculationTime) {
            await this.logAlert('Performance', 'Match calculation time exceeded threshold', {
                duration,
                matchId: matchData._id,
                threshold: this.thresholds.matchCalculationTime
            });
        }

        return metrics;
    }

    async monitorSystemResources() {
        const metrics = {
            cpu: os.loadavg()[0] / os.cpus().length,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            value: os.loadavg()[0] / os.cpus().length // for base class aggregation
        };

        await this.storeMetric('system_metrics', metrics);

        // Check resource thresholds
        if (metrics.cpu > this.thresholds.cpuUsage) {
            await this.logAlert('System', 'High CPU usage detected', {
                cpu: metrics.cpu,
                threshold: this.thresholds.cpuUsage
            });
        }

        const memoryUsage = metrics.memory.heapUsed / metrics.memory.heapTotal;
        if (memoryUsage > this.thresholds.memoryUsage) {
            await this.logAlert('System', 'High memory usage detected', {
                memory: memoryUsage,
                threshold: this.thresholds.memoryUsage
            });
        }

        return metrics;
    }

    async monitorDatabaseMetrics() {
        try {
            const status = await mongoose.connection.db.admin().serverStatus();
            const metrics = {
                operations: status.opcounters,
                connections: status.connections,
                network: status.network,
                value: status.connections.current // for base class aggregation
            };

            await this.storeMetric('db_metrics', metrics);
            return metrics;
        } catch (error) {
            await this.logAlert('Database', 'Error monitoring database metrics', error);
            return null;
        }
    }

    async monitorCacheMetrics() {
        try {
            const hits = parseInt(await this.getAsync('cache_hits') || '0');
            const misses = parseInt(await this.getAsync('cache_misses') || '0');
            const total = hits + misses;
            const hitRate = total > 0 ? hits / total : 0;

            const metrics = {
                hits,
                misses,
                hitRate,
                value: hitRate // for base class aggregation
            };

            await this.storeMetric('cache_metrics', metrics);

            if (total > 0 && hitRate < this.thresholds.cacheHitRate) {
                await this.logAlert('Cache', 'Low cache hit rate detected', {
                    hitRate,
                    threshold: this.thresholds.cacheHitRate
                });
            }

            return metrics;
        } catch (error) {
            await this.logAlert('Cache', 'Error monitoring cache metrics', error);
            return null;
        }
    }

    async trackApiRequest(method, path, startTime, endTime, status) {
        const duration = endTime - startTime;
        const metrics = {
            method,
            path,
            duration,
            status,
            value: duration // for base class aggregation
        };

        await this.storeMetric('api_request', metrics);

        if (duration > this.thresholds.apiResponseTime) {
            await this.logAlert('API', 'Slow API response detected', {
                duration,
                path,
                threshold: this.thresholds.apiResponseTime
            });
        }

        return metrics;
    }

    async getPerformanceReport(timeRange = '24h') {
        const endTime = Date.now();
        const startTime = endTime - this.getTimeRangeInMs(timeRange);

        try {
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
                this.getMetricsInRange('match_calc', startTime, endTime),
                this.getMetricsInRange('api_request', startTime, endTime),
                this.getMetricsInRange('alert', startTime, endTime)
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
        } catch (error) {
            await this.logAlert('Report', 'Error generating performance report', error);
            return null;
        }
    }

    updateThresholds(newThresholds) {
        this.thresholds = {
            ...this.thresholds,
            ...newThresholds
        };
    }
}

module.exports = new PerformanceMonitor();

const tf = require('@tensorflow/tfjs-node');
const redis = require('redis');
const { promisify } = require('util');
const performanceMonitor = require('./performanceMonitor');

class AnomalyDetector {
    constructor() {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.baselineStats = null;
        this.anomalyThresholds = {
            cpu: { low: 0.2, high: 0.8, zscore: 2.5 },
            memory: { low: 0.3, high: 0.85, zscore: 2.5 },
            cache: { low: 0.5, high: 0.95, zscore: 2.5 },
            api: { low: 50, high: 200, zscore: 2.5 }
        };
        this.historicalWindow = 24 * 60 * 60 * 1000; // 24 hours
    }

    async initialize() {
        try {
            // Load baseline statistics from cache
            const cachedStats = await this.getAsync('anomaly_baseline_stats');
            if (cachedStats) {
                this.baselineStats = JSON.parse(cachedStats);
            } else {
                // Calculate initial baseline if not cached
                await this.calculateBaseline();
            }
        } catch (error) {
            console.error('Error initializing anomaly detector:', error);
            throw error;
        }
    }

    async calculateBaseline() {
        try {
            // Get historical performance data
            const endTime = Date.now();
            const startTime = endTime - this.historicalWindow;
            const historicalData = await performanceMonitor.getPerformanceReport(startTime, endTime);

            // Calculate baseline statistics
            this.baselineStats = {
                cpu: this.calculateMetricStats(historicalData.systemMetrics.map(m => m.cpu)),
                memory: this.calculateMetricStats(historicalData.systemMetrics.map(m => 
                    m.memory.heapUsed / m.memory.heapTotal
                )),
                cache: this.calculateMetricStats(historicalData.cacheMetrics.map(m => m.hitRate)),
                api: this.calculateMetricStats(historicalData.apiMetrics.map(m => m.duration))
            };

            // Cache the baseline stats
            await this.setAsync(
                'anomaly_baseline_stats',
                JSON.stringify(this.baselineStats),
                'EX',
                3600 // Cache for 1 hour
            );

            return this.baselineStats;
        } catch (error) {
            console.error('Error calculating baseline:', error);
            throw error;
        }
    }

    calculateMetricStats(values) {
        const n = values.length;
        if (n === 0) return { mean: 0, std: 0, median: 0 };

        // Calculate mean
        const mean = values.reduce((a, b) => a + b, 0) / n;

        // Calculate standard deviation
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(variance);

        // Calculate median
        const sorted = [...values].sort((a, b) => a - b);
        const median = n % 2 === 0
            ? (sorted[n/2 - 1] + sorted[n/2]) / 2
            : sorted[Math.floor(n/2)];

        return { mean, std, median };
    }

    async detectAnomalies(currentMetrics) {
        if (!this.baselineStats) {
            await this.initialize();
        }

        const anomalies = [];

        // Check CPU usage
        const cpuAnomaly = this.checkMetricAnomaly(
            'cpu',
            currentMetrics.cpu,
            this.baselineStats.cpu,
            this.anomalyThresholds.cpu
        );
        if (cpuAnomaly) anomalies.push(cpuAnomaly);

        // Check Memory usage
        const memoryUsage = currentMetrics.memory.heapUsed / currentMetrics.memory.heapTotal;
        const memoryAnomaly = this.checkMetricAnomaly(
            'memory',
            memoryUsage,
            this.baselineStats.memory,
            this.anomalyThresholds.memory
        );
        if (memoryAnomaly) anomalies.push(memoryAnomaly);

        // Check Cache performance
        const cacheAnomaly = this.checkMetricAnomaly(
            'cache',
            currentMetrics.cacheHitRate,
            this.baselineStats.cache,
            this.anomalyThresholds.cache
        );
        if (cacheAnomaly) anomalies.push(cacheAnomaly);

        // Check API performance
        const apiAnomaly = this.checkMetricAnomaly(
            'api',
            currentMetrics.apiResponseTime,
            this.baselineStats.api,
            this.anomalyThresholds.api
        );
        if (apiAnomaly) anomalies.push(apiAnomaly);

        return anomalies;
    }

    checkMetricAnomaly(metricName, currentValue, baselineStats, thresholds) {
        // Calculate z-score
        const zscore = Math.abs((currentValue - baselineStats.mean) / baselineStats.std);

        // Check for anomalies based on absolute thresholds and z-score
        const isAnomaly = 
            currentValue < thresholds.low ||
            currentValue > thresholds.high ||
            zscore > thresholds.zscore;

        if (isAnomaly) {
            return {
                metric: metricName,
                value: currentValue,
                baseline: baselineStats.mean,
                zscore,
                severity: this.calculateSeverity(zscore),
                type: currentValue > thresholds.high ? 'high' : 'low',
                timestamp: Date.now()
            };
        }

        return null;
    }

    calculateSeverity(zscore) {
        if (zscore > 4) return 'critical';
        if (zscore > 3) return 'high';
        if (zscore > 2) return 'medium';
        return 'low';
    }

    async updateThresholds(newThresholds) {
        this.anomalyThresholds = {
            ...this.anomalyThresholds,
            ...newThresholds
        };

        // Recalculate baseline with new thresholds
        await this.calculateBaseline();
    }

    async getAnomalyHistory(startTime, endTime) {
        try {
            const anomalyKeys = await this.redisClient.keys('anomaly:*');
            const anomalies = [];

            for (const key of anomalyKeys) {
                const anomaly = JSON.parse(await this.getAsync(key));
                if (anomaly.timestamp >= startTime && anomaly.timestamp <= endTime) {
                    anomalies.push(anomaly);
                }
            }

            return anomalies.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error getting anomaly history:', error);
            throw error;
        }
    }

    async logAnomaly(anomaly) {
        try {
            const key = `anomaly:${anomaly.metric}:${anomaly.timestamp}`;
            await this.setAsync(
                key,
                JSON.stringify(anomaly),
                'EX',
                7 * 24 * 60 * 60 // Store for 7 days
            );

            // Emit anomaly event if socket.io is available
            if (global.io) {
                global.io.emit('anomalyDetected', anomaly);
            }
        } catch (error) {
            console.error('Error logging anomaly:', error);
            throw error;
        }
    }

    getAnomalyDescription(anomaly) {
        const descriptions = {
            cpu: {
                high: 'CPU usage is abnormally high',
                low: 'CPU usage is unusually low'
            },
            memory: {
                high: 'Memory usage is approaching capacity',
                low: 'Memory usage is unusually low'
            },
            cache: {
                high: 'Cache hit rate is unusually high',
                low: 'Cache hit rate has dropped significantly'
            },
            api: {
                high: 'API response times are abnormally high',
                low: 'API response times are unusually low'
            }
        };

        return {
            title: descriptions[anomaly.metric][anomaly.type],
            description: `Current value: ${anomaly.value.toFixed(2)}, Baseline: ${anomaly.baseline.toFixed(2)}`,
            severity: anomaly.severity,
            recommendation: this.getAnomalyRecommendation(anomaly)
        };
    }

    getAnomalyRecommendation(anomaly) {
        const recommendations = {
            cpu: {
                high: [
                    'Consider scaling horizontally',
                    'Optimize resource-intensive operations',
                    'Implement request throttling'
                ],
                low: [
                    'Consider scaling down resources',
                    'Check for service availability'
                ]
            },
            memory: {
                high: [
                    'Implement memory caching',
                    'Check for memory leaks',
                    'Increase available memory'
                ],
                low: [
                    'Optimize memory allocation',
                    'Check for service issues'
                ]
            },
            cache: {
                high: [
                    'Review cache invalidation strategy',
                    'Optimize cache storage'
                ],
                low: [
                    'Review cache strategy',
                    'Implement cache warming',
                    'Check cache configuration'
                ]
            },
            api: {
                high: [
                    'Implement API response caching',
                    'Optimize database queries',
                    'Consider rate limiting'
                ],
                low: [
                    'Check for service health',
                    'Review monitoring configuration'
                ]
            }
        };

        return recommendations[anomaly.metric][anomaly.type];
    }
}

module.exports = new AnomalyDetector();

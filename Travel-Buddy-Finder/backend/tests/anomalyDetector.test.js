const redis = require('redis-mock');
const anomalyDetector = require('../services/anomalyDetector');
const performanceMonitor = require('../services/performanceMonitor');

// Mock redis
jest.mock('redis', () => require('redis-mock'));

// Mock performance monitor
jest.mock('../services/performanceMonitor', () => ({
    getPerformanceReport: jest.fn()
}));

describe('AnomalyDetector', () => {
    beforeEach(async () => {
        // Reset detector state
        await anomalyDetector.initialize();
        
        // Mock historical data
        performanceMonitor.getPerformanceReport.mockResolvedValue({
            systemMetrics: [
                { 
                    cpu: 0.5,
                    memory: { heapUsed: 500, heapTotal: 1000 }
                },
                {
                    cpu: 0.55,
                    memory: { heapUsed: 550, heapTotal: 1000 }
                }
            ],
            cacheMetrics: [
                { hitRate: 0.8 },
                { hitRate: 0.75 }
            ],
            apiMetrics: [
                { duration: 100 },
                { duration: 120 }
            ]
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('initializes with baseline statistics', async () => {
            expect(anomalyDetector.baselineStats).toBeTruthy();
            expect(anomalyDetector.baselineStats).toHaveProperty('cpu');
            expect(anomalyDetector.baselineStats).toHaveProperty('memory');
            expect(anomalyDetector.baselineStats).toHaveProperty('cache');
            expect(anomalyDetector.baselineStats).toHaveProperty('api');
        });

        test('loads cached baseline if available', async () => {
            const cachedStats = {
                cpu: { mean: 0.5, std: 0.1, median: 0.5 },
                memory: { mean: 0.5, std: 0.1, median: 0.5 },
                cache: { mean: 0.8, std: 0.1, median: 0.8 },
                api: { mean: 100, std: 20, median: 100 }
            };

            await anomalyDetector.redisClient.set(
                'anomaly_baseline_stats',
                JSON.stringify(cachedStats)
            );

            await anomalyDetector.initialize();
            expect(anomalyDetector.baselineStats).toEqual(cachedStats);
        });
    });

    describe('Anomaly Detection', () => {
        test('detects high CPU usage anomaly', async () => {
            const metrics = {
                cpu: 0.95, // Very high CPU
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100
            };

            const anomalies = await anomalyDetector.detectAnomalies(metrics);
            const cpuAnomaly = anomalies.find(a => a.metric === 'cpu');

            expect(cpuAnomaly).toBeTruthy();
            expect(cpuAnomaly.type).toBe('high');
            expect(cpuAnomaly.severity).toBe('critical');
        });

        test('detects low cache hit rate anomaly', async () => {
            const metrics = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.3, // Very low cache hit rate
                apiResponseTime: 100
            };

            const anomalies = await anomalyDetector.detectAnomalies(metrics);
            const cacheAnomaly = anomalies.find(a => a.metric === 'cache');

            expect(cacheAnomaly).toBeTruthy();
            expect(cacheAnomaly.type).toBe('low');
        });

        test('detects multiple anomalies simultaneously', async () => {
            const metrics = {
                cpu: 0.9,
                memory: { heapUsed: 900, heapTotal: 1000 },
                cacheHitRate: 0.3,
                apiResponseTime: 300
            };

            const anomalies = await anomalyDetector.detectAnomalies(metrics);
            expect(anomalies.length).toBeGreaterThan(1);
        });

        test('handles normal metrics without anomalies', async () => {
            const metrics = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100
            };

            const anomalies = await anomalyDetector.detectAnomalies(metrics);
            expect(anomalies).toHaveLength(0);
        });
    });

    describe('Statistical Calculations', () => {
        test('calculates correct metric statistics', () => {
            const values = [1, 2, 3, 4, 5];
            const stats = anomalyDetector.calculateMetricStats(values);

            expect(stats.mean).toBe(3);
            expect(stats.median).toBe(3);
            expect(stats.std).toBeCloseTo(1.4142, 4);
        });

        test('handles empty value arrays', () => {
            const stats = anomalyDetector.calculateMetricStats([]);
            expect(stats.mean).toBe(0);
            expect(stats.std).toBe(0);
            expect(stats.median).toBe(0);
        });
    });

    describe('Threshold Management', () => {
        test('updates anomaly thresholds', async () => {
            const newThresholds = {
                cpu: { low: 0.1, high: 0.9, zscore: 3 }
            };

            await anomalyDetector.updateThresholds(newThresholds);
            expect(anomalyDetector.anomalyThresholds.cpu).toEqual(newThresholds.cpu);
        });

        test('recalculates baseline after threshold update', async () => {
            const initialBaseline = { ...anomalyDetector.baselineStats };
            
            await anomalyDetector.updateThresholds({
                cpu: { low: 0.1, high: 0.9, zscore: 3 }
            });

            expect(anomalyDetector.baselineStats).not.toEqual(initialBaseline);
        });
    });

    describe('Anomaly Logging', () => {
        test('logs anomalies with correct format', async () => {
            const anomaly = {
                metric: 'cpu',
                value: 0.95,
                baseline: 0.5,
                zscore: 3.5,
                severity: 'high',
                type: 'high',
                timestamp: Date.now()
            };

            await anomalyDetector.logAnomaly(anomaly);
            
            const key = `anomaly:cpu:${anomaly.timestamp}`;
            const stored = JSON.parse(
                await anomalyDetector.getAsync(key)
            );

            expect(stored).toEqual(anomaly);
        });

        test('emits socket event when anomaly is logged', async () => {
            global.io = { emit: jest.fn() };
            
            const anomaly = {
                metric: 'cpu',
                value: 0.95,
                baseline: 0.5,
                zscore: 3.5,
                severity: 'high',
                type: 'high',
                timestamp: Date.now()
            };

            await anomalyDetector.logAnomaly(anomaly);
            expect(global.io.emit).toHaveBeenCalledWith('anomalyDetected', anomaly);
        });
    });

    describe('Anomaly History', () => {
        test('retrieves anomaly history within time range', async () => {
            const now = Date.now();
            const anomalies = [
                {
                    metric: 'cpu',
                    timestamp: now - 1000,
                    value: 0.9
                },
                {
                    metric: 'memory',
                    timestamp: now - 2000,
                    value: 0.95
                }
            ];

            // Store test anomalies
            for (const anomaly of anomalies) {
                await anomalyDetector.logAnomaly(anomaly);
            }

            const history = await anomalyDetector.getAnomalyHistory(
                now - 3000,
                now
            );

            expect(history).toHaveLength(2);
            expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
        });
    });

    describe('Anomaly Descriptions', () => {
        test('generates appropriate descriptions for anomalies', () => {
            const anomaly = {
                metric: 'cpu',
                value: 0.95,
                baseline: 0.5,
                type: 'high',
                severity: 'critical'
            };

            const description = anomalyDetector.getAnomalyDescription(anomaly);
            
            expect(description).toHaveProperty('title');
            expect(description).toHaveProperty('description');
            expect(description).toHaveProperty('severity', 'critical');
            expect(description).toHaveProperty('recommendation');
            expect(Array.isArray(description.recommendation)).toBe(true);
        });

        test('provides relevant recommendations for each anomaly type', () => {
            const anomalies = [
                { metric: 'cpu', type: 'high', value: 0.9, baseline: 0.5, severity: 'high' },
                { metric: 'memory', type: 'high', value: 0.9, baseline: 0.5, severity: 'high' },
                { metric: 'cache', type: 'low', value: 0.3, baseline: 0.8, severity: 'medium' },
                { metric: 'api', type: 'high', value: 300, baseline: 100, severity: 'high' }
            ];

            anomalies.forEach(anomaly => {
                const description = anomalyDetector.getAnomalyDescription(anomaly);
                expect(description.recommendation.length).toBeGreaterThan(0);
                expect(typeof description.recommendation[0]).toBe('string');
            });
        });
    });
});

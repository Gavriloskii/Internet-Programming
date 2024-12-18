const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const redis = require('redis-mock');
const performanceMonitor = require('../services/performanceMonitor');
const { performance } = require('perf_hooks');

// Mock redis client
jest.mock('redis', () => require('redis-mock'));

// Mock mongoose connection
jest.mock('mongoose', () => ({
    ...jest.requireActual('mongoose'),
    connection: {
        base: {
            connections: []
        },
        collections: {},
        db: {
            admin: () => ({
                serverStatus: () => Promise.resolve({
                    opcounters: { query: 100, insert: 50 },
                    connections: { current: 5 },
                    network: { bytesIn: 1000, bytesOut: 2000 }
                })
            })
        }
    },
    models: {}
}));

// Mock socket.io for alerts
global.io = {
    emit: jest.fn()
};

describe('Performance Monitor', () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        performanceMonitor.redisClient.flushall();
    });

    describe('Match Calculation Monitoring', () => {
        test('tracks match calculation performance', async () => {
            const startTime = performance.now();
            const endTime = startTime + 50;
            const matchData = {
                _id: 'test123',
                matchScore: 85,
                users: ['user1', 'user2']
            };

            const metrics = await performanceMonitor.trackMatchCalculation(
                startTime,
                endTime,
                matchData
            );

            expect(metrics).toHaveProperty('duration');
            expect(metrics.duration).toBe(50);
            expect(metrics.matchScore).toBe(85);
            expect(metrics.userCount).toBe(2);
        });

        test('generates alert for slow match calculations', async () => {
            const startTime = performance.now();
            const endTime = startTime + 150; // Exceeds threshold
            const matchData = {
                _id: 'test123',
                matchScore: 85,
                users: ['user1', 'user2']
            };

            await performanceMonitor.trackMatchCalculation(startTime, endTime, matchData);

            expect(global.io.emit).toHaveBeenCalledWith(
                'performanceAlert',
                expect.objectContaining({
                    message: 'Match calculation time exceeded threshold'
                })
            );
        });
    });

    describe('System Resource Monitoring', () => {
        test('monitors system resources correctly', async () => {
            const metrics = await performanceMonitor.monitorSystemResources();

            expect(metrics).toHaveProperty('cpu');
            expect(metrics).toHaveProperty('memory');
            expect(metrics).toHaveProperty('uptime');
            expect(metrics).toHaveProperty('timestamp');
        });

        test('generates alert for high CPU usage', async () => {
            // Mock high CPU usage
            jest.spyOn(require('os'), 'loadavg').mockReturnValue([8, 6, 4]);
            jest.spyOn(require('os'), 'cpus').mockReturnValue([{}, {}]); // 2 CPUs

            await performanceMonitor.monitorSystemResources();

            expect(global.io.emit).toHaveBeenCalledWith(
                'performanceAlert',
                expect.objectContaining({
                    message: 'High CPU usage detected'
                })
            );
        });
    });

    describe('Database Monitoring', () => {
        test('collects database metrics', async () => {
            const metrics = await performanceMonitor.monitorDatabaseMetrics();

            expect(metrics).toHaveProperty('connections');
            expect(metrics).toHaveProperty('operations');
            expect(metrics).toHaveProperty('network');
            expect(metrics).toHaveProperty('timestamp');
        });
    });

    describe('Cache Monitoring', () => {
        test('tracks cache performance', async () => {
            // Simulate cache hits and misses
            await performanceMonitor.redisClient.set('cache_hits', '80');
            await performanceMonitor.redisClient.set('cache_misses', '20');

            const metrics = await performanceMonitor.monitorCacheMetrics();

            expect(metrics.hits).toBe(80);
            expect(metrics.misses).toBe(20);
            expect(metrics.hitRate).toBe(0.8);
        });

        test('generates alert for low cache hit rate', async () => {
            // Simulate poor cache performance
            await performanceMonitor.redisClient.set('cache_hits', '20');
            await performanceMonitor.redisClient.set('cache_misses', '80');

            await performanceMonitor.monitorCacheMetrics();

            expect(global.io.emit).toHaveBeenCalledWith(
                'performanceAlert',
                expect.objectContaining({
                    message: 'Low cache hit rate detected'
                })
            );
        });
    });

    describe('API Performance Monitoring', () => {
        test('tracks API request performance', async () => {
            const startTime = performance.now();
            const endTime = startTime + 100;

            const metrics = await performanceMonitor.trackApiRequest(
                'GET',
                '/api/matches',
                startTime,
                endTime,
                200
            );

            expect(metrics).toHaveProperty('method', 'GET');
            expect(metrics).toHaveProperty('path', '/api/matches');
            expect(metrics).toHaveProperty('duration', 100);
            expect(metrics).toHaveProperty('status', 200);
        });

        test('generates alert for slow API responses', async () => {
            const startTime = performance.now();
            const endTime = startTime + 300; // Exceeds threshold

            await performanceMonitor.trackApiRequest(
                'GET',
                '/api/matches',
                startTime,
                endTime,
                200
            );

            expect(global.io.emit).toHaveBeenCalledWith(
                'performanceAlert',
                expect.objectContaining({
                    message: 'Slow API response detected'
                })
            );
        });
    });

    describe('Performance Reporting', () => {
        test('generates comprehensive performance report', async () => {
            // Simulate some metrics data
            await performanceMonitor.trackMatchCalculation(
                performance.now(),
                performance.now() + 50,
                { _id: 'test1', matchScore: 85, users: ['user1', 'user2'] }
            );

            await performanceMonitor.monitorSystemResources();
            await performanceMonitor.monitorDatabaseMetrics();
            await performanceMonitor.monitorCacheMetrics();

            const report = await performanceMonitor.getPerformanceReport('1h');

            expect(report).toHaveProperty('timeRange', '1h');
            expect(report).toHaveProperty('systemMetrics');
            expect(report).toHaveProperty('dbMetrics');
            expect(report).toHaveProperty('cacheMetrics');
            expect(report).toHaveProperty('matchMetrics');
            expect(report).toHaveProperty('apiMetrics');
            expect(report).toHaveProperty('alerts');
        });

        test('aggregates metrics correctly', () => {
            const testMetrics = [
                { duration: 100 },
                { duration: 200 },
                { duration: 300 }
            ];

            const aggregated = performanceMonitor.aggregateMetrics(testMetrics);

            expect(aggregated.min).toBe(100);
            expect(aggregated.max).toBe(300);
            expect(aggregated.avg).toBe(200);
            expect(aggregated.count).toBe(3);
        });
    });

    describe('Maintenance Operations', () => {
        test('updates monitoring thresholds', () => {
            const newThresholds = {
                matchCalculationTime: 150,
                apiResponseTime: 250
            };

            performanceMonitor.updateThresholds(newThresholds);

            expect(performanceMonitor.thresholds.matchCalculationTime).toBe(150);
            expect(performanceMonitor.thresholds.apiResponseTime).toBe(250);
        });

        test('cleans up old metrics', async () => {
            const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days old
            const recentTimestamp = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day old

            // Add test metrics
            await performanceMonitor.redisClient.set(
                `system_metrics:${oldTimestamp}`,
                JSON.stringify({ cpu: 0.5 })
            );
            await performanceMonitor.redisClient.set(
                `system_metrics:${recentTimestamp}`,
                JSON.stringify({ cpu: 0.6 })
            );

            await performanceMonitor.cleanupOldMetrics();

            // Check if old metrics were removed
            const oldMetrics = await performanceMonitor.redisClient.get(
                `system_metrics:${oldTimestamp}`
            );
            const recentMetrics = await performanceMonitor.redisClient.get(
                `system_metrics:${recentTimestamp}`
            );

            expect(oldMetrics).toBeNull();
            expect(recentMetrics).not.toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('handles redis errors gracefully', async () => {
            // Mock redis error
            jest.spyOn(performanceMonitor.redisClient, 'set')
                .mockImplementationOnce(() => {
                    throw new Error('Redis connection error');
                });

            const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

            await performanceMonitor.logPerformanceAlert('Test alert', {});

            expect(consoleWarn).toHaveBeenCalled();
            consoleWarn.mockRestore();
        });

        test('handles missing metrics gracefully', async () => {
            const report = await performanceMonitor.getPerformanceReport('1h');

            expect(report.systemMetrics).toBeNull();
            expect(report.dbMetrics).toBeNull();
            expect(report.cacheMetrics).toBeNull();
        });
    });
});

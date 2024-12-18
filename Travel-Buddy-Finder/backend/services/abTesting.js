const redis = require('redis');
const { promisify } = require('util');
const mongoose = require('mongoose');
const performanceMonitor = require('./performanceMonitor');
const mlPredictor = require('./mlPredictor');
const anomalyPredictor = require('./anomalyPredictor');

class ABTesting {
    constructor() {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.incrByAsync = promisify(this.redisClient.incrby).bind(this.redisClient);
        this.activeTests = new Map();
        this.testResults = new Map();
        this.confidenceLevel = 0.95; // 95% confidence level
        this.minSampleSize = 1000;
    }

    async initializeTest(config) {
        const testId = `ab_test_${Date.now()}`;
        const test = {
            id: testId,
            name: config.name,
            description: config.description,
            modelA: config.modelA,
            modelB: config.modelB,
            metrics: config.metrics || ['accuracy', 'latency', 'errorRate'],
            startTime: Date.now(),
            endTime: null,
            sampleSize: config.sampleSize || this.minSampleSize,
            trafficSplit: config.trafficSplit || 0.5,
            status: 'running',
            results: {
                modelA: { samples: 0, metrics: {} },
                modelB: { samples: 0, metrics: {} }
            }
        };

        await this.setAsync(
            `test:${testId}`,
            JSON.stringify(test)
        );

        this.activeTests.set(testId, test);
        return testId;
    }

    async assignModel(userId) {
        // Consistently assign users to models based on user ID
        const activeTests = Array.from(this.activeTests.values());
        const assignments = {};

        for (const test of activeTests) {
            const hash = await this.hashString(`${userId}:${test.id}`);
            const normalizedHash = hash / Math.pow(2, 32);
            assignments[test.id] = normalizedHash < test.trafficSplit ? 'A' : 'B';
        }

        return assignments;
    }

    async recordPrediction(testId, modelVersion, prediction) {
        const test = await this.getTest(testId);
        if (!test || test.status !== 'running') return;

        const model = modelVersion === 'A' ? 'modelA' : 'modelB';
        const results = test.results[model];

        // Update sample count
        results.samples++;

        // Update metrics
        for (const [metric, value] of Object.entries(prediction.metrics)) {
            if (!results.metrics[metric]) {
                results.metrics[metric] = {
                    sum: 0,
                    sumSquares: 0,
                    min: value,
                    max: value
                };
            }

            const metricData = results.metrics[metric];
            metricData.sum += value;
            metricData.sumSquares += value * value;
            metricData.min = Math.min(metricData.min, value);
            metricData.max = Math.max(metricData.max, value);
        }

        // Check if test should be concluded
        if (this.shouldConcludeTest(test)) {
            await this.concludeTest(testId);
        }

        // Save updated test data
        await this.setAsync(
            `test:${testId}`,
            JSON.stringify(test)
        );
    }

    async getTest(testId) {
        const testData = await this.getAsync(`test:${testId}`);
        return testData ? JSON.parse(testData) : null;
    }

    shouldConcludeTest(test) {
        const { modelA, modelB } = test.results;
        
        // Check if minimum sample size reached
        if (modelA.samples < test.sampleSize || modelB.samples < test.sampleSize) {
            return false;
        }

        // Check if statistical significance achieved
        for (const metric of test.metrics) {
            const significance = this.calculateSignificance(
                modelA.metrics[metric],
                modelB.metrics[metric],
                modelA.samples,
                modelB.samples
            );

            if (significance < this.confidenceLevel) {
                return false;
            }
        }

        return true;
    }

    async concludeTest(testId) {
        const test = await this.getTest(testId);
        if (!test || test.status !== 'running') return;

        test.status = 'completed';
        test.endTime = Date.now();
        test.conclusion = this.analyzeResults(test);

        // Save final results
        await this.setAsync(
            `test:${testId}`,
            JSON.stringify(test)
        );

        // Store in test results history
        await this.setAsync(
            `test_results:${testId}`,
            JSON.stringify({
                testId,
                name: test.name,
                startTime: test.startTime,
                endTime: test.endTime,
                conclusion: test.conclusion
            })
        );

        this.activeTests.delete(testId);
        this.testResults.set(testId, test);

        return test.conclusion;
    }

    analyzeResults(test) {
        const { modelA, modelB } = test.results;
        const analysis = {
            winner: null,
            improvements: {},
            confidence: {},
            recommendations: []
        };

        for (const metric of test.metrics) {
            const statsA = this.calculateStats(modelA.metrics[metric], modelA.samples);
            const statsB = this.calculateStats(modelB.metrics[metric], modelB.samples);
            
            const improvement = ((statsB.mean - statsA.mean) / statsA.mean) * 100;
            const significance = this.calculateSignificance(
                modelA.metrics[metric],
                modelB.metrics[metric],
                modelA.samples,
                modelB.samples
            );

            analysis.improvements[metric] = improvement;
            analysis.confidence[metric] = significance;

            // Add metric-specific recommendations
            if (Math.abs(improvement) > 5 && significance > this.confidenceLevel) {
                const better = improvement > 0 ? 'B' : 'A';
                analysis.recommendations.push({
                    metric,
                    improvement: Math.abs(improvement),
                    confidence: significance,
                    message: `Model ${better} shows significant improvement in ${metric}`
                });
            }
        }

        // Determine overall winner
        const significantImprovements = Object.entries(analysis.improvements)
            .filter(([metric, improvement]) => 
                Math.abs(improvement) > 5 && 
                analysis.confidence[metric] > this.confidenceLevel
            );

        if (significantImprovements.length > 0) {
            const avgImprovement = significantImprovements
                .reduce((sum, [_, imp]) => sum + imp, 0) / significantImprovements.length;
            analysis.winner = avgImprovement > 0 ? 'B' : 'A';
        }

        return analysis;
    }

    calculateStats(metricData, samples) {
        const mean = metricData.sum / samples;
        const variance = (metricData.sumSquares / samples) - (mean * mean);
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            stdDev,
            min: metricData.min,
            max: metricData.max
        };
    }

    calculateSignificance(metricsA, metricsB, samplesA, samplesB) {
        const statsA = this.calculateStats(metricsA, samplesA);
        const statsB = this.calculateStats(metricsB, samplesB);

        // Calculate pooled standard error
        const se = Math.sqrt(
            (Math.pow(statsA.stdDev, 2) / samplesA) +
            (Math.pow(statsB.stdDev, 2) / samplesB)
        );

        // Calculate z-score
        const z = Math.abs(statsB.mean - statsA.mean) / se;

        // Convert to p-value using normal distribution
        const p = 1 - this.normalCDF(z);

        return 1 - (2 * p); // Two-tailed test
    }

    normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - p : p;
    }

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint32Array(hashBuffer));
        return hashArray[0]; // Use first 32 bits
    }

    async getActiveTests() {
        return Array.from(this.activeTests.values());
    }

    async getTestHistory() {
        const keys = await this.redisClient.keys('test_results:*');
        const history = [];

        for (const key of keys) {
            const result = await this.getAsync(key);
            if (result) {
                history.push(JSON.parse(result));
            }
        }

        return history.sort((a, b) => b.endTime - a.endTime);
    }

    async getTestMetrics(testId) {
        const test = await this.getTest(testId);
        if (!test) return null;

        const metrics = {};
        for (const metric of test.metrics) {
            metrics[metric] = {
                modelA: this.calculateStats(test.results.modelA.metrics[metric], test.results.modelA.samples),
                modelB: this.calculateStats(test.results.modelB.metrics[metric], test.results.modelB.samples)
            };
        }

        return metrics;
    }
}

module.exports = new ABTesting();

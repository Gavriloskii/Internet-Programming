const BaseTestingService = require('./base/BaseTestingService');
const performanceMonitor = require('./performanceMonitor');
const mlPredictor = require('./mlPredictor');
const anomalyPredictor = require('./anomalyPredictor');

class ABTesting extends BaseTestingService {
    constructor() {
        super({
            retentionPeriod: 604800, // 7 days
            confidenceLevel: 0.95,
            minSampleSize: 1000
        });
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

        await this.storeMetric(`test:${testId}`, test);
        this.activeTests.set(testId, test);
        
        await this.logEvent('Test', {
            message: 'A/B test initialized',
            testId,
            config: test
        });

        return testId;
    }

    async assignModel(userId) {
        const activeTests = await this.getActiveTests();
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
        } else {
            // Save updated test data
            await this.storeMetric(`test:${testId}`, test);
        }

        await this.logEvent('Prediction', {
            message: 'Prediction recorded',
            testId,
            modelVersion,
            samples: results.samples
        });
    }

    async concludeTest(testId) {
        const test = await this.getTest(testId);
        if (!test || test.status !== 'running') return;

        test.status = 'completed';
        test.endTime = Date.now();
        test.conclusion = this.analyzeResults(test);

        await this.storeTestResult(testId, test);

        this.activeTests.delete(testId);
        this.testResults.set(testId, test);

        await this.logEvent('Test', {
            message: 'A/B test concluded',
            testId,
            conclusion: test.conclusion
        });

        return test.conclusion;
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

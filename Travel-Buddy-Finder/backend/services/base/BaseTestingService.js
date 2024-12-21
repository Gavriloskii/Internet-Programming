const BaseAnalyticsService = require('./BaseAnalyticsService');

class BaseTestingService extends BaseAnalyticsService {
    constructor(options = {}) {
        super(options);
        this.confidenceLevel = options.confidenceLevel || 0.95;
        this.minSampleSize = options.minSampleSize || 1000;
        this.activeTests = new Map();
        this.testResults = new Map();
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

    async getTest(testId) {
        const testData = await this.getAsync(`test:${testId}`);
        return testData ? JSON.parse(testData) : null;
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

    async storeTestResult(testId, test) {
        await Promise.all([
            this.storeMetric(`test:${testId}`, test),
            this.storeMetric(`test_results:${testId}`, {
                testId,
                name: test.name,
                startTime: test.startTime,
                endTime: test.endTime,
                conclusion: test.conclusion
            })
        ]);
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
}

module.exports = BaseTestingService;

const tf = require('@tensorflow/tfjs-node');
const redis = require('redis-mock');
const MLPredictor = require('../services/mlPredictor');

// Mock redis
jest.mock('redis', () => require('redis-mock'));

// Mock tensorflow
jest.mock('@tensorflow/tfjs-node', () => ({
    sequential: jest.fn(() => ({
        add: jest.fn(),
        compile: jest.fn(),
        predict: jest.fn(() => ({
            data: () => Promise.resolve([0.5, 0.6, 0.7, 0.8]),
            dispose: jest.fn()
        })),
        fit: jest.fn(() => Promise.resolve()),
        save: jest.fn(() => Promise.resolve())
    })),
    layers: {
        dense: jest.fn(() => ({})),
        dropout: jest.fn(() => ({}))
    },
    train: {
        adam: jest.fn()
    },
    tensor2d: jest.fn(() => ({
        dispose: jest.fn()
    })),
    loadLayersModel: jest.fn(() => Promise.reject('No model found'))
}));

describe('MLPredictor', () => {
    beforeEach(async () => {
        // Reset predictor state
        await MLPredictor.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('creates new model when no existing model found', async () => {
            expect(tf.sequential).toHaveBeenCalled();
            expect(MLPredictor.initialized).toBe(true);
        });

        test('initializes scalers with default values', async () => {
            expect(MLPredictor.featureScaler).toBeTruthy();
            expect(MLPredictor.featureScaler.mean).toHaveLength(10);
            expect(MLPredictor.featureScaler.std).toHaveLength(10);
        });

        test('handles initialization errors gracefully', async () => {
            tf.sequential.mockImplementationOnce(() => {
                throw new Error('Model creation failed');
            });

            await expect(MLPredictor.initialize()).rejects.toThrow('Model creation failed');
        });
    });

    describe('Feature Preprocessing', () => {
        test('preprocesses input features correctly', () => {
            const testData = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100,
                matchDuration: 50,
                errorRate: 0.01,
                requestRate: 100,
                concurrentUsers: 50,
                networkLatency: 20,
                diskUsage: 0.7
            };

            const features = MLPredictor.preprocessFeatures(testData);
            expect(features).toHaveLength(10);
            expect(features.every(f => typeof f === 'number')).toBe(true);
        });

        test('handles missing data in preprocessing', () => {
            const incompleteData = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 }
                // Missing other fields
            };

            const features = MLPredictor.preprocessFeatures(incompleteData);
            expect(features).toHaveLength(10);
            expect(features.some(f => isNaN(f))).toBe(false);
        });
    });

    describe('Performance Prediction', () => {
        test('makes predictions with correct format', async () => {
            const testMetrics = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100,
                matchDuration: 50,
                errorRate: 0.01,
                requestRate: 100,
                concurrentUsers: 50,
                networkLatency: 20,
                diskUsage: 0.7
            };

            const prediction = await MLPredictor.predictPerformance(testMetrics);
            
            expect(prediction).toHaveProperty('cpuPrediction');
            expect(prediction).toHaveProperty('memoryPrediction');
            expect(prediction).toHaveProperty('cachePrediction');
            expect(prediction).toHaveProperty('apiPrediction');
        });

        test('handles prediction errors gracefully', async () => {
            tf.tensor2d.mockImplementationOnce(() => {
                throw new Error('Tensor creation failed');
            });

            await expect(MLPredictor.predictPerformance({}))
                .rejects.toThrow('Tensor creation failed');
        });
    });

    describe('Model Training', () => {
        test('updates model with new training data', async () => {
            const trainingData = [
                {
                    metrics: {
                        cpu: 0.5,
                        memory: { heapUsed: 500, heapTotal: 1000 },
                        cacheHitRate: 0.8,
                        apiResponseTime: 100,
                        matchDuration: 50,
                        errorRate: 0.01,
                        requestRate: 100,
                        concurrentUsers: 50,
                        networkLatency: 20,
                        diskUsage: 0.7
                    },
                    nextCpu: 0.6,
                    nextMemory: 0.55,
                    nextCacheHitRate: 0.85,
                    nextApiResponseTime: 90
                }
            ];

            await MLPredictor.updateModel(trainingData);
            expect(tf.tensor2d).toHaveBeenCalled();
        });

        test('updates scalers after training', async () => {
            const trainingData = [
                {
                    metrics: {
                        cpu: 0.5,
                        memory: { heapUsed: 500, heapTotal: 1000 },
                        cacheHitRate: 0.8,
                        apiResponseTime: 100,
                        matchDuration: 50,
                        errorRate: 0.01,
                        requestRate: 100,
                        concurrentUsers: 50,
                        networkLatency: 20,
                        diskUsage: 0.7
                    },
                    nextCpu: 0.6,
                    nextMemory: 0.55,
                    nextCacheHitRate: 0.85,
                    nextApiResponseTime: 90
                }
            ];

            const initialScalers = {
                featureScaler: { ...MLPredictor.featureScaler },
                labelScaler: { ...MLPredictor.labelScaler }
            };

            await MLPredictor.updateModel(trainingData);

            expect(MLPredictor.featureScaler).not.toEqual(initialScalers.featureScaler);
            expect(MLPredictor.labelScaler).not.toEqual(initialScalers.labelScaler);
        });
    });

    describe('Optimization Suggestions', () => {
        test('generates appropriate suggestions based on predictions', async () => {
            const currentMetrics = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100,
                matchDuration: 50,
                errorRate: 0.01,
                requestRate: 100,
                concurrentUsers: 50,
                networkLatency: 20,
                diskUsage: 0.7
            };

            const prediction = {
                cpuPrediction: 0.9,    // High CPU prediction
                memoryPrediction: 0.9,  // High memory prediction
                cachePrediction: 0.5,   // Low cache prediction
                apiPrediction: 200      // High API response time
            };

            const suggestions = await MLPredictor.getOptimizationSuggestions(
                currentMetrics,
                prediction
            );

            expect(suggestions).toContainEqual(
                expect.objectContaining({
                    category: 'cpu',
                    priority: 'high'
                })
            );

            expect(suggestions).toContainEqual(
                expect.objectContaining({
                    category: 'memory',
                    priority: 'high'
                })
            );

            expect(suggestions).toContainEqual(
                expect.objectContaining({
                    category: 'cache',
                    priority: 'medium'
                })
            );
        });

        test('includes confidence levels with suggestions', async () => {
            const currentMetrics = {
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100,
                matchDuration: 50,
                errorRate: 0.01,
                requestRate: 100,
                concurrentUsers: 50,
                networkLatency: 20,
                diskUsage: 0.7
            };

            const prediction = {
                cpuPrediction: 0.9,
                memoryPrediction: 0.9,
                cachePrediction: 0.5,
                apiPrediction: 200
            };

            const suggestions = await MLPredictor.getOptimizationSuggestions(
                currentMetrics,
                prediction
            );

            suggestions.forEach(suggestion => {
                expect(suggestion).toHaveProperty('confidence');
                expect(suggestion.confidence).toHaveProperty('level');
                expect(suggestion.confidence).toHaveProperty('score');
            });
        });
    });

    describe('Prediction Confidence', () => {
        test('calculates confidence levels correctly', async () => {
            const prediction = {
                cpuPrediction: 0.85,
                memoryPrediction: 0.82,
                cachePrediction: 0.88,
                apiPrediction: 0.86
            };

            const confidence = await MLPredictor.getPredictionConfidence(prediction);
            
            expect(confidence).toHaveProperty('level');
            expect(confidence).toHaveProperty('score');
            expect(['high', 'medium', 'low']).toContain(confidence.level);
            expect(confidence.score).toBeGreaterThan(0);
            expect(confidence.score).toBeLessThanOrEqual(1);
        });
    });
});

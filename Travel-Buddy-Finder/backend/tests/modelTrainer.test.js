const tf = require('@tensorflow/tfjs-node');
const redis = require('redis-mock');
const modelTrainer = require('../services/modelTrainer');
const performanceMonitor = require('../services/performanceMonitor');

// Mock dependencies
jest.mock('@tensorflow/tfjs-node', () => ({
    sequential: jest.fn(() => ({
        add: jest.fn(),
        compile: jest.fn(),
        predict: jest.fn(() => ({
            data: () => Promise.resolve(new Float32Array([0.8, 0.7, 0.9, 100])),
            dispose: jest.fn()
        })),
        fit: jest.fn(() => Promise.resolve({
            history: {
                loss: [0.5, 0.3, 0.2],
                accuracy: [0.7, 0.8, 0.9]
            }
        })),
        save: jest.fn(() => Promise.resolve())
    })),
    layers: {
        lstm: jest.fn(() => ({})),
        dense: jest.fn(() => ({})),
        dropout: jest.fn(() => ({}))
    },
    train: {
        adam: jest.fn()
    },
    tensor2d: jest.fn(() => ({
        dispose: jest.fn()
    })),
    tensor3d: jest.fn(() => ({
        dispose: jest.fn()
    }))
}));

jest.mock('../services/performanceMonitor', () => ({
    getPerformanceReport: jest.fn()
}));

describe('ModelTrainer', () => {
    beforeEach(async () => {
        // Reset trainer state
        await modelTrainer.initialize();
        
        // Mock performance data
        performanceMonitor.getPerformanceReport.mockResolvedValue(
            Array(1000).fill().map((_, i) => ({
                cpu: 0.5 + (Math.random() * 0.3),
                memory: {
                    heapUsed: 500 + (Math.random() * 300),
                    heapTotal: 1000
                },
                cacheHitRate: 0.8 + (Math.random() * 0.2),
                apiResponseTime: 100 + (Math.random() * 50),
                errorRate: 0.01 + (Math.random() * 0.02)
            }))
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('initializes with default training metrics', async () => {
            expect(modelTrainer.currentTrainingMetrics).toBeDefined();
            expect(modelTrainer.currentTrainingMetrics.anomaly).toBeDefined();
            expect(modelTrainer.currentTrainingMetrics.ml).toBeDefined();
        });

        test('loads last training time if available', async () => {
            const mockTime = Date.now() - 1000000;
            await modelTrainer.setAsync('last_model_training', mockTime.toString());
            await modelTrainer.initialize();
            expect(modelTrainer.lastTrainingTime).toBe(mockTime);
        });
    });

    describe('Training Data Preparation', () => {
        test('prepares correct training data format', async () => {
            const trainingData = await modelTrainer.prepareTrainingData();
            
            expect(trainingData.training).toBeDefined();
            expect(trainingData.validation).toBeDefined();
            expect(trainingData.training.features).toBeInstanceOf(Array);
            expect(trainingData.training.labels).toBeInstanceOf(Array);
        });

        test('applies correct validation split', async () => {
            const trainingData = await modelTrainer.prepareTrainingData();
            const totalSamples = trainingData.training.features.length + 
                               trainingData.validation.features.length;
            
            expect(trainingData.validation.features.length / totalSamples)
                .toBeCloseTo(modelTrainer.validationSplit, 2);
        });

        test('processes historical data correctly', () => {
            const mockData = Array(20).fill().map((_, i) => ({
                cpu: 0.5,
                memory: { heapUsed: 500, heapTotal: 1000 },
                cacheHitRate: 0.8,
                apiResponseTime: 100,
                errorRate: 0.01
            }));

            const { features, labels } = modelTrainer.processHistoricalData(mockData);
            
            expect(features[0].length).toBe(10); // Window size
            expect(features[0][0].length).toBe(5); // Feature dimensions
            expect(labels[0].length).toBe(4); // Output dimensions
        });
    });

    describe('Model Training', () => {
        test('trains models successfully', async () => {
            await modelTrainer.trainModels();
            
            expect(tf.sequential).toHaveBeenCalledTimes(2); // Anomaly and ML models
            expect(tf.layers.lstm).toHaveBeenCalled();
            expect(tf.layers.dense).toHaveBeenCalled();
        });

        test('saves models only if improved', async () => {
            // Mock better metrics
            jest.spyOn(modelTrainer, 'evaluateModel').mockResolvedValue({
                mse: 0.1,
                mae: 0.2,
                accuracy: 0.9
            });

            await modelTrainer.trainModels();
            expect(tf.sequential().save).toHaveBeenCalled();
        });

        test('handles training errors gracefully', async () => {
            tf.sequential().fit.mockRejectedValueOnce(new Error('Training failed'));
            
            await expect(modelTrainer.trainModels()).rejects.toThrow('Training failed');
            expect(modelTrainer.trainingInProgress).toBe(false);
        });
    });

    describe('Model Evaluation', () => {
        test('calculates correct evaluation metrics', async () => {
            const mockModel = tf.sequential();
            const mockValidationData = {
                features: Array(10).fill([Array(10).fill([0.5, 0.5, 0.8, 100, 0.01])]),
                labels: Array(10).fill([0.6, 0.6, 0.7, 110])
            };

            const metrics = await modelTrainer.evaluateModel(mockModel, mockValidationData);
            
            expect(metrics).toHaveProperty('mse');
            expect(metrics).toHaveProperty('mae');
            expect(metrics).toHaveProperty('accuracy');
        });

        test('determines model improvement correctly', () => {
            const currentMetrics = {
                mse: 0.2,
                mae: 0.3,
                accuracy: 0.8
            };

            const betterMetrics = {
                mse: 0.1,
                mae: 0.2,
                accuracy: 0.9
            };

            const worseMetrics = {
                mse: 0.3,
                mae: 0.4,
                accuracy: 0.7
            };

            expect(modelTrainer.isModelImprovement(betterMetrics, betterMetrics)).toBe(true);
            expect(modelTrainer.isModelImprovement(worseMetrics, worseMetrics)).toBe(false);
        });
    });

    describe('Performance Monitoring', () => {
        test('checks model performance correctly', async () => {
            // Mock recent predictions
            jest.spyOn(modelTrainer, 'getRecentPredictions').mockResolvedValue(
                Array(100).fill().map(() => ({
                    predicted: 0.5,
                    actual: 0.52
                }))
            );

            const performance = await modelTrainer.evaluateModelPerformance();
            expect(performance).toBeGreaterThan(0);
            expect(performance).toBeLessThanOrEqual(1);
        });

        test('initiates retraining when performance drops', async () => {
            jest.spyOn(modelTrainer, 'evaluateModelPerformance')
                .mockResolvedValue(0.5); // Below threshold

            await modelTrainer.checkModelPerformance();
            expect(tf.sequential).toHaveBeenCalled();
        });
    });

    describe('Training Schedule', () => {
        test('determines retraining need correctly', async () => {
            // Mock conditions requiring retraining
            modelTrainer.lastTrainingTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
            jest.spyOn(modelTrainer, 'getTrainingDataSize')
                .mockResolvedValue(modelTrainer.minTrainingDataPoints + 100);
            jest.spyOn(modelTrainer, 'evaluateModelPerformance')
                .mockResolvedValue(0.7); // Below threshold

            const shouldRetrain = await modelTrainer.shouldRetrain();
            expect(shouldRetrain).toBe(true);
        });

        test('respects minimum data point requirement', async () => {
            jest.spyOn(modelTrainer, 'getTrainingDataSize')
                .mockResolvedValue(modelTrainer.minTrainingDataPoints - 1);

            const shouldRetrain = await modelTrainer.shouldRetrain();
            expect(shouldRetrain).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('handles initialization errors', async () => {
            jest.spyOn(modelTrainer.redisClient, 'get')
                .mockImplementation(() => { throw new Error('Redis error'); });

            await expect(modelTrainer.initialize()).rejects.toThrow('Redis error');
        });

        test('handles training data preparation errors', async () => {
            performanceMonitor.getPerformanceReport.mockRejectedValueOnce(
                new Error('Data fetch failed')
            );

            await expect(modelTrainer.prepareTrainingData())
                .rejects.toThrow('Data fetch failed');
        });

        test('handles model evaluation errors', async () => {
            const mockModel = tf.sequential();
            mockModel.predict.mockImplementationOnce(() => {
                throw new Error('Prediction failed');
            });

            await expect(modelTrainer.evaluateModel(mockModel, {}))
                .rejects.toThrow('Prediction failed');
        });
    });

    describe('Metrics Tracking', () => {
        test('updates training metrics correctly', async () => {
            const newMetrics = {
                anomaly: { mse: 0.1, mae: 0.2, accuracy: 0.9 },
                ml: { mse: 0.15, mae: 0.25, accuracy: 0.85 }
            };

            await modelTrainer.updateTrainingMetrics(
                newMetrics.anomaly,
                newMetrics.ml
            );

            expect(modelTrainer.currentTrainingMetrics).toEqual(newMetrics);
        });

        test('maintains training history', async () => {
            const metrics = await modelTrainer.getAsync('training_metrics');
            expect(JSON.parse(metrics)).toBeDefined();
        });
    });
});

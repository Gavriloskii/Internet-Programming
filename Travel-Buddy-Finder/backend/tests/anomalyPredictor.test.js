const tf = require('@tensorflow/tfjs-node');
const redis = require('redis-mock');
const anomalyPredictor = require('../services/anomalyPredictor');
const mlPredictor = require('../services/mlPredictor');
const anomalyDetector = require('../services/anomalyDetector');

// Mock dependencies
jest.mock('@tensorflow/tfjs-node', () => ({
    sequential: jest.fn(() => ({
        add: jest.fn(),
        compile: jest.fn(),
        predict: jest.fn(() => ({
            data: () => Promise.resolve([0.9, 0.85, 0.4, 250]),
            dispose: jest.fn()
        })),
        fit: jest.fn(() => Promise.resolve())
    })),
    layers: {
        lstm: jest.fn(() => ({})),
        dropout: jest.fn(() => ({})),
        dense: jest.fn(() => ({}))
    },
    train: {
        adam: jest.fn()
    },
    tensor3d: jest.fn(() => ({
        dispose: jest.fn()
    })),
    loadLayersModel: jest.fn(() => Promise.reject('No model found'))
}));

jest.mock('../services/mlPredictor', () => ({
    initialize: jest.fn(),
    predictPerformance: jest.fn(() => Promise.resolve({
        cpuPrediction: 0.85,
        memoryPrediction: 0.8,
        cachePrediction: 0.45,
        apiPrediction: 220
    }))
}));

describe('AnomalyPredictor', () => {
    beforeEach(async () => {
        // Reset predictor state
        await anomalyPredictor.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('initializes successfully with new model', async () => {
            expect(tf.sequential).toHaveBeenCalled();
            expect(anomalyPredictor.initialized).toBe(true);
            expect(anomalyPredictor.predictionModel).toBeTruthy();
        });

        test('handles initialization errors gracefully', async () => {
            tf.sequential.mockImplementationOnce(() => {
                throw new Error('Model creation failed');
            });

            await expect(anomalyPredictor.initialize()).rejects.toThrow('Model creation failed');
        });
    });

    describe('Anomaly Prediction', () => {
        const mockCurrentMetrics = {
            cpu: 0.7,
            memory: { heapUsed: 700, heapTotal: 1000 },
            cacheHitRate: 0.6,
            apiResponseTime: 150,
            errorRate: 0.02
        };

        const mockHistoricalData = Array(10).fill().map(() => ({
            cpu: 0.6,
            memory: { heapUsed: 600, heapTotal: 1000 },
            cacheHitRate: 0.8,
            apiResponseTime: 100,
            errorRate: 0.01
        }));

        test('predicts potential anomalies correctly', async () => {
            const predictions = await anomalyPredictor.predictAnomalies(
                mockCurrentMetrics,
                mockHistoricalData
            );

            expect(predictions).toBeInstanceOf(Array);
            expect(predictions.length).toBeGreaterThan(0);
            
            const cpuAnomaly = predictions.find(p => p.metric === 'cpu');
            expect(cpuAnomaly).toBeTruthy();
            expect(cpuAnomaly.confidence).toBeGreaterThanOrEqual(anomalyPredictor.confidenceThreshold);
        });

        test('includes appropriate recommendations for predictions', async () => {
            const predictions = await anomalyPredictor.predictAnomalies(
                mockCurrentMetrics,
                mockHistoricalData
            );

            predictions.forEach(prediction => {
                expect(prediction.recommendations).toBeInstanceOf(Array);
                expect(prediction.recommendations.length).toBeGreaterThan(0);
                expect(typeof prediction.recommendations[0]).toBe('string');
            });
        });

        test('filters predictions based on confidence threshold', async () => {
            // Mock low confidence predictions
            mlPredictor.predictPerformance.mockResolvedValueOnce({
                cpuPrediction: 0.5,
                memoryPrediction: 0.5,
                cachePrediction: 0.7,
                apiPrediction: 100
            });

            const predictions = await anomalyPredictor.predictAnomalies(
                mockCurrentMetrics,
                mockHistoricalData
            );

            predictions.forEach(prediction => {
                expect(prediction.confidence).toBeGreaterThanOrEqual(
                    anomalyPredictor.confidenceThreshold
                );
            });
        });
    });

    describe('Prediction Confidence', () => {
        test('calculates prediction confidence correctly', async () => {
            const confidence = await anomalyPredictor.calculatePredictionConfidence(
                'cpu',
                0.9,
                0.85
            );

            expect(confidence).toBeGreaterThanOrEqual(0);
            expect(confidence).toBeLessThanOrEqual(1);
        });

        test('considers multiple factors in confidence calculation', async () => {
            // Mock high stability and accuracy
            jest.spyOn(anomalyPredictor, 'getPredictionStability')
                .mockResolvedValue(0.9);
            jest.spyOn(anomalyPredictor, 'getHistoricalAccuracy')
                .mockResolvedValue(0.9);

            const confidence = await anomalyPredictor.calculatePredictionConfidence(
                'cpu',
                0.9,
                0.85
            );

            expect(confidence).toBeGreaterThan(0.8);
        });
    });

    describe('Severity Assessment', () => {
        test('determines correct severity levels', () => {
            const thresholds = { low: 0.3, high: 0.8 };

            expect(anomalyPredictor.getPredictedSeverity(0.95, thresholds))
                .toBe('critical');
            expect(anomalyPredictor.getPredictedSeverity(0.85, thresholds))
                .toBe('high');
            expect(anomalyPredictor.getPredictedSeverity(0.81, thresholds))
                .toBe('medium');
            expect(anomalyPredictor.getPredictedSeverity(0.75, thresholds))
                .toBe('low');
        });

        test('handles inverse metrics correctly', () => {
            const thresholds = { low: 0.6, high: 0.9 };

            expect(anomalyPredictor.getPredictedSeverity(0.2, thresholds, true))
                .toBe('critical');
            expect(anomalyPredictor.getPredictedSeverity(0.35, thresholds, true))
                .toBe('high');
        });
    });

    describe('Recommendations', () => {
        test('provides appropriate recommendations for each metric', () => {
            const metrics = ['cpu', 'memory', 'cache', 'api'];
            const severities = ['critical', 'high', 'medium'];

            metrics.forEach(metric => {
                severities.forEach(severity => {
                    const value = severity === 'critical' ? 0.95 : 
                                severity === 'high' ? 0.85 : 0.75;
                    
                    const recommendations = anomalyPredictor.getPreemptiveRecommendations(
                        metric,
                        value
                    );

                    expect(recommendations).toBeInstanceOf(Array);
                    expect(recommendations.length).toBeGreaterThan(0);
                    recommendations.forEach(rec => {
                        expect(typeof rec).toBe('string');
                        expect(rec.length).toBeGreaterThan(0);
                    });
                });
            });
        });
    });

    describe('Prediction Accuracy Tracking', () => {
        test('updates prediction accuracy correctly', async () => {
            const metric = 'cpu';
            const predicted = 0.85;
            const actual = 0.8;

            const newAccuracy = await anomalyPredictor.updatePredictionAccuracy(
                metric,
                predicted,
                actual
            );

            expect(newAccuracy).toBeGreaterThanOrEqual(0);
            expect(newAccuracy).toBeLessThanOrEqual(1);
        });

        test('maintains exponential moving average', async () => {
            const metric = 'cpu';
            const initialAccuracy = 0.8;

            // Set initial accuracy
            await anomalyPredictor.setAsync(
                `prediction_accuracy:${metric}`,
                initialAccuracy.toString()
            );

            // Update with new prediction
            const newAccuracy = await anomalyPredictor.updatePredictionAccuracy(
                metric,
                0.85,
                0.8
            );

            expect(newAccuracy).not.toBe(initialAccuracy);
            expect(Math.abs(newAccuracy - initialAccuracy)).toBeLessThan(0.3);
        });
    });

    describe('Time Series Processing', () => {
        test('prepares time series data correctly', () => {
            const historicalData = Array(15).fill().map((_, i) => ({
                cpu: 0.5 + (i * 0.02),
                memory: { heapUsed: 500 + (i * 20), heapTotal: 1000 },
                cacheHitRate: 0.8 - (i * 0.01),
                apiResponseTime: 100 + (i * 5),
                errorRate: 0.01 + (i * 0.001)
            }));

            const timeSeriesData = anomalyPredictor.prepareTimeSeriesData(historicalData);

            expect(timeSeriesData).toHaveLength(10);
            timeSeriesData.forEach(dataPoint => {
                expect(dataPoint).toHaveLength(5);
                expect(dataPoint.every(value => typeof value === 'number')).toBe(true);
            });
        });
    });

    describe('Error Handling', () => {
        test('handles prediction errors gracefully', async () => {
            tf.tensor3d.mockImplementationOnce(() => {
                throw new Error('Tensor creation failed');
            });

            await expect(anomalyPredictor.predictAnomalies({}, []))
                .rejects.toThrow('Tensor creation failed');
        });

        test('handles missing historical data gracefully', async () => {
            const predictions = await anomalyPredictor.predictAnomalies(
                { cpu: 0.5, memory: { heapUsed: 500, heapTotal: 1000 } },
                []
            );

            expect(predictions).toBeInstanceOf(Array);
        });
    });
});

const tf = require('@tensorflow/tfjs-node');
const redis = require('redis');
const { promisify } = require('util');
const mlPredictor = require('./mlPredictor');
const anomalyDetector = require('./anomalyDetector');

class AnomalyPredictor {
    constructor() {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.predictionWindow = 3600000; // 1 hour
        this.confidenceThreshold = 0.8;
        this.initialized = false;
        this.predictionModel = null;
    }

    async initialize() {
        try {
            // Initialize ML predictor
            await mlPredictor.initialize();
            
            // Load or create prediction model
            this.predictionModel = await this.loadModel() || await this.createModel();
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing anomaly predictor:', error);
            throw error;
        }
    }

    async createModel() {
        const model = tf.sequential();
        
        // Input layer for time series data
        model.add(tf.layers.lstm({
            inputShape: [10, 5], // 10 time steps, 5 features
            units: 32,
            returnSequences: true
        }));
        
        model.add(tf.layers.dropout({ rate: 0.2 }));
        
        model.add(tf.layers.lstm({
            units: 16,
            returnSequences: false
        }));
        
        model.add(tf.layers.dense({
            units: 4, // Predict next values for CPU, Memory, Cache, API
            activation: 'linear'
        }));

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });

        return model;
    }

    async loadModel() {
        try {
            return await tf.loadLayersModel('file://./models/anomaly_prediction/model.json');
        } catch (error) {
            console.log('No existing prediction model found, creating new one');
            return null;
        }
    }

    async predictAnomalies(currentMetrics, historicalData) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Prepare input data
            const timeSeriesData = this.prepareTimeSeriesData(historicalData);
            const inputTensor = tf.tensor3d([timeSeriesData]);

            // Make predictions
            const predictions = await this.predictionModel.predict(inputTensor);
            const predictedValues = await predictions.data();

            // Clean up tensors
            inputTensor.dispose();
            predictions.dispose();

            // Get ML-based performance predictions
            const mlPredictions = await mlPredictor.predictPerformance(currentMetrics);

            // Combine predictions and analyze potential anomalies
            const potentialAnomalies = await this.analyzePredictions(
                predictedValues,
                mlPredictions,
                currentMetrics
            );

            return potentialAnomalies;
        } catch (error) {
            console.error('Error predicting anomalies:', error);
            throw error;
        }
    }

    prepareTimeSeriesData(historicalData) {
        // Extract last 10 time steps
        const timeSteps = historicalData.slice(-10).map(data => [
            data.cpu,
            data.memory.heapUsed / data.memory.heapTotal,
            data.cacheHitRate,
            data.apiResponseTime,
            data.errorRate
        ]);

        return timeSteps;
    }

    async analyzePredictions(predictedValues, mlPredictions, currentMetrics) {
        const potentialAnomalies = [];
        const predictionTime = Date.now() + this.predictionWindow;

        // Analyze CPU predictions
        if (predictedValues[0] > anomalyDetector.anomalyThresholds.cpu.high) {
            const confidence = await this.calculatePredictionConfidence(
                'cpu',
                predictedValues[0],
                mlPredictions.cpuPrediction
            );

            if (confidence >= this.confidenceThreshold) {
                potentialAnomalies.push({
                    metric: 'cpu',
                    predictedValue: predictedValues[0],
                    currentValue: currentMetrics.cpu,
                    confidence,
                    predictionTime,
                    severity: this.getPredictedSeverity(
                        predictedValues[0],
                        anomalyDetector.anomalyThresholds.cpu
                    ),
                    recommendations: this.getPreemptiveRecommendations('cpu', predictedValues[0])
                });
            }
        }

        // Analyze Memory predictions
        const predictedMemory = predictedValues[1];
        if (predictedMemory > anomalyDetector.anomalyThresholds.memory.high) {
            const confidence = await this.calculatePredictionConfidence(
                'memory',
                predictedMemory,
                mlPredictions.memoryPrediction
            );

            if (confidence >= this.confidenceThreshold) {
                potentialAnomalies.push({
                    metric: 'memory',
                    predictedValue: predictedMemory,
                    currentValue: currentMetrics.memory.heapUsed / currentMetrics.memory.heapTotal,
                    confidence,
                    predictionTime,
                    severity: this.getPredictedSeverity(
                        predictedMemory,
                        anomalyDetector.anomalyThresholds.memory
                    ),
                    recommendations: this.getPreemptiveRecommendations('memory', predictedMemory)
                });
            }
        }

        // Analyze Cache predictions
        const predictedCache = predictedValues[2];
        if (predictedCache < anomalyDetector.anomalyThresholds.cache.low) {
            const confidence = await this.calculatePredictionConfidence(
                'cache',
                predictedCache,
                mlPredictions.cachePrediction
            );

            if (confidence >= this.confidenceThreshold) {
                potentialAnomalies.push({
                    metric: 'cache',
                    predictedValue: predictedCache,
                    currentValue: currentMetrics.cacheHitRate,
                    confidence,
                    predictionTime,
                    severity: this.getPredictedSeverity(
                        predictedCache,
                        anomalyDetector.anomalyThresholds.cache,
                        true // Inverse for cache (lower is worse)
                    ),
                    recommendations: this.getPreemptiveRecommendations('cache', predictedCache)
                });
            }
        }

        // Analyze API predictions
        const predictedApi = predictedValues[3];
        if (predictedApi > anomalyDetector.anomalyThresholds.api.high) {
            const confidence = await this.calculatePredictionConfidence(
                'api',
                predictedApi,
                mlPredictions.apiPrediction
            );

            if (confidence >= this.confidenceThreshold) {
                potentialAnomalies.push({
                    metric: 'api',
                    predictedValue: predictedApi,
                    currentValue: currentMetrics.apiResponseTime,
                    confidence,
                    predictionTime,
                    severity: this.getPredictedSeverity(
                        predictedApi,
                        anomalyDetector.anomalyThresholds.api
                    ),
                    recommendations: this.getPreemptiveRecommendations('api', predictedApi)
                });
            }
        }

        return potentialAnomalies;
    }

    async calculatePredictionConfidence(metric, predictedValue, mlPrediction) {
        // Combine multiple confidence factors
        const factors = {
            // Agreement between time series and ML predictions
            modelAgreement: 1 - Math.abs(predictedValue - mlPrediction) / Math.max(predictedValue, mlPrediction),
            
            // Prediction stability
            stability: await this.getPredictionStability(metric),
            
            // Historical accuracy
            historicalAccuracy: await this.getHistoricalAccuracy(metric)
        };

        // Weighted average of confidence factors
        const weights = {
            modelAgreement: 0.4,
            stability: 0.3,
            historicalAccuracy: 0.3
        };

        return Object.entries(factors).reduce(
            (confidence, [factor, value]) => confidence + (value * weights[factor]),
            0
        );
    }

    async getPredictionStability(metric) {
        const key = `prediction_stability:${metric}`;
        const stability = await this.getAsync(key);
        return stability ? parseFloat(stability) : 0.5;
    }

    async getHistoricalAccuracy(metric) {
        const key = `prediction_accuracy:${metric}`;
        const accuracy = await this.getAsync(key);
        return accuracy ? parseFloat(accuracy) : 0.5;
    }

    getPredictedSeverity(value, thresholds, inverse = false) {
        if (inverse) {
            if (value < thresholds.low * 0.5) return 'critical';
            if (value < thresholds.low * 0.7) return 'high';
            if (value < thresholds.low) return 'medium';
            return 'low';
        }

        if (value > thresholds.high * 1.5) return 'critical';
        if (value > thresholds.high * 1.3) return 'high';
        if (value > thresholds.high) return 'medium';
        return 'low';
    }

    getPreemptiveRecommendations(metric, predictedValue) {
        const recommendations = {
            cpu: {
                critical: [
                    'Immediately scale up infrastructure',
                    'Implement aggressive request throttling',
                    'Temporarily disable non-critical features'
                ],
                high: [
                    'Prepare additional compute resources',
                    'Optimize resource-intensive operations',
                    'Review and adjust rate limits'
                ],
                medium: [
                    'Monitor resource usage closely',
                    'Review recent code changes',
                    'Plan for potential scaling'
                ]
            },
            memory: {
                critical: [
                    'Implement emergency memory cleanup',
                    'Increase memory allocation immediately',
                    'Disable memory-intensive features'
                ],
                high: [
                    'Optimize memory usage patterns',
                    'Prepare for memory scaling',
                    'Review memory leak possibilities'
                ],
                medium: [
                    'Monitor memory trends',
                    'Review garbage collection settings',
                    'Plan memory optimization'
                ]
            },
            cache: {
                critical: [
                    'Implement emergency cache warming',
                    'Review cache invalidation strategy',
                    'Prepare backup caching system'
                ],
                high: [
                    'Optimize cache key distribution',
                    'Review cache expiration policies',
                    'Monitor cache hit patterns'
                ],
                medium: [
                    'Analyze cache usage patterns',
                    'Review caching strategy',
                    'Plan cache optimization'
                ]
            },
            api: {
                critical: [
                    'Implement circuit breakers',
                    'Prepare fallback responses',
                    'Scale API infrastructure'
                ],
                high: [
                    'Optimize database queries',
                    'Review API rate limits',
                    'Monitor endpoint performance'
                ],
                medium: [
                    'Analyze API usage patterns',
                    'Review response caching',
                    'Plan performance optimization'
                ]
            }
        };

        const severity = this.getPredictedSeverity(
            predictedValue,
            anomalyDetector.anomalyThresholds[metric],
            metric === 'cache'
        );

        return recommendations[metric][severity] || recommendations[metric].medium;
    }

    async updatePredictionAccuracy(metric, predicted, actual) {
        const accuracy = 1 - Math.abs(predicted - actual) / Math.max(predicted, actual);
        const key = `prediction_accuracy:${metric}`;
        
        // Update with exponential moving average
        const currentAccuracy = await this.getHistoricalAccuracy(metric);
        const newAccuracy = currentAccuracy * 0.7 + accuracy * 0.3;
        
        await this.setAsync(key, newAccuracy.toString());
        return newAccuracy;
    }
}

module.exports = new AnomalyPredictor();

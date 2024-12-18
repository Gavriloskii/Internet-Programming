const tf = require('@tensorflow/tfjs-node');
const redis = require('redis');
const { promisify } = require('util');
const cron = require('node-cron');
const performanceMonitor = require('./performanceMonitor');
const anomalyPredictor = require('./anomalyPredictor');
const mlPredictor = require('./mlPredictor');

class ModelTrainer {
    constructor() {
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.trainingInProgress = false;
        this.lastTrainingTime = null;
        this.minTrainingDataPoints = 1000;
        this.maxTrainingDataPoints = 10000;
        this.validationSplit = 0.2;
        this.trainingConfig = {
            batchSize: 32,
            epochs: 10,
            learningRate: 0.001,
            earlyStoppingPatience: 3
        };
        this.performanceThreshold = 0.8;
    }

    async initialize() {
        try {
            // Schedule regular model retraining
            this.scheduleTraining();
            
            // Load last training time
            const lastTraining = await this.getAsync('last_model_training');
            if (lastTraining) {
                this.lastTrainingTime = parseInt(lastTraining);
            }

            // Initialize training metrics
            await this.initializeTrainingMetrics();
        } catch (error) {
            console.error('Error initializing model trainer:', error);
            throw error;
        }
    }

    scheduleTraining() {
        // Schedule daily retraining at 2 AM
        cron.schedule('0 2 * * *', async () => {
            await this.checkAndTrain();
        });

        // Schedule performance-based retraining check every 4 hours
        cron.schedule('0 */4 * * *', async () => {
            await this.checkModelPerformance();
        });
    }

    async checkAndTrain() {
        if (this.trainingInProgress) {
            console.log('Training already in progress, skipping...');
            return;
        }

        try {
            const shouldTrain = await this.shouldRetrain();
            if (shouldTrain) {
                await this.trainModels();
            }
        } catch (error) {
            console.error('Error in checkAndTrain:', error);
            throw error;
        }
    }

    async shouldRetrain() {
        try {
            // Check if enough new data is available
            const dataPoints = await this.getTrainingDataSize();
            if (dataPoints < this.minTrainingDataPoints) {
                return false;
            }

            // Check model performance
            const performance = await this.evaluateModelPerformance();
            if (performance < this.performanceThreshold) {
                return true;
            }

            // Check time since last training
            if (this.lastTrainingTime) {
                const daysSinceTraining = (Date.now() - this.lastTrainingTime) / (24 * 60 * 60 * 1000);
                if (daysSinceTraining >= 7) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking retraining conditions:', error);
            throw error;
        }
    }

    async trainModels() {
        this.trainingInProgress = true;
        console.log('Starting model training...');

        try {
            // Get training data
            const trainingData = await this.prepareTrainingData();
            
            // Train anomaly prediction model
            const anomalyModel = await this.trainAnomalyModel(trainingData);
            
            // Train ML prediction model
            const mlModel = await this.trainMLModel(trainingData);

            // Evaluate and save models
            const [anomalyMetrics, mlMetrics] = await Promise.all([
                this.evaluateModel(anomalyModel, trainingData.validation),
                this.evaluateModel(mlModel, trainingData.validation)
            ]);

            if (this.isModelImprovement(anomalyMetrics, mlMetrics)) {
                await Promise.all([
                    anomalyModel.save('file://./models/anomaly_prediction'),
                    mlModel.save('file://./models/ml_prediction'),
                    this.updateTrainingMetrics(anomalyMetrics, mlMetrics)
                ]);

                this.lastTrainingTime = Date.now();
                await this.setAsync('last_model_training', this.lastTrainingTime.toString());
                
                console.log('Model training completed successfully');
            } else {
                console.log('New models did not show improvement, keeping current models');
            }
        } catch (error) {
            console.error('Error during model training:', error);
            throw error;
        } finally {
            this.trainingInProgress = false;
        }
    }

    async prepareTrainingData() {
        try {
            // Get historical performance data
            const endTime = Date.now();
            const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // Last 30 days
            const historicalData = await performanceMonitor.getPerformanceReport(startTime, endTime);

            // Prepare features and labels
            const { features, labels } = this.processHistoricalData(historicalData);

            // Split into training and validation sets
            const splitIndex = Math.floor(features.length * (1 - this.validationSplit));
            
            return {
                training: {
                    features: features.slice(0, splitIndex),
                    labels: labels.slice(0, splitIndex)
                },
                validation: {
                    features: features.slice(splitIndex),
                    labels: labels.slice(splitIndex)
                }
            };
        } catch (error) {
            console.error('Error preparing training data:', error);
            throw error;
        }
    }

    processHistoricalData(data) {
        const features = [];
        const labels = [];
        const windowSize = 10;

        for (let i = windowSize; i < data.length; i++) {
            const window = data.slice(i - windowSize, i);
            const nextValues = data[i];

            features.push(window.map(d => [
                d.cpu,
                d.memory.heapUsed / d.memory.heapTotal,
                d.cacheHitRate,
                d.apiResponseTime,
                d.errorRate
            ]));

            labels.push([
                nextValues.cpu,
                nextValues.memory.heapUsed / nextValues.memory.heapTotal,
                nextValues.cacheHitRate,
                nextValues.apiResponseTime
            ]);
        }

        return { features, labels };
    }

    async trainAnomalyModel(trainingData) {
        const model = tf.sequential();
        
        model.add(tf.layers.lstm({
            inputShape: [10, 5],
            units: 32,
            returnSequences: true
        }));
        
        model.add(tf.layers.dropout({ rate: 0.2 }));
        
        model.add(tf.layers.lstm({
            units: 16,
            returnSequences: false
        }));
        
        model.add(tf.layers.dense({
            units: 4,
            activation: 'linear'
        }));

        model.compile({
            optimizer: tf.train.adam(this.trainingConfig.learningRate),
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });

        await model.fit(
            tf.tensor3d(trainingData.training.features),
            tf.tensor2d(trainingData.training.labels),
            {
                epochs: this.trainingConfig.epochs,
                batchSize: this.trainingConfig.batchSize,
                validationSplit: this.validationSplit,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        );

        return model;
    }

    async trainMLModel(trainingData) {
        // Similar to anomaly model but with different architecture
        const model = tf.sequential();
        
        model.add(tf.layers.dense({
            inputShape: [50], // Flattened input
            units: 32,
            activation: 'relu'
        }));
        
        model.add(tf.layers.dropout({ rate: 0.2 }));
        
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        model.add(tf.layers.dense({
            units: 4,
            activation: 'sigmoid'
        }));

        model.compile({
            optimizer: tf.train.adam(this.trainingConfig.learningRate),
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });

        // Flatten features for dense layers
        const flatFeatures = trainingData.training.features.map(
            f => f.flat()
        );

        await model.fit(
            tf.tensor2d(flatFeatures),
            tf.tensor2d(trainingData.training.labels),
            {
                epochs: this.trainingConfig.epochs,
                batchSize: this.trainingConfig.batchSize,
                validationSplit: this.validationSplit,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        );

        return model;
    }

    async evaluateModel(model, validationData) {
        const predictions = await model.predict(
            tf.tensor3d(validationData.features)
        ).data();

        const actual = validationData.labels;
        const metrics = {
            mse: 0,
            mae: 0,
            accuracy: 0
        };

        for (let i = 0; i < actual.length; i++) {
            for (let j = 0; j < actual[i].length; j++) {
                const diff = predictions[i * 4 + j] - actual[i][j];
                metrics.mse += diff * diff;
                metrics.mae += Math.abs(diff);
                metrics.accuracy += (Math.abs(diff) < 0.1) ? 1 : 0;
            }
        }

        const n = actual.length * 4;
        metrics.mse /= n;
        metrics.mae /= n;
        metrics.accuracy /= n;

        return metrics;
    }

    isModelImprovement(anomalyMetrics, mlMetrics) {
        const currentMetrics = this.currentTrainingMetrics;
        
        // Calculate overall improvement
        const anomalyImprovement = 
            (1 - anomalyMetrics.mse) / (1 - currentMetrics.anomaly.mse) - 1;
        const mlImprovement = 
            (1 - mlMetrics.mse) / (1 - currentMetrics.ml.mse) - 1;

        // Require at least 5% improvement in either model
        return anomalyImprovement > 0.05 || mlImprovement > 0.05;
    }

    async initializeTrainingMetrics() {
        const metrics = await this.getAsync('training_metrics');
        this.currentTrainingMetrics = metrics ? JSON.parse(metrics) : {
            anomaly: { mse: 1, mae: 1, accuracy: 0 },
            ml: { mse: 1, mae: 1, accuracy: 0 }
        };
    }

    async updateTrainingMetrics(anomalyMetrics, mlMetrics) {
        this.currentTrainingMetrics = {
            anomaly: anomalyMetrics,
            ml: mlMetrics
        };

        await this.setAsync(
            'training_metrics',
            JSON.stringify(this.currentTrainingMetrics)
        );
    }

    async checkModelPerformance() {
        if (this.trainingInProgress) return;

        try {
            const performance = await this.evaluateModelPerformance();
            if (performance < this.performanceThreshold) {
                console.log('Model performance below threshold, initiating retraining...');
                await this.trainModels();
            }
        } catch (error) {
            console.error('Error checking model performance:', error);
        }
    }

    async evaluateModelPerformance() {
        // Get recent predictions and actual values
        const recentPredictions = await this.getRecentPredictions();
        if (recentPredictions.length < 100) return 1; // Not enough data

        // Calculate prediction accuracy
        const accuracy = recentPredictions.reduce((acc, pred) => {
            const error = Math.abs(pred.predicted - pred.actual);
            return acc + (error < 0.1 ? 1 : 0);
        }, 0) / recentPredictions.length;

        return accuracy;
    }

    async getRecentPredictions() {
        const predictions = [];
        const keys = await this.redisClient.keys('prediction:*');
        
        for (const key of keys) {
            const prediction = JSON.parse(await this.getAsync(key));
            predictions.push(prediction);
        }

        return predictions;
    }

    async getTrainingDataSize() {
        const endTime = Date.now();
        const startTime = endTime - (30 * 24 * 60 * 60 * 1000);
        const data = await performanceMonitor.getPerformanceReport(startTime, endTime);
        return data.length;
    }
}

module.exports = new ModelTrainer();

const tf = require('@tensorflow/tfjs-node');
const cron = require('node-cron');
const BaseMLService = require('./base/BaseMLService');
const performanceMonitor = require('./performanceMonitor');
const anomalyPredictor = require('./anomalyPredictor');
const mlPredictor = require('./mlPredictor');

class ModelTrainer extends BaseMLService {
    constructor() {
        super({
            retentionPeriod: 86400, // 24 hours
            historicalWindow: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
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
            await this.logEvent('Error', { message: 'Error initializing model trainer', error });
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
            await this.logEvent('Error', { message: 'Error in checkAndTrain', error });
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
            await this.logEvent('Error', { message: 'Error checking retraining conditions', error });
            return false;
        }
    }

    async trainModels() {
        this.trainingInProgress = true;
        await this.logEvent('Training', { message: 'Starting model training' });

        try {
            const trainingData = await this.prepareTrainingData();
            
            // Train both models
            const [anomalyModel, mlModel] = await Promise.all([
                this.trainAnomalyModel(trainingData),
                this.trainMLModel(trainingData)
            ]);

            // Evaluate models
            const [anomalyMetrics, mlMetrics] = await Promise.all([
                this.evaluateModel(anomalyModel, trainingData.validation),
                this.evaluateModel(mlModel, trainingData.validation)
            ]);

            if (this.isModelImprovement(anomalyMetrics, mlMetrics)) {
                await Promise.all([
                    anomalyModel.save('file://./models/anomaly_prediction'),
                    mlModel.save('file://./models/ml_prediction'),
                    this.updateTrainingMetrics(anomalyMetrics, mlMetrics),
                    this.storeMetric('last_model_training', Date.now())
                ]);

                await this.logEvent('Training', { 
                    message: 'Model training completed successfully',
                    metrics: { anomalyMetrics, mlMetrics }
                });
            } else {
                await this.logEvent('Training', { 
                    message: 'New models did not show improvement, keeping current models',
                    metrics: { anomalyMetrics, mlMetrics }
                });
            }
        } catch (error) {
            await this.logEvent('Error', { message: 'Error during model training', error });
            throw error;
        } finally {
            this.trainingInProgress = false;
        }
    }

    async prepareTrainingData() {
        try {
            const historicalData = await this.getHistoricalData('performance_metrics');
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
            await this.logEvent('Error', { message: 'Error preparing training data', error });
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

        return { 
            features: this.preprocessData(features, { normalize: true }), 
            labels: this.preprocessData(labels, { normalize: true })
        };
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
        const model = tf.sequential();
        
        model.add(tf.layers.dense({
            inputShape: [50],
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

        const flatFeatures = trainingData.training.features.map(f => f.flat());

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
        
        const anomalyImprovement = 
            (1 - anomalyMetrics.mse) / (1 - currentMetrics.anomaly.mse) - 1;
        const mlImprovement = 
            (1 - mlMetrics.mse) / (1 - currentMetrics.ml.mse) - 1;

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

        await this.storeMetric('training_metrics', this.currentTrainingMetrics);
    }

    async checkModelPerformance() {
        if (this.trainingInProgress) return;

        try {
            const performance = await this.evaluateModelPerformance();
            if (performance < this.performanceThreshold) {
                await this.logEvent('Performance', { 
                    message: 'Model performance below threshold, initiating retraining',
                    performance
                });
                await this.trainModels();
            }
        } catch (error) {
            await this.logEvent('Error', { message: 'Error checking model performance', error });
        }
    }

    async evaluateModelPerformance() {
        const recentPredictions = await this.getRecentPredictions();
        if (recentPredictions.length < 100) return 1;

        const accuracy = recentPredictions.reduce((acc, pred) => {
            const error = Math.abs(pred.predicted - pred.actual);
            return acc + (error < 0.1 ? 1 : 0);
        }, 0) / recentPredictions.length;

        return accuracy;
    }

    async getRecentPredictions() {
        return this.getHistoricalData('prediction', Date.now() - 24 * 60 * 60 * 1000);
    }

    async getTrainingDataSize() {
        const data = await this.getHistoricalData('performance_metrics');
        return data.length;
    }
}

module.exports = new ModelTrainer();

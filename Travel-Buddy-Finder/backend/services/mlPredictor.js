const tf = require('@tensorflow/tfjs-node');
const redis = require('redis');
const { promisify } = require('util');

class MLPredictor {
    constructor() {
        this.model = null;
        this.redisClient = redis.createClient(process.env.REDIS_URL);
        this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = promisify(this.redisClient.set).bind(this.redisClient);
        this.initialized = false;
        this.featureScaler = null;
        this.labelScaler = null;
    }

    async initialize() {
        try {
            // Load or create model
            this.model = await this.loadModel() || await this.createModel();
            // Initialize scalers
            await this.initializeScalers();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing ML predictor:', error);
            throw error;
        }
    }

    async createModel() {
        const model = tf.sequential();
        
        // Input layer for performance metrics
        model.add(tf.layers.dense({
            inputShape: [10], // CPU, Memory, Cache hit rate, API response times, etc.
            units: 32,
            activation: 'relu'
        }));

        // Hidden layers
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        model.add(tf.layers.dropout({ rate: 0.1 }));
        model.add(tf.layers.dense({
            units: 8,
            activation: 'relu'
        }));

        // Output layer for predictions
        model.add(tf.layers.dense({
            units: 4, // CPU, Memory, Cache, API predictions
            activation: 'sigmoid'
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
            return await tf.loadLayersModel('file://./models/performance_model/model.json');
        } catch (error) {
            console.log('No existing model found, creating new one');
            return null;
        }
    }

    async initializeScalers() {
        const cachedScalers = await this.getAsync('ml_scalers');
        if (cachedScalers) {
            const { featureScaler, labelScaler } = JSON.parse(cachedScalers);
            this.featureScaler = featureScaler;
            this.labelScaler = labelScaler;
        } else {
            // Initialize with default values
            this.featureScaler = {
                mean: new Array(10).fill(0),
                std: new Array(10).fill(1)
            };
            this.labelScaler = {
                mean: new Array(4).fill(0),
                std: new Array(4).fill(1)
            };
        }
    }

    preprocessFeatures(data) {
        const features = [
            data.cpu,
            data.memory.heapUsed / data.memory.heapTotal,
            data.cacheHitRate,
            data.apiResponseTime,
            data.matchDuration,
            data.errorRate,
            data.requestRate,
            data.concurrentUsers,
            data.networkLatency,
            data.diskUsage
        ];

        // Standardize features
        return features.map((value, index) => 
            (value - this.featureScaler.mean[index]) / this.featureScaler.std[index]
        );
    }

    async predictPerformance(currentMetrics) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Preprocess input data
            const features = this.preprocessFeatures(currentMetrics);
            
            // Make prediction
            const inputTensor = tf.tensor2d([features]);
            const prediction = this.model.predict(inputTensor);
            const predictionData = await prediction.data();

            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();

            // Denormalize predictions
            const denormalizedPredictions = predictionData.map((value, index) => 
                value * this.labelScaler.std[index] + this.labelScaler.mean[index]
            );

            return {
                cpuPrediction: denormalizedPredictions[0],
                memoryPrediction: denormalizedPredictions[1],
                cachePrediction: denormalizedPredictions[2],
                apiPrediction: denormalizedPredictions[3]
            };
        } catch (error) {
            console.error('Error making prediction:', error);
            throw error;
        }
    }

    async updateModel(trainingData) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Prepare training data
            const features = trainingData.map(data => this.preprocessFeatures(data.metrics));
            const labels = trainingData.map(data => [
                data.nextCpu,
                data.nextMemory,
                data.nextCacheHitRate,
                data.nextApiResponseTime
            ]);

            // Convert to tensors
            const xs = tf.tensor2d(features);
            const ys = tf.tensor2d(labels);

            // Train model
            await this.model.fit(xs, ys, {
                epochs: 10,
                batchSize: 32,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
                    }
                }
            });

            // Clean up tensors
            xs.dispose();
            ys.dispose();

            // Save updated model
            await this.model.save('file://./models/performance_model');

            // Update scalers
            await this.updateScalers(features, labels);

        } catch (error) {
            console.error('Error updating model:', error);
            throw error;
        }
    }

    async updateScalers(features, labels) {
        // Calculate new means and standard deviations
        const featureMeans = features[0].map((_, colIndex) => 
            features.reduce((sum, row) => sum + row[colIndex], 0) / features.length
        );
        const featureStds = features[0].map((_, colIndex) => {
            const mean = featureMeans[colIndex];
            const squaredDiffs = features.map(row => Math.pow(row[colIndex] - mean, 2));
            return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / features.length);
        });

        const labelMeans = labels[0].map((_, colIndex) => 
            labels.reduce((sum, row) => sum + row[colIndex], 0) / labels.length
        );
        const labelStds = labels[0].map((_, colIndex) => {
            const mean = labelMeans[colIndex];
            const squaredDiffs = labels.map(row => Math.pow(row[colIndex] - mean, 2));
            return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / labels.length);
        });

        // Update scalers
        this.featureScaler = { mean: featureMeans, std: featureStds };
        this.labelScaler = { mean: labelMeans, std: labelStds };

        // Cache updated scalers
        await this.setAsync('ml_scalers', JSON.stringify({
            featureScaler: this.featureScaler,
            labelScaler: this.labelScaler
        }));
    }

    async getPredictionConfidence(prediction) {
        // Calculate confidence based on prediction variance
        const confidenceThresholds = {
            high: 0.8,
            medium: 0.6,
            low: 0.4
        };

        const variance = Object.values(prediction).reduce((acc, val) => {
            const diff = val - this.labelScaler.mean[0];
            return acc + (diff * diff);
        }, 0) / Object.keys(prediction).length;

        const confidence = 1 / (1 + variance);

        if (confidence >= confidenceThresholds.high) {
            return { level: 'high', score: confidence };
        } else if (confidence >= confidenceThresholds.medium) {
            return { level: 'medium', score: confidence };
        } else {
            return { level: 'low', score: confidence };
        }
    }

    async getOptimizationSuggestions(currentMetrics, prediction) {
        const suggestions = [];

        // CPU optimization suggestions
        if (prediction.cpuPrediction > 0.8) {
            suggestions.push({
                category: 'cpu',
                priority: 'high',
                action: 'Scale horizontally',
                impact: 'Immediate CPU relief',
                confidence: await this.getPredictionConfidence({ cpu: prediction.cpuPrediction })
            });
        }

        // Memory optimization suggestions
        if (prediction.memoryPrediction > 0.85) {
            suggestions.push({
                category: 'memory',
                priority: 'high',
                action: 'Implement memory caching',
                impact: 'Reduced memory pressure',
                confidence: await this.getPredictionConfidence({ memory: prediction.memoryPrediction })
            });
        }

        // Cache optimization suggestions
        if (prediction.cachePrediction < 0.6) {
            suggestions.push({
                category: 'cache',
                priority: 'medium',
                action: 'Optimize cache strategy',
                impact: 'Improved cache hit rate',
                confidence: await this.getPredictionConfidence({ cache: prediction.cachePrediction })
            });
        }

        // API optimization suggestions
        if (prediction.apiPrediction > 150) {
            suggestions.push({
                category: 'api',
                priority: 'high',
                action: 'Implement API response caching',
                impact: 'Reduced API response times',
                confidence: await this.getPredictionConfidence({ api: prediction.apiPrediction })
            });
        }

        return suggestions;
    }
}

module.exports = new MLPredictor();

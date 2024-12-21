const BaseAnalyticsService = require('./BaseAnalyticsService');
const tf = require('@tensorflow/tfjs-node');

class BaseMLService extends BaseAnalyticsService {
    constructor(options = {}) {
        super(options);
        this.historicalWindow = options.historicalWindow || 24 * 60 * 60 * 1000; // 24 hours default
        this.modelPath = options.modelPath;
        this.model = null;
    }

    calculateMetricStats(values) {
        const n = values.length;
        if (n === 0) return { mean: 0, std: 0, median: 0 };

        // Calculate mean
        const mean = values.reduce((a, b) => a + b, 0) / n;

        // Calculate standard deviation
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(variance);

        // Calculate median
        const sorted = [...values].sort((a, b) => a - b);
        const median = n % 2 === 0
            ? (sorted[n/2 - 1] + sorted[n/2]) / 2
            : sorted[Math.floor(n/2)];

        return { mean, std, median };
    }

    async loadModel() {
        if (this.modelPath) {
            try {
                this.model = await tf.loadLayersModel(this.modelPath);
                return true;
            } catch (error) {
                console.error('Error loading model:', error);
                return false;
            }
        }
        return false;
    }

    calculateZScore(value, mean, std) {
        return Math.abs((value - mean) / std);
    }

    calculateSeverity(zscore) {
        if (zscore > 4) return 'critical';
        if (zscore > 3) return 'high';
        if (zscore > 2) return 'medium';
        return 'low';
    }

    async getHistoricalData(metricKey, startTime = Date.now() - this.historicalWindow, endTime = Date.now()) {
        try {
            return await this.getMetricsInRange(metricKey, startTime, endTime);
        } catch (error) {
            console.error(`Error getting historical data for ${metricKey}:`, error);
            return [];
        }
    }

    async logEvent(type, data, retention = 604800) { // 7 days default
        const event = {
            type,
            data,
            timestamp: Date.now()
        };

        await this.storeMetric(`${type.toLowerCase()}_event`, event, retention);

        // Emit event if socket.io is available
        if (global.io) {
            global.io.emit(`${type.toLowerCase()}Event`, event);
        }

        return event;
    }

    preprocessData(data, options = {}) {
        const {
            normalize = true,
            fillMissing = true,
            removeOutliers = true,
            outlierThreshold = 3
        } = options;

        let processed = [...data];

        if (fillMissing) {
            processed = this.fillMissingValues(processed);
        }

        if (removeOutliers) {
            processed = this.removeOutliers(processed, outlierThreshold);
        }

        if (normalize) {
            processed = this.normalizeData(processed);
        }

        return processed;
    }

    fillMissingValues(data) {
        // Simple linear interpolation for missing values
        return data.map((value, index) => {
            if (value === null || value === undefined) {
                const prev = data.slice(0, index).findLast(v => v !== null && v !== undefined);
                const next = data.slice(index).find(v => v !== null && v !== undefined);
                return (prev + next) / 2 || prev || next || 0;
            }
            return value;
        });
    }

    removeOutliers(data, threshold) {
        const stats = this.calculateMetricStats(data);
        return data.filter(value => 
            Math.abs((value - stats.mean) / stats.std) <= threshold
        );
    }

    normalizeData(data) {
        const stats = this.calculateMetricStats(data);
        return data.map(value => (value - stats.mean) / stats.std);
    }
}

module.exports = BaseMLService;

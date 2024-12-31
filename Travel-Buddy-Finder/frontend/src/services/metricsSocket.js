import { toast } from 'react-hot-toast';
import BaseSocketService from './base/BaseSocketService';

class MetricsSocketService extends BaseSocketService {
    constructor() {
        super({
            maxReconnectAttempts: 5,
            reconnectDelay: 1000
        });
        this.metricsBuffer = new Map();
        this.updateInterval = 1000;
        this.updateScheduled = false;
        this.metricsListeners = new Map(); // Separate from base class eventHandlers
    }

    connect() {
        const metricsUrl = `${process.env.REACT_APP_API_URL}/metrics`;
        super.connect(metricsUrl, {
            transports: ['websocket'],
            auth: {
                token: localStorage.getItem('token')
            }
        });
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.on('metricsUpdate', (data) => {
            this.handleMetricsUpdate(data);
        });

        this.on('unauthorized', () => {
            console.error('Unauthorized metrics connection');
            toast.error('Unauthorized metrics connection');
            this.disconnect();
        });
    }

    onConnect() {
        toast.success('Real-time metrics connected', { id: 'metrics-connection' });
    }

    onDisconnect() {
        toast.error('Unable to connect to metrics service', { id: 'metrics-connection' });
    }

    handleMetricsUpdate(data) {
        Object.entries(data).forEach(([key, value]) => {
            this.metricsBuffer.set(key, value);
        });

        if (!this.updateScheduled) {
            this.updateScheduled = true;
            requestAnimationFrame(() => {
                this.emitBufferedUpdates();
                this.updateScheduled = false;
            });
        }
    }

    emitBufferedUpdates() {
        if (this.metricsBuffer.size === 0) return;

        const updates = Object.fromEntries(this.metricsBuffer);
        this.metricsBuffer.clear();

        this.metricsListeners.forEach((callback, event) => {
            if (updates[event]) {
                callback(updates[event]);
            }
        });
    }

    subscribe(metricType, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        this.metricsListeners.set(metricType, callback);
        this.emit('subscribeMetric', metricType);

        return () => this.unsubscribe(metricType);
    }

    unsubscribe(metricType) {
        this.metricsListeners.delete(metricType);
        this.emit('unsubscribeMetric', metricType);
    }

    requestMetrics(metricType, timeRange) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Metrics request timeout'));
            }, 5000);

            this.emit('requestMetrics', { metricType, timeRange }, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.data);
                }
            });
        });
    }

    startRealtimeUpdates(metricTypes) {
        if (!Array.isArray(metricTypes)) {
            metricTypes = [metricTypes];
        }
        metricTypes.forEach(type => this.emit('startRealtimeUpdates', type));
    }

    stopRealtimeUpdates(metricTypes) {
        if (!Array.isArray(metricTypes)) {
            metricTypes = [metricTypes];
        }
        metricTypes.forEach(type => this.emit('stopRealtimeUpdates', type));
    }

    requestHistoricalData(metricType, startDate, endDate) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.emit('requestHistoricalData', {
                metricType,
                startDate,
                endDate
            }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.data);
                }
            });
        });
    }

    disconnect() {
        this.metricsListeners.clear();
        this.metricsBuffer.clear();
        super.disconnect();
    }

    getConnectionStats() {
        return {
            connected: this.connected,
            reconnectAttempts: this.reconnectAttempts,
            bufferedUpdates: this.metricsBuffer.size,
            activeSubscriptions: this.metricsListeners.size
        };
    }
}

const metricsSocket = new MetricsSocketService();

export default metricsSocket;

import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

class MetricsSocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.metricsBuffer = new Map();
        this.updateInterval = 1000; // Update frequency in ms
    }

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(`${process.env.REACT_APP_API_URL}/metrics`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            auth: {
                token: localStorage.getItem('token')
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Metrics socket connected');
            this.reconnectAttempts = 0;
            toast.success('Real-time metrics connected', { id: 'metrics-connection' });
        });

        this.socket.on('disconnect', () => {
            console.log('Metrics socket disconnected');
            this.handleDisconnect();
        });

        this.socket.on('error', (error) => {
            console.error('Metrics socket error:', error);
            toast.error('Metrics connection error', { id: 'metrics-error' });
        });

        this.socket.on('metricsUpdate', (data) => {
            this.handleMetricsUpdate(data);
        });

        // Handle authentication errors
        this.socket.on('unauthorized', () => {
            console.error('Unauthorized metrics connection');
            toast.error('Unauthorized metrics connection');
            this.disconnect();
        });
    }

    handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            toast.error('Unable to connect to metrics service', { id: 'metrics-connection' });
        }
    }

    handleMetricsUpdate(data) {
        // Buffer the updates to prevent too frequent UI updates
        Object.entries(data).forEach(([key, value]) => {
            this.metricsBuffer.set(key, value);
        });

        // Throttle updates using requestAnimationFrame
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

        this.listeners.forEach((callback, event) => {
            if (updates[event]) {
                callback(updates[event]);
            }
        });
    }

    // Subscribe to specific metric updates
    subscribe(metricType, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        this.listeners.set(metricType, callback);

        // Request initial data
        this.socket?.emit('subscribeMetric', metricType);

        return () => {
            this.unsubscribe(metricType);
        };
    }

    unsubscribe(metricType) {
        this.listeners.delete(metricType);
        this.socket?.emit('unsubscribeMetric', metricType);
    }

    // Request specific metric data
    requestMetrics(metricType, timeRange) {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Metrics request timeout'));
            }, 5000);

            this.socket.emit('requestMetrics', { metricType, timeRange }, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.data);
                }
            });
        });
    }

    // Start real-time updates for specific metrics
    startRealtimeUpdates(metricTypes) {
        if (!Array.isArray(metricTypes)) {
            metricTypes = [metricTypes];
        }

        metricTypes.forEach(type => {
            this.socket?.emit('startRealtimeUpdates', type);
        });
    }

    // Stop real-time updates for specific metrics
    stopRealtimeUpdates(metricTypes) {
        if (!Array.isArray(metricTypes)) {
            metricTypes = [metricTypes];
        }

        metricTypes.forEach(type => {
            this.socket?.emit('stopRealtimeUpdates', type);
        });
    }

    // Request historical data for comparison
    requestHistoricalData(metricType, startDate, endDate) {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.socket.emit('requestHistoricalData', {
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

    // Clean up resources
    disconnect() {
        this.listeners.clear();
        this.metricsBuffer.clear();
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
            this.socket = null;
        }
    }

    // Utility method to check connection status
    isConnected() {
        return this.socket?.connected || false;
    }

    // Get current connection stats
    getConnectionStats() {
        return {
            connected: this.isConnected(),
            reconnectAttempts: this.reconnectAttempts,
            bufferedUpdates: this.metricsBuffer.size,
            activeSubscriptions: this.listeners.size
        };
    }
}

// Create singleton instance
const metricsSocket = new MetricsSocketService();

export default metricsSocket;

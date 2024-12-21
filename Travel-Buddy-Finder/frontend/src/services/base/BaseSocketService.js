import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

class BaseSocketService {
    constructor(options = {}) {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.eventHandlers = new Map();
    }

    connect(url, options = {}) {
        if (this.socket?.connected) return;

        this.socket = io(url, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            autoConnect: true,
            ...options
        });

        this.setupBaseEventHandlers();
    }

    setupBaseEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.onConnect();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.connected = false;
            this.handleDisconnect(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.handleConnectionError(error);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.handleError(error);
        });
    }

    handleConnectionError(error) {
        console.error('Connection error:', error);
        if (error.message.includes('authentication')) {
            this.handleAuthError();
        } else {
            this.reconnect();
        }
    }

    handleAuthError() {
        this.reconnectAttempts = this.maxReconnectAttempts;
        if (this.socket) {
            this.socket.disconnect();
        }
        toast.error('Authentication error');
    }

    handleDisconnect(reason) {
        if (reason === 'io server disconnect' || reason === 'transport close') {
            this.reconnect();
        }
    }

    handleError(error) {
        console.error('Socket error:', error);
        toast.error('Connection error occurred');
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.connected) {
                this.connect();
            }
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    }

    on(event, callback) {
        this.eventHandlers.set(event, callback);
        this.socket.on(event, callback);
    }

    off(event) {
        const handler = this.eventHandlers.get(event);
        if (handler) {
            this.socket.off(event, handler);
            this.eventHandlers.delete(event);
        }
    }

    emit(event, data) {
        if (!this.connected) {
            console.error('Not connected, cannot emit event');
            return;
        }
        this.socket.emit(event, data);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // Hook methods to be overridden by child classes
    onConnect() {}
    onDisconnect() {}
}

export default BaseSocketService;

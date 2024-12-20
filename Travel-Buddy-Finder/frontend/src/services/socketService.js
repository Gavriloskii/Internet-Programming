import io from 'socket.io-client';
import { store } from '../redux/store';
import { handleNewMessage, setTypingStatus, updateOnlineStatus } from '../redux/chatSlice';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
    }

    connect() {
        if (this.socket?.connected) return;

        const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

        this.socket = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            autoConnect: true,
            path: '/socket.io',
            auth: {
                credentials: 'include'
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            store.dispatch({ type: 'socket/connected' });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.connected = false;
            store.dispatch({ type: 'socket/disconnected' });
            this.handleDisconnect(reason);
        });

        this.socket.on('message', (messageData) => {
            store.dispatch(handleNewMessage(messageData));
        });

        this.socket.on('typing', ({ conversationId, userId, isTyping }) => {
            store.dispatch(setTypingStatus({ conversationId, userId, isTyping }));
        });

        this.socket.on('presence', ({ userId, status }) => {
            store.dispatch(updateOnlineStatus({ userId, isOnline: status === 'online' }));
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.handleConnectionError(error);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            if (error.message.includes('authentication')) {
                this.handleAuthError();
            }
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
        // Dispatch authentication error action
        store.dispatch({ type: 'socket/authError' });
        
        // Stop reconnection attempts for auth errors
        this.reconnectAttempts = this.maxReconnectAttempts;
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    handleDisconnect(reason) {
        if (reason === 'io server disconnect' || reason === 'transport close') {
            this.reconnect();
        }
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

    sendMessage(message) {
        if (!this.connected) {
            console.error('Not connected, cannot send message');
            return;
        }

        this.socket.emit('message', message);
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

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;

import io from 'socket.io-client';
import { store } from '../redux/store';
import {
    addMessage,
    setTypingStatus,
    updateOnlineStatus,
    addConversation,
    updateConversation
} from '../redux/chatSlice';
import {
    addMatch,
    updateMatch,
    updateMatchStats
} from '../redux/matchesSlice';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.eventHandlers = new Map();
        this.pendingMessages = new Map();
    }

    connect(token) {
        if (this.connected) return;

        const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
        
        this.socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: this.reconnectDelay,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.setupEventHandlers();
        this.startHeartbeat();
    }

    setupEventHandlers() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            store.dispatch({ type: 'socket/connected' });
            this.resendPendingMessages();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.connected = false;
            store.dispatch({ type: 'socket/disconnected' });
            this.handleDisconnect(reason);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            store.dispatch({ type: 'socket/error', payload: error });
        });

        // Chat events
        this.socket.on('message', (message) => {
            store.dispatch(addMessage({
                conversationId: message.conversationId,
                message
            }));
            this.acknowledgePendingMessage(message.id);
        });

        this.socket.on('typing', ({ conversationId, userId, isTyping }) => {
            store.dispatch(setTypingStatus({ conversationId, userId, isTyping }));
        });

        this.socket.on('presence', ({ userId, status }) => {
            store.dispatch(updateOnlineStatus({ userId, isOnline: status === 'online' }));
        });

        // Match events
        this.socket.on('match', (match) => {
            store.dispatch(addMatch(match));
            store.dispatch(addConversation(match.conversation));
        });

        this.socket.on('matchUpdate', (update) => {
            store.dispatch(updateMatch(update));
        });

        this.socket.on('matchStats', (stats) => {
            store.dispatch(updateMatchStats(stats));
        });

        // Group events
        this.socket.on('groupMessage', (message) => {
            store.dispatch(addMessage({
                conversationId: message.groupId,
                message: { ...message, isGroupMessage: true }
            }));
        });

        this.socket.on('groupUpdate', (update) => {
            store.dispatch(updateConversation(update));
        });

        // Custom event handler
        this.socket.onAny((eventName, ...args) => {
            const handler = this.eventHandlers.get(eventName);
            if (handler) {
                handler(...args);
            }
        });
    }

    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.connected) {
                this.socket.emit('heartbeat');
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    handleDisconnect(reason) {
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, attempt reconnection
            this.reconnect();
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        setTimeout(() => {
            console.log(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.socket.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        }
    }

    // Message handling with acknowledgment
    sendMessage(message) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                this.queueMessage(message);
                reject(new Error('Not connected'));
                return;
            }

            this.socket.emit('message', message, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });

            // Add to pending messages with timeout
            this.addPendingMessage(message);
        });
    }

    queueMessage(message) {
        const timestamp = Date.now();
        this.pendingMessages.set(message.id, {
            message,
            timestamp,
            attempts: 0
        });
    }

    addPendingMessage(message) {
        const timeout = setTimeout(() => {
            const pending = this.pendingMessages.get(message.id);
            if (pending && pending.attempts < 3) {
                pending.attempts++;
                this.sendMessage(message); // Retry sending
            } else {
                this.pendingMessages.delete(message.id);
            }
        }, 5000); // 5 second timeout

        this.pendingMessages.set(message.id, {
            message,
            timeout,
            attempts: 0
        });
    }

    acknowledgePendingMessage(messageId) {
        const pending = this.pendingMessages.get(messageId);
        if (pending) {
            if (pending.timeout) {
                clearTimeout(pending.timeout);
            }
            this.pendingMessages.delete(messageId);
        }
    }

    resendPendingMessages() {
        for (const [messageId, { message }] of this.pendingMessages) {
            this.sendMessage(message);
        }
    }

    // Enhanced event handling
    on(event, callback) {
        this.eventHandlers.set(event, callback);
    }

    off(event) {
        this.eventHandlers.delete(event);
    }

    emit(event, data, callback) {
        if (!this.connected) {
            if (callback) {
                callback(new Error('Not connected'));
            }
            return;
        }

        this.socket.emit(event, data, callback);
    }

    // Presence management
    updatePresence(status) {
        if (this.connected) {
            this.socket.emit('presence', status);
        }
    }

    // Group management
    joinGroup(groupId) {
        return new Promise((resolve, reject) => {
            this.socket.emit('joinGroup', groupId, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    leaveGroup(groupId) {
        return new Promise((resolve, reject) => {
            this.socket.emit('leaveGroup', groupId, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Typing indicators
    setTypingStatus(conversationId, isTyping) {
        if (this.connected) {
            this.socket.emit('typing', { conversationId, isTyping });
        }
    }

    // Match interactions
    swipe(userId, direction) {
        return new Promise((resolve, reject) => {
            this.socket.emit('swipe', { userId, direction }, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;

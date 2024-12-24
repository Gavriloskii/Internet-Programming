import store from '../redux/store';
import { handleNewMessage, setTypingStatus, updateOnlineStatus } from '../redux/chatSlice';
import BaseSocketService from './base/BaseSocketService';
import { SOCKET_EVENTS, SOCKET_CONFIG, SOCKET_URLS } from './constants/socketConstants';

class SocketService extends BaseSocketService {
    constructor() {
        super({
            maxReconnectAttempts: SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
            reconnectDelay: SOCKET_CONFIG.RECONNECT_INTERVAL
        });
    }

    connect() {
        const socketUrl = process.env.NODE_ENV === 'production' 
            ? SOCKET_URLS.production 
            : SOCKET_URLS.development;

        super.connect(socketUrl, {
            path: '/socket.io',
            auth: {
                credentials: 'include'
            },
            pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
            pingInterval: SOCKET_CONFIG.PING_INTERVAL
        });
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.on(SOCKET_EVENTS.MESSAGE, (messageData) => {
            store.dispatch(handleNewMessage(messageData));
        });

        this.on(SOCKET_EVENTS.TYPING, ({ conversationId, userId, isTyping }) => {
            store.dispatch(setTypingStatus({ conversationId, userId, isTyping }));
        });

        this.on(SOCKET_EVENTS.PRESENCE, ({ userId, status }) => {
            store.dispatch(updateOnlineStatus({ userId, isOnline: status === 'online' }));
        });
    }

    onConnect() {
        store.dispatch({ type: 'socket/connected' });
    }

    onDisconnect() {
        store.dispatch({ type: 'socket/disconnected' });
    }

    handleAuthError() {
        super.handleAuthError();
        store.dispatch({ type: 'socket/authError' });
    }

    sendMessage(message) {
        this.emit(SOCKET_EVENTS.MESSAGE, message);
    }

    swipe(userId, direction) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            this.emit(SOCKET_EVENTS.SWIPE, { targetUserId: userId, direction });
            
            const timeout = setTimeout(() => {
                this.off(SOCKET_EVENTS.SWIPE_RESULT);
                reject(new Error('Swipe response timeout'));
            }, 5000);

            this.on(SOCKET_EVENTS.SWIPE_RESULT, (response) => {
                clearTimeout(timeout);
                this.off(SOCKET_EVENTS.SWIPE_RESULT);
                
                if (!response.success) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    setTypingStatus(conversationId, isTyping) {
        this.emit(SOCKET_EVENTS.TYPING, { conversationId, isTyping });
    }

    updatePresence(status) {
        this.emit(SOCKET_EVENTS.PRESENCE, { status });
    }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;

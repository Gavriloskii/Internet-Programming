import { store } from '../redux/store';
import { handleNewMessage, setTypingStatus, updateOnlineStatus } from '../redux/chatSlice';
import BaseSocketService from './base/BaseSocketService';

class SocketService extends BaseSocketService {
    constructor() {
        super({
            maxReconnectAttempts: 5,
            reconnectDelay: 1000
        });
    }

    connect() {
        const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
        super.connect(socketUrl, {
            path: '/socket.io',
            auth: {
                credentials: 'include'
            }
        });
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.on('message', (messageData) => {
            store.dispatch(handleNewMessage(messageData));
        });

        this.on('typing', ({ conversationId, userId, isTyping }) => {
            store.dispatch(setTypingStatus({ conversationId, userId, isTyping }));
        });

        this.on('presence', ({ userId, status }) => {
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
        this.emit('message', message);
    }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;

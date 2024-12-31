class BaseSocketService {
    constructor(options = {}) {
        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.MAX_RECONNECT_ATTEMPTS = options.maxReconnectAttempts || 5;
        this.RECONNECT_INTERVAL = options.reconnectDelay || 1000;
    }

    handleDisconnect(userId) {
        const attempts = this.reconnectAttempts.get(userId) || 0;
        
        if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
            setTimeout(() => {
                this.attemptReconnect(userId, attempts + 1);
            }, this.RECONNECT_INTERVAL * Math.pow(2, attempts));
        }
    }

    async attemptReconnect(userId, attempts) {
        try {
            if (!this.connections.has(userId)) {
                this.reconnectAttempts.set(userId, attempts);
                console.log(`Attempting to reconnect user ${userId}, attempt ${attempts}`);
                await this.onAttemptReconnect(userId);
            }
        } catch (error) {
            console.error(`Reconnection attempt failed for user ${userId}:`, error);
        }
    }

    handleError(userId, error) {
        console.error(`Error for user ${userId}:`, error);
        const userSocket = this.connections.get(userId);
        
        if (userSocket) {
            userSocket.emit('error', {
                message: 'An error occurred. Attempting to reconnect...'
            });
        }

        this.handleDisconnect(userId);
    }

    broadcast(event, data, excludeUser = null) {
        this.connections.forEach((socket, userId) => {
            if (userId !== excludeUser) {
                socket.emit(event, data);
            }
        });
    }

    getActiveConnectionsCount() {
        return this.connections.size;
    }

    isUserConnected(userId) {
        return this.connections.has(userId.toString());
    }

    // Hook methods to be overridden by child classes
    async onAttemptReconnect(userId) {}
}

module.exports = BaseSocketService;

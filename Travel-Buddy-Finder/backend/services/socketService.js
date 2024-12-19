const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Match = require('../models/Match');
const User = require('../models/User');

class SocketService {
    constructor() {
        this.io = null;
        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.RECONNECT_INTERVAL = 1000;
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Cookie', 'cookie', 'authorization']
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            cookie: {
                name: 'jwt',
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production'
            }
        });

        this.io.use(this.authenticateSocket.bind(this));
        this.io.on('connection', this.handleConnection.bind(this));

        console.log('Socket.IO service initialized');
    }

    async authenticateSocket(socket, next) {
        try {
            // Get token from cookie
            const cookies = socket.handshake.headers.cookie?.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
            }, {});

            const token = cookies?.jwt;

            if (!token) {
                console.error('No token found in cookies:', cookies);
                return next(new Error('Authentication error: No token found'));
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('_id name');
                
                if (!user) {
                    console.error('User not found for token:', decoded);
                    return next(new Error('User not found'));
                }

                socket.user = user;
                console.log('Socket authenticated for user:', user._id);
                next();
            } catch (jwtError) {
                console.error('JWT verification error:', jwtError, 'Token:', token);
                return next(new Error('Invalid token'));
            }
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    }

    handleConnection(socket) {
        const userId = socket.user._id.toString();
        console.log(`User connected: ${userId}`);

        // Store connection
        this.connections.set(userId, socket);
        this.reconnectAttempts.delete(userId);

        // Handle swipe events
        socket.on('swipe', async (data) => {
            try {
                const { targetUserId, direction } = data;
                const result = await this.handleSwipe(socket.user._id, targetUserId, direction);
                
                if (result.isMatch) {
                    this.notifyMatch(result.match);
                }
                
                socket.emit('swipeResult', { success: true, ...result });
            } catch (error) {
                console.error('Swipe error:', error);
                socket.emit('swipeResult', { 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId}`);
            this.connections.delete(userId);
            this.handleDisconnect(userId);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`Socket error for user ${userId}:`, error);
            this.handleError(userId, error);
        });
    }

    async handleSwipe(userId, targetUserId, direction) {
        try {
            if (direction === 'left') {
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { rejectedMatches: targetUserId }
                });
                return { isMatch: false };
            }

            // Check if target user has already liked current user
            const existingMatch = await Match.findOne({
                users: { $all: [userId, targetUserId] }
            });

            if (existingMatch) {
                return { isMatch: true, match: existingMatch };
            }

            // Create potential match
            const [currentUser, targetUser] = await Promise.all([
                User.findById(userId).select('travelPreferences personalityType'),
                User.findById(targetUserId).select('travelPreferences personalityType likes')
            ]);

            if (!currentUser || !targetUser) {
                throw new Error('User not found');
            }

            const newMatch = new Match({
                users: [userId, targetUserId],
                status: targetUser.likes.includes(userId) ? 'accepted' : 'pending'
            });

            // Calculate match score with error handling
            try {
                const matchScore = newMatch.calculateMatchScore(
                    currentUser.travelPreferences,
                    targetUser.travelPreferences
                );
                newMatch.matchScore = matchScore;
            } catch (error) {
                console.error('Error calculating match score:', error);
                newMatch.matchScore = 50; // Default score on error
            }

            // Save the match
            await newMatch.save();

            // If target user already liked current user, it's a match
            if (targetUser.likes.includes(userId)) {
                return { 
                    isMatch: true, 
                    matchScore: newMatch.matchScore,
                    match: newMatch
                };
            }

            // Add to likes
            await User.findByIdAndUpdate(userId, {
                $addToSet: { likes: targetUserId }
            });

            return { 
                isMatch: false, 
                matchScore: newMatch.matchScore,
                match: newMatch
            };
        } catch (error) {
            console.error('Error in handleSwipe:', error);
            throw error;
        }
    }

    notifyMatch(match) {
        match.users.forEach(userId => {
            const userSocket = this.connections.get(userId.toString());
            if (userSocket) {
                userSocket.emit('match', {
                    matchId: match._id,
                    matchScore: match.matchScore,
                    users: match.users
                });
            }
        });
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
            const user = await User.findById(userId);
            if (!user) return;

            if (!this.connections.has(userId)) {
                this.reconnectAttempts.set(userId, attempts);
                // Attempt to reconnect logic here
                console.log(`Attempting to reconnect user ${userId}, attempt ${attempts}`);
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

    // Utility method to broadcast to all connected users
    broadcast(event, data, excludeUser = null) {
        this.connections.forEach((socket, userId) => {
            if (userId !== excludeUser) {
                socket.emit(event, data);
            }
        });
    }

    // Method to get active connections count
    getActiveConnectionsCount() {
        return this.connections.size;
    }

    // Method to check if a user is connected
    isUserConnected(userId) {
        return this.connections.has(userId.toString());
    }
}

module.exports = new SocketService();
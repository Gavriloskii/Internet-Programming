const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const Match = require('../models/Match');
const User = require('../models/User');
const BaseSocketService = require('./base/BaseSocketService');
const { SOCKET_EVENTS, SOCKET_CONFIG, COOKIE_CONFIG } = require('./constants/socketConstants');

class SocketService extends BaseSocketService {
    constructor() {
        super({
            maxReconnectAttempts: SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
            reconnectDelay: SOCKET_CONFIG.RECONNECT_INTERVAL
        });
        this.io = null;
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' 
                    ? process.env.FRONTEND_URL 
                    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Cookie', 'cookie', 'authorization']
            },
            pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
            pingInterval: SOCKET_CONFIG.PING_INTERVAL,
            cookie: COOKIE_CONFIG
        });

        this.io.use(this.authenticateSocket.bind(this));
        this.io.on(SOCKET_EVENTS.CONNECTION, this.handleConnection.bind(this));

        console.log('Socket.IO service initialized');
    }

    async authenticateSocket(socket, next) {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error('Authentication error: No cookies found'));
            }

            const cookies = cookie.parse(cookieHeader);
            const signedCookies = cookieParser.signedCookies(cookies, process.env.COOKIE_SECRET);
            const token = signedCookies.jwt;

            if (!token) {
                return next(new Error('Authentication error: No token found'));
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('_id name');
                
                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.user = user;
                next();
            } catch (jwtError) {
                console.error('JWT verification error:', jwtError);
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
        socket.on(SOCKET_EVENTS.SWIPE, async (data) => {
            try {
                const { targetUserId, direction } = data;
                const result = await this.handleSwipe(socket.user._id, targetUserId, direction);
                
                if (result.isMatch) {
                    this.notifyMatch(result.match);
                }
                
                socket.emit(SOCKET_EVENTS.SWIPE_RESULT, { success: true, ...result });
            } catch (error) {
                console.error('Swipe error:', error);
                socket.emit(SOCKET_EVENTS.SWIPE_RESULT, { 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Handle disconnection
        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log(`User disconnected: ${userId}`);
            this.connections.delete(userId);
            super.handleDisconnect(userId);
        });

        // Handle errors
        socket.on(SOCKET_EVENTS.ERROR, (error) => {
            console.error(`Socket error for user ${userId}:`, error);
            super.handleError(userId, error);
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

            const existingMatch = await Match.findOne({
                users: { $all: [userId, targetUserId] }
            });

            if (existingMatch) {
                return { isMatch: true, match: existingMatch };
            }

            const [currentUser, targetUser] = await Promise.all([
                User.findById(userId).select('travelPreferences personalityType likes'),
                User.findById(targetUserId).select('travelPreferences personalityType likes')
            ]);

            if (!currentUser || !targetUser) {
                throw new Error('User not found');
            }

            if (!targetUser.likes) {
                targetUser.likes = [];
            }

            const newMatch = new Match({
                users: [userId, targetUserId],
                status: targetUser.likes.includes(userId) ? 'accepted' : 'pending'
            });

            try {
                const matchScore = newMatch.calculateMatchScore(
                    currentUser.travelPreferences,
                    targetUser.travelPreferences
                );
                newMatch.matchScore = matchScore;
            } catch (error) {
                console.error('Error calculating match score:', error);
                newMatch.matchScore = 50;
            }

            await newMatch.save();

            if (targetUser.likes.includes(userId)) {
                return { 
                    isMatch: true, 
                    matchScore: newMatch.matchScore,
                    match: newMatch
                };
            }

            await User.findByIdAndUpdate(userId, 
                { $addToSet: { likes: targetUserId } },
                { upsert: true, setDefaultsOnInsert: true }
            );

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
                userSocket.emit(SOCKET_EVENTS.MATCH, {
                    matchId: match._id,
                    matchScore: match.matchScore,
                    users: match.users
                });
            }
        });
    }

    async onAttemptReconnect(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found during reconnection');
        }
    }
}

module.exports = new SocketService();

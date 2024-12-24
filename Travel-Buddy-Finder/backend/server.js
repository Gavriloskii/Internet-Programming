const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
const path = require('path');
const SocketService = require('./services/socketService');
const authRoutes = require('./routes/auth');
const { setupSecurity } = require('./middleware/security');
const { errorHandler } = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for secure cookies
app.set('trust proxy', 1);

// CORS configuration with credentials support
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Cookie parser middleware with signed cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(compression());

// Set default cookie options
app.use((req, res, next) => {
    res.cookie = res.cookie.bind(res);
    const defaultCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        signed: true,
        // Remove domain setting in development
        ...(process.env.NODE_ENV === 'production' && {
            domain: process.env.DOMAIN
        }),
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };
    
    const originalCookie = res.cookie;
    res.cookie = function(name, value, options = {}) {
        return originalCookie.call(this, name, value, { ...defaultCookieOptions, ...options });
    };
    next();
});

// Setup security middleware
setupSecurity(app);

// MongoDB connection with enhanced options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-buddy-finder';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Handle MongoDB events
mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
});

// Import all route modules
const groupsRoutes = require('./routes/groups');
const journalsRoutes = require('./routes/journals');
const matchesRoutes = require('./routes/matches');
const analyticsRoutes = require('./routes/analytics');

// Rate limiting for analytics
const analyticsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many analytics events from this IP, please try again later.'
});

// API Routes
app.use('/api/auth', authRoutes);
// Protected routes
app.use('/api/groups', protect, groupsRoutes);
app.use('/api/journals', protect, journalsRoutes);
app.use('/api/matches', protect, matchesRoutes);
app.use('/api/analytics', protect, analyticsLimiter, analyticsRoutes);

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Documentation route
app.get('/api/docs', (req, res) => {
    res.json({
        version: '1.0.0',
        description: 'Travel Buddy Finder API Documentation',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register',
                logout: 'POST /api/auth/logout',
                refreshToken: 'POST /api/auth/refresh-token'
            }
        }
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Travel Buddy Finder API is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Handle undefined routes
app.all('*', (req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    err.status = 'fail';
    err.statusCode = 404;
    next(err);
});

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async () => {
    try {
        console.log('Received shutdown signal. Closing HTTP server...');
        await new Promise(resolve => server.close(resolve));
        console.log('HTTP server closed.');
        
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }

    // Force close after 10s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Handle various shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

// Create HTTP server
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

// Initialize Socket.IO
const socketService = require('./services/socketService');
socketService.initialize(server);

// Start server
server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;

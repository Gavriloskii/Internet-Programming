const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Specific limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 10000 : 60, // Much higher limit in development
    message: 'Too many login attempts from this IP, please try again after a minute',
    skipFailedRequests: true // Don't count failed requests in development
});

// Security middleware setup
const setupSecurity = (app) => {
    // Basic security headers with development-friendly CSP
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // Enhanced security headers
    app.use((req, res, next) => {
        // Basic security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Allow credentials in CORS
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
            res.status(204).end();
            return;
        }
        
        next();
    });

    // Rate limiting only in production
    if (process.env.NODE_ENV === 'production') {
        app.use('/api/', limiter);
        app.use('/api/auth/', authLimiter);
    }
};

module.exports = {
    setupSecurity,
    authLimiter
};

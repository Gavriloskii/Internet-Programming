const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const xss = require('xss-clean');
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
    max: process.env.NODE_ENV === 'development' ? 1000 : 60, // Higher limit in development
    message: 'Too many login attempts from this IP, please try again after a minute'
});

// CSRF protection middleware with updated cookie settings
const csrfProtection = csrf({ 
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Always use lax to support cross-site login
        httpOnly: true,
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});

// Security middleware setup
const setupSecurity = (app) => {
    // Basic security headers with development-friendly CSP
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Enhanced rate limiting with separate limits for different endpoints
    app.use('/api/', (req, res, next) => {
        // Skip rate limiting for CSRF token endpoint
        if (req.path === '/csrf-token') {
            return next();
        }
        limiter(req, res, next);
    });
    app.use('/api/auth/', (req, res, next) => {
        // Skip rate limiting for auth routes in development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }
        authLimiter(req, res, next);
    });
    app.use('/api/messages', rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // Limit each IP to 30 messages per minute
        message: 'Message rate limit exceeded. Please wait before sending more messages.'
    }));

    // Separate rate limits for different match operations
    app.use('/api/matches/potential', rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // Limit match fetching
        message: 'Too many match requests. Please wait before fetching more matches.'
    }));

    app.use('/api/matches/:userId', rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 120, // Allow more swipes
        message: 'Swipe rate limit exceeded. Please wait before swiping more.',
        skipFailedRequests: true
    }));

    // Data sanitization against XSS
    app.use(xss());

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // CSRF protection setup with proper error handling
    app.use((req, res, next) => {
        // Skip CSRF for auth routes and OPTIONS requests
        if (
            req.method === 'OPTIONS' ||
            req.path.startsWith('/api/auth/')
        ) {
            return next();
        }
        csrfProtection(req, res, next);
    });
    
    // Endpoint to get CSRF token with proper cookie settings
    app.get('/api/csrf-token', csrfProtection, (req, res) => {
        res.cookie('XSRF-TOKEN', req.csrfToken(), {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            httpOnly: false,
            path: '/',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.json({ csrfToken: req.csrfToken() });
    });

    // Enhanced security headers
    app.use((req, res, next) => {
        // Basic security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=self camera=() microphone=() payment=()');
        
        // Allow credentials in CORS
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
            res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
            res.status(204).end();
            return;
        }
        
        next();
    });

    // Error handler for CSRF token errors
    app.use((err, req, res, next) => {
        if (err.code === 'EBADCSRFTOKEN') {
            return res.status(403).json({
                error: 'Invalid CSRF token',
                message: 'Form submission failed. Please try again.'
            });
        }
        next(err);
    });
};

module.exports = {
    setupSecurity,
    authLimiter,
    csrfProtection
};

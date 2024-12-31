const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const socketService = require('./services/socketService');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

// Create the express app
const app = express();
const server = http.createServer(app);

// Configure static file serving for uploads
const uploadsPath = path.join(__dirname, 'public', 'uploads');
const profilePicsPath = path.join(uploadsPath, 'profile-pictures');

// Create necessary directories
[uploadsPath, profilePicsPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created directory:', dir);
    }
});

// Set proper permissions for directories
[uploadsPath, profilePicsPath].forEach(dir => {
    try {
        fs.chmodSync(dir, '755');
        console.log('Set permissions for directory:', dir);
    } catch (error) {
        console.error('Error setting directory permissions:', error);
    }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.set('Cache-Control', 'no-cache');
    }
}));

// Serve static files from the uploads directories with proper headers
app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.set('Cache-Control', 'no-cache');
    }
}));

app.use('/uploads/profile-pictures', express.static(profilePicsPath, {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
        res.set('Cache-Control', 'no-cache');
    }
}));

// Security middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Set-Cookie'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware
app.use(cookieParser(process.env.JWT_SECRET)); // Use JWT_SECRET for signing cookies

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const matchRoutes = require('./routes/matches');
const groupRoutes = require('./routes/groups');
const journalRoutes = require('./routes/journals');
const analyticsRoutes = require('./routes/analytics');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/analytics', analyticsRoutes);

// Initialize socket.io
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Socket.io connection handling
socketService.initialize(io);

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const config = require('./config/config');
const { pool } = require('./config/database');
const scheduler = require('./services/scheduler');
const { configurePassport, ensureAuthenticated } = require('./config/auth');

// Import routes
const apiRoutes = require('./routes/api');
const verificationRoutes = require('./routes/verificationForm');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const enhancedRoutes = require('./routes/enhanced');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: config.security.jwtSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: config.server.env === 'production' }
}));

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api', enhancedRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);

// Serve verification form
app.get('/verification/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verificationForm.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard (protected)
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-enhanced.html'));
});

// Root route
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize scheduler
scheduler.initializeScheduler();

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Partner Retreat Automation System');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Server running on port ${PORT}`);
    console.log(`  Environment: ${config.server.env}`);
    console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

module.exports = app;

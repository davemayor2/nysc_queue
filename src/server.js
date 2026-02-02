const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const queueRoutes = require('./routes/queue');
const { generalLimiter } = require('./middleware/rateLimiter');
const { 
  validateHeaders, 
  enforceHTTPS, 
  preventSensitiveDataInURL 
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://va.vercel-scripts.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://va.vercel-scripts.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS - Configure allowed origins
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN || 'https://yourdomain.com'
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json({ limit: '10kb' })); // Limit body size

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Custom security middleware
app.use(enforceHTTPS);
app.use(preventSensitiveDataInURL);
app.use(validateHeaders);

// Apply general rate limiting to all requests
app.use(generalLimiter);

// ============================================
// STATIC FILES - Serve frontend
// ============================================
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// API ROUTES
// ============================================
app.use('/api/queue', queueRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ROOT ROUTE - Serve frontend
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('🚀 NYSC Queue Management System');
  console.log('===========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log('===========================================\n');
  console.log('📍 Geofencing: ENABLED');
  console.log('🔐 Device Fingerprinting: ENABLED');
  console.log('⏱️  Rate Limiting: ENABLED');
  console.log('🛡️  Security Headers: ENABLED');
  console.log('\n===========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;

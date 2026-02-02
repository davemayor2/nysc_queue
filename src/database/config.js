const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Database Configuration
 * Supports both DATABASE_URL (for Vercel/cloud) and individual credentials (for local)
 */
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        // Cloud deployment (Vercel, Heroku, etc.) using DATABASE_URL
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        // Local development using individual credentials
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nysc_queue',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// Test database connection
pool.on('connect', () => {
  console.log('✓ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;

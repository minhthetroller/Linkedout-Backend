const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: process.env.NODE_ENV === 'test' ? 5 : 20, // Fewer connections in test
  idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 1000 : 30000, // Faster cleanup in test
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'test' ? false : {
    rejectUnauthorized: false, // Required for AWS RDS
  },
});

// Test the connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

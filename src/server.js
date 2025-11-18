require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Test database connection
const testDatabaseConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('Please check your database configuration in .env file');
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  // Test database connection before starting server
  await testDatabaseConnection();

  app.listen(PORT, () => {
    console.log('==========================================');
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log('==========================================');
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  pool.end(() => {
    console.log('✓ Database pool closed');
    process.exit(0);
  });
});

startServer();

// Test setup configuration
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for all tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  createTestUser: (type = 'seeker') => ({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    user_type: type,
    full_name: `Test ${type}`,
    birth_date: '1990-01-01'
  }),

  createTestJob: () => ({
    title: 'Test Job Position',
    description: 'Looking for talented developers with React and Node.js experience',
    about: 'Great company culture',
    salary_min: 80000,
    salary_max: 120000,
    location: 'San Francisco, CA',
    employment_type: 'Full-time',
    benefits: 'Health insurance, 401k'
  })
};

// Cleanup handlers
afterAll(async () => {
  // Clean up any database connections
  const pool = require('../src/config/database');
  if (pool && pool.end) {
    await pool.end();
  }
  
  // Allow time for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});

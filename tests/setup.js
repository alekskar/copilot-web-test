// Test setup file
const { database } = require('../server/utils/database');

beforeAll(async () => {
  // Use test database
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  await database.connect();
  
  // Clear test data
  await database.run('DELETE FROM tasks');
  await database.run('DELETE FROM users');
});

afterAll(async () => {
  await database.close();
});
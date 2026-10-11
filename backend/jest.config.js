module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/scripts/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
};

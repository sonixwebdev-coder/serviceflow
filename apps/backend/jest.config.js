module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/__tests__/**'],
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).js'],
};

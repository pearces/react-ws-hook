const { WebSocketServer } = require('ws'); // eslint-disable-line import/no-extraneous-dependencies

module.exports = {
  rootDir: './src',
  testMatch: [
    '**/__tests__/**/*.js?(x)',
    '**/?(*.)+(spec|test).js?(x)'
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverage: true,
  collectCoverageFrom: ['**/*.{js,jsx}'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '__mocks__',
    'coverage'
  ],
  testEnvironment: 'jsdom',
  globals: {
    WebSocketServer // pass this from a commonjs import to avoid browser detection with jsdom
  }
};

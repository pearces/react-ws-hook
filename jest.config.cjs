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
  testEnvironment: 'jsdom'
};

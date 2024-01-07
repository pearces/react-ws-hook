/** @type {import('ts-jest').JestConfigWithTsJest} */
const { WebSocketServer } = require('ws'); // eslint-disable-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires

module.exports = {
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverage: true,
  collectCoverageFrom: ['**/*.{ts,tsx,js,jsx}'],
  coveragePathIgnorePatterns: ['/node_modules/', '__mocks__', 'coverage'],
  testEnvironment: 'jsdom',
  globals: {
    WebSocketServer // pass this from a commonjs import to avoid browser detection with jsdom
  },
  preset: 'ts-jest',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest'
  }
};

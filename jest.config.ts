import type { Config } from 'jest';
import { WebSocketServer } from 'ws';

const config: Config = {
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

export default config;

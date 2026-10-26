/** Jest configuration — TypeScript unit tests for the Khuluma API. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2021',
        module: 'commonjs',
        esModuleInterop: true,
        skipLibCheck: true
      }
    }]
  }
};

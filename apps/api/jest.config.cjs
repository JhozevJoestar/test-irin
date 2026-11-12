module.exports = {
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { useESM: true, tsconfig: { module: 'ESNext' } },
    ],
  },
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  testTimeout: 30000,
};

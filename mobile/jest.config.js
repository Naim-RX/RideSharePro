const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.js'],
  transform: {
    ...expoPreset.transform,
    '\\.mjs$': expoPreset.transform['\\.[jt]sx?$'],
  },
};

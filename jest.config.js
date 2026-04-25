// Jest configuration for the mobile app.
// Preset comes from `jest-expo`, which wires up the React Native transformer
// chain and the Expo module mocks. We only override what we need on top.
module.exports = {
  preset: 'jest-expo',
  // Loaded after the test framework env is installed so `jest.mock(...)`
  // calls in the setup file resolve correctly.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // RN packages ship as ESM/Flow — they must be transformed.
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@react-navigation|@gorhom/bottom-sheet|react-native-reanimated|react-native-worklets|@react-native-community|nativewind|react-native-css-interop|uuid)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'utils/**/*.ts',
    'context/**/*.{ts,tsx}',
    'hooks/**/*.ts',
    '!**/*.d.ts',
  ],
};

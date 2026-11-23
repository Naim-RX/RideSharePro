const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['**/*.test.js', 'jest.setup.js'],
    languageOptions: { globals: { describe: 'readonly', test: 'readonly', expect: 'readonly', jest: 'readonly' } },
  },
]);

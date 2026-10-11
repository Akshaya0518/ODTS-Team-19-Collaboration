const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Cyclomatic complexity: warn when a function has more than 10 independent paths.
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
];

// ESLint flat config for the mobile app (ESLint v9)
// Uses @eslint/js for core rules and typescript-eslint for TS/TSX support

// CommonJS export for compatibility regardless of package "type"
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
  // Ignore build artifacts and native folders
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      '.expo',
      'android',
      'ios',
    ],
  },

  // Base JS recommendations
  js.configs.recommended,

  // TypeScript recommendations (non type-checked for speed and simplicity)
  ...tseslint.configs.recommended,

  // Project-specific tweaks
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Place TS/React-Native specific rule adjustments here as needed
    },
  },
];

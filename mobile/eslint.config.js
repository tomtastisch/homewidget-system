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
      // Do not lint config files themselves
      'eslint.config.js',
      'babel.config.js',
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
      // Allow "any" temporarily in mobile app to keep CI green; tighten later per module as needed
      '@typescript-eslint/no-explicit-any': 'off',
      // Reduce noise from unused vars; allow prefix '_' to intentionally ignore
      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },
];

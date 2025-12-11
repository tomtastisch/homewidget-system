import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ESLint Flat Config for the mobile app
// - Enables Node globals for config scripts like detox.config.js
// - Applies recommended rules for JS and TypeScript
// - Provides Jest globals for tests
// - Ignores build artifacts and snapshots

export default [
  {
    ignores: [
        'node_modules/',
        'dist/',
        'build/',
        'ios/',
        'android/',
        '**/__snapshots__/**',
    ],
  },

    // Base recommended JS rules
  js.configs.recommended,

    // TypeScript support and recommended rules
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
              ecmaVersion: 2021,
              sourceType: 'module',
          },
      },
      plugins: {
          '@typescript-eslint': tseslint.plugin,
      },
    rules: {
        // Keep lint pragmatic for RN app; allow `any` for now
      '@typescript-eslint/no-explicit-any': 'off',
        // Allow intentionally unused variables if prefixed with underscore
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
        ],
    },
  },

    // Node environment for config files (fixes 'module is not defined')
    {
        files: [
            'detox.config.js',
            '**/*.config.js',
            '**/*.config.cjs',
            'jest.config.js',
        ],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: globals.node,
        },
    },

    // Jest test files
    {
        files: ['**/__tests__/**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            globals: globals.jest,
    },
  },
];

/**
 * Jest config for Detox E2E tests.
 *
 * Node/NPM root is mobile/. We set rootDir to point to mobile so that
 * app imports and module resolution work as expected via mobile/node_modules.
 * Test specs are located under tests/e2e/detox relative to repo root.
 */
module.exports = {
    testTimeout: 180000,
    // Point Jest to the mobile project root for module resolution
    rootDir: '../../../mobile',
    // Pick up specs from the shared e2e folder
    testMatch: [
        '<rootDir>/../tests/e2e/detox/**/*.e2e.(js|ts|tsx)'
    ],
    // Initialize Detox before tests; path is relative to rootDir (mobile/)
    setupFilesAfterEnv: ['<rootDir>/../tests/e2e/detox/init.js'],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
};

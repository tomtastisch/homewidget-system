/* eslint-env node */

/**
 * Detox configuration for iOS Simulator using Expo Dev Client
 * Specs are colocated in the repository root under tests/e2e/detox
 * API base URL is configurable via env E2E_API_BASE_URL (default 127.0.0.1:8100)
 */
/** @type {import('detox').DetoxConfig} */
module.exports = {
    testRunner: {
        args: {
            $0: 'jest',
            // Point to shared Detox Jest config under tests/e2e/detox (relative to mobile/)
            config: '../tests/e2e/detox/jest.config.js',
        },
        jest: {
            setupTimeout: 120000,
        },
    },
    apps: {
        'ios.sim.debug': {
            type: 'ios.app',
            binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/HomeWidget.app',
            build: 'xcodebuild -workspace ios/HomeWidget.xcworkspace -scheme HomeWidget -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
        },
    },
    devices: {
        'simulator.ios': {
            type: 'ios.simulator',
            device: {
                type: 'iPhone 15',
            },
        },
    },
    configurations: {
        'ios.sim.debug': {
            device: 'simulator.ios',
            app: 'ios.sim.debug',
        },
    },
};
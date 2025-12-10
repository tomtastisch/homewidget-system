/**
 * Detox configuration for iOS Simulator using Expo Dev Client
 * Requires: `expo prebuild -p ios` once to generate the ios project.
 */
/** @type {Detox.DetoxConfig} */
module.exports = {
    testRunner: {
        args: {
            $0: 'jest',
            config: 'e2e/jest.config.js',
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

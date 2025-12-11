/* eslint-disable @typescript-eslint/no-var-requires */
// Detox Jest init – relocated under tests/e2e/detox
// Note: Node/NPM root is mobile/. When this file is loaded via Jest (rootDir set to mobile),
// relative imports inside this file resolve from its own path. We therefore reference
// the Detox config from ../../../mobile/detox.config.js

const detox = require('detox');
const config = require('../../../mobile/detox.config');

jest.setTimeout(120000);

beforeAll(async () => {
    await detox.init(config, {initGlobals: false});
    // Expose Detox helpers to global
    global.device = detox.device;
    global.element = detox.element;
    global.by = detox.by;
    global.expect = detox.expect;
});

afterAll(async () => {
    await detox.cleanup();
});

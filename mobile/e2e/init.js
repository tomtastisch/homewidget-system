/* eslint-disable @typescript-eslint/no-var-requires */
const detox = require('detox');
const config = require('../detox.config');

jest.setTimeout(120000);

beforeAll(async () => {
    await detox.init(config, {initGlobals: false});
    // Add Detox matchers/expect to Jest globals
    // eslint-disable-next-line no-undef
    global.device = detox.device;
    // eslint-disable-next-line no-undef
    global.element = detox.element;
    // eslint-disable-next-line no-undef
    global.by = detox.by;
    // eslint-disable-next-line no-undef
    global.expect = detox.expect;
});

afterAll(async () => {
    await detox.cleanup();
});

/*
  Detox E2E: Logout-Flow
  Annahmen testIDs:
  - login.screen, login.email, login.password, login.submit
  - home.screen, home.logout
*/
describe('Logout Flow', () => {
    beforeAll(async () => {
        await device.launchApp({newInstance: true});
    });

    it('logs out and returns to login screen', async () => {
        await expect(element(by.id('login.screen'))).toBeVisible();
        await element(by.id('login.email')).replaceText('demo@example.com');
        await element(by.id('login.password')).replaceText('demo1234');
        await element(by.id('login.submit')).tap();

        await waitFor(element(by.id('home.screen')))
            .toBeVisible()
            .withTimeout(10000);

        await element(by.id('home.logout')).tap();
        await expect(element(by.id('login.screen'))).toBeVisible();

        // Optional: weiterer Zugriff ohne Login führt zurück zum Login
        // (abhängig von App-Navigation; hier nur symbolisch)
        await device.reloadReactNative();
        await expect(element(by.id('login.screen'))).toBeVisible();
    });
});

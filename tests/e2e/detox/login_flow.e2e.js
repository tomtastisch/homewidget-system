/*
  Detox E2E: Login-Flow
  Annahmen zu testID/accessibilityLabel in der App (falls nicht vorhanden, bitte ergänzen):
  - TextInput E-Mail: testID="login.email"
  - TextInput Passwort: testID="login.password"
  - Button Login: testID="login.submit"
  - Home-Screen Root: testID="home.screen"
*/
describe('Login Flow', () => {
    beforeAll(async () => {
        await device.launchApp({
            newInstance: true,
            permissions: {notifications: 'YES'},
            // E2E API URL für App-Builds via Expo-Config setzen (Build-Zeit). Alternativ in App-Code testIDs/API injizieren.
        });
    });

    it('logs in with demo user and navigates to Home', async () => {
        await expect(element(by.id('login.screen'))).toBeVisible();

        await element(by.id('login.email')).replaceText('demo@example.com');
        await element(by.id('login.password')).replaceText('demo1234');
        await element(by.id('login.submit')).tap();

        await waitFor(element(by.id('home.screen')))
            .toBeVisible()
            .withTimeout(10000);

        // Keine Fehler-Dialoge sichtbar
        await expect(element(by.id('error.dialog'))).not.toBeVisible();
    });
});

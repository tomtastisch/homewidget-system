/*
  Detox E2E: Register-Flow
  Testet die Registrierung und Navigation zur Login-Screen danach.
*/
describe('Register Flow', () => {
    beforeAll(async () => {
        await device.launchApp({
            newInstance: true,
            permissions: {notifications: 'YES'},
        });
    });

    it('registers new user and navigates to Login screen', async () => {
        // Zur Register-Screen navigieren
        await element(by.id('login.registerLink')).tap();
        await expect(element(by.id('register.screen'))).toBeVisible();

        // Formulardaten eingeben
        const testEmail = `user_${Date.now()}@example.com`;
        await element(by.id('register.email')).replaceText(testEmail);
        await element(by.id('register.password')).replaceText('TestPassword123!');

        // Submit-Button drücken
        await element(by.id('register.submit')).tap();

        // Sollte zur Login-Screen navigiert werden
        await waitFor(element(by.id('login.screen')))
            .toBeVisible()
            .withTimeout(5000);
    });

    it('shows error on duplicate email registration', async () => {
        // Zur Register-Screen navigieren
        await element(by.id('login.registerLink')).tap();
        await expect(element(by.id('register.screen'))).toBeVisible();

        // Mit existierender E-Mail registrieren (von vorherigem Test)
        await element(by.id('register.email')).replaceText('demo@example.com');
        await element(by.id('register.password')).replaceText('TestPassword123!');

        // Submit
        await element(by.id('register.submit')).tap();

        // Fehlertext sollte angezeigt werden
        await waitFor(element(by.text('E‑Mail ist bereits registriert')))
            .toBeVisible()
            .withTimeout(5000);

        // Sollte noch auf Register-Screen sein
        await expect(element(by.id('register.screen'))).toBeVisible();
    });

    it('can switch from Register to Login via link', async () => {
        // Zur Register-Screen navigieren
        await element(by.id('login.registerLink')).tap();
        await expect(element(by.id('register.screen'))).toBeVisible();

        // Auf "Zum Login" Link klicken
        await element(by.id('register.loginLink')).tap();

        // Sollte zur Login-Screen navigiert werden
        await expect(element(by.id('login.screen'))).toBeVisible();
    });
});


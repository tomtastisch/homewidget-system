describe('Login E2E', () => {
    beforeAll(async () => {
        await device.launchApp({delete: true});
    });

    it('navigates to Login and shows validation on empty submit', async () => {
        await expect(element(by.text('Home‑Feed'))).toBeVisible();
        await element(by.id('home.loginLink')).tap();
        await expect(element(by.text('HomeWidget Login'))).toBeVisible();

        await element(by.id('login.submit')).tap();
        await expect(element(by.text('Bitte E‑Mail und Passwort ausfüllen.'))).toBeVisible();

        // Fill fields to demonstrate basic interaction
        await element(by.id('login.email')).typeText('demo@example.com');
        await element(by.id('login.password')).typeText('secret');
    });

    it('performs login against TEST backend when credentials provided', async () => {
        const email = process.env.DETOX_E2E_LOGIN_EMAIL;
        const password = process.env.DETOX_E2E_LOGIN_PASSWORD;
        if (!email || !password) {
            console.warn('Skipping backend login test: DETOX_E2E_LOGIN_EMAIL/PASSWORD not set');
            return;
        }
        // If still on Home, navigate to Login
        try {
            await expect(element(by.text('HomeWidget Login'))).toBeVisible();
        } catch (_e) {
            await element(by.id('home.loginLink')).tap();
            await expect(element(by.text('HomeWidget Login'))).toBeVisible();
        }
        await element(by.id('login.email')).clearText();
        await element(by.id('login.email')).typeText(email);
        await element(by.id('login.password')).clearText();
        await element(by.id('login.password')).typeText(password);
        await element(by.id('login.submit')).tap();

        // After successful login, Home shows Account button or role badge changes from DEMO
        await expect(element(by.text('Home‑Feed'))).toBeVisible();
        await expect(element(by.text('Account'))).toBeVisible();
    });
});

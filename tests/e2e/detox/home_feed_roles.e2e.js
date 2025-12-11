/*
  Detox E2E: Home-Feed rollenspezifische Widgets
  Annahmen testIDs:
  - Login-Screen Root: testID="login.screen"
  - E-Mail/Passwort Felder und Login-Button wie im Login-Flow
  - Home-Screen Root: testID="home.screen"
  - Widget-Container je Rolle:
    - demo:   testID="widget.role.demo"
    - common: testID="widget.role.common"
    - premium:testID="widget.role.premium"
  - Logout Button im Home: testID="home.logout"
*/

const users = [
    {email: 'demo@example.com', password: 'demo1234', widgetId: 'widget.role.demo'},
    {email: 'common@example.com', password: 'common1234', widgetId: 'widget.role.common'},
    {email: 'premium@example.com', password: 'premium1234', widgetId: 'widget.role.premium'},
];

describe('Home Feed role widgets', () => {
    beforeAll(async () => {
        await device.launchApp({newInstance: true});
    });

    users.forEach(({email, password, widgetId}) => {
        it(`shows role-specific widget for ${email}`, async () => {
            // Beim Login-Screen starten
            await expect(element(by.id('login.screen'))).toBeVisible();
            await element(by.id('login.email')).replaceText(email);
            await element(by.id('login.password')).replaceText(password);
            await element(by.id('login.submit')).tap();

            await waitFor(element(by.id('home.screen')))
                .toBeVisible()
                .withTimeout(10000);

            // Erwartung: mindestens ein rollenspezifisches Widget
            await expect(element(by.id(widgetId))).toBeVisible();

            // Logout zur Isolation
            await element(by.id('home.logout')).tap();
            await expect(element(by.id('login.screen'))).toBeVisible();
        });
    });
});

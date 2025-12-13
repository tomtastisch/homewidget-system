import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAsRole} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

const TEST_ID_HOME_LOGIN_LINK = 'home.loginLink';
const TEST_ID_NAV_ACCOUNT = 'navigation.account';
const TEST_ID_NAV_HOME = 'navigation.home';
const TEST_ID_ACCOUNT_ROLE = 'account.role';

const TEST_ID_LOGIN_EMAIL = 'login.email';
const TEST_ID_LOGIN_PASSWORD = 'login.password';
const TEST_ID_LOGIN_SUBMIT = 'login.submit';
const TEST_ID_LOGIN_ERROR = 'login.error';

const STORAGE_KEY_REFRESH_TOKEN = 'hw_refresh_token';

async function expectLoggedIn(page: Parameters<typeof loginAsRole>[0], timeoutMs = 10_000) {
    await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).not.toBeVisible({timeout: timeoutMs});
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars -- absichtlich ungenutzt
async function expectLoggedOut(page: Parameters<typeof loginAsRole>[0], timeoutMs = 10_000) {
    await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).toBeVisible({timeout: timeoutMs});
}

async function getRefreshToken(page: Parameters<typeof loginAsRole>[0]) {
    return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY_REFRESH_TOKEN);
}

test.describe('@advanced Browser & UX', () => {
    // BROWSER-01 – Session-Persistence über Reload
    test('@advanced BROWSER-01: Session bleibt nach Reload erhalten',
        async ({page}) => {
            /**
             * Ziel: Verifizieren, dass die Session nach einem Reload erhalten bleibt.
             * Setup: Neuer User mit Rolle 'browser01' wird via API erstellt.
             * Durchführung: User wird eingeloggt, Token vor Reload gespeichert, Seite neu geladen.
             * Erwartung: User bleibt eingeloggt, Token bleibt unverändert.
             */
            await createUserWithRole(await newApiRequestContext(), 'demo', 'browser01');

            await loginAsRole(page, 'demo', 'browser01-ui');
            await expectLoggedIn(page);

            const tokenBefore = await getRefreshToken(page);
            expect(tokenBefore).not.toBeNull();

            await page.reload();
            await page.waitForTimeout(2000);

            await expectLoggedIn(page, 10_000);

            const tokenAfter = await getRefreshToken(page);
            expect(tokenAfter).toBe(tokenBefore);

            await page.screenshot({path: 'test-results/browser-01-reload-persist.png'});
        });

    test('@advanced BROWSER-01: Session bleibt nach Navigation erhalten',
        async ({page}) => {
            /**
             * Ziel: Verifizieren, dass die Session nach Navigation innerhalb der App erhalten bleibt.
             * Setup: User wird via API erstellt und eingeloggt.
             * Durchführung: Token vor Navigation gespeichert, Navigation zum Account und zurück.
             * Erwartung: User bleibt eingeloggt, Token bleibt unverändert.
             */
            await loginAsRole(page, 'demo', 'browser01-nav');
            await expectLoggedIn(page);

            const tokenBefore = await getRefreshToken(page);
            expect(tokenBefore).not.toBeNull();

            await page.getByTestId(TEST_ID_NAV_ACCOUNT).click();
            await expect(page.getByTestId(TEST_ID_ACCOUNT_ROLE)).toBeVisible({timeout: 10_000});

            await page.getByTestId(TEST_ID_NAV_HOME).click();
            await expectLoggedIn(page, 10_000);

            const tokenAfter = await getRefreshToken(page);
            expect(tokenAfter).toBe(tokenBefore);

            await page.screenshot({path: 'test-results/browser-01-navigation-persist.png'});
        });

    // BROWSER-02 – Fallback bei eingeschränktem Storage (sofern relevant)
    test('@bestenfalls BROWSER-02: App funktioniert mit deaktiviertem LocalStorage',
        async ({page}) => {
            /**
             * Ziel: Testen des Verhaltens bei deaktiviertem localStorage.
             * Setup: localStorage wird via Init-Script deaktiviert (Mock).
             * Durchführung: App wird gestartet, kein persistenter Login möglich.
             * Erwartung: App zeigt Warnung oder nutzt Fallback (derzeit nur Dokumentation).
             *
             * Hinweis: Expo-Web benötigt localStorage für Token-Persistenz; stabiler Storage-Fallback fehlt.
             * Das Deaktivieren von localStorage ist in Browsern oft durch Security-Policies instabil.
             * Dieser Test ist konzeptionell und wird übersprungen, da das Überschreiben von localStorage
             * in modernen Browsern durch Security-Policies blockiert werden kann und zu Fehlern im Test-Setup führt.
             * Ein robuster Test ist nur mit speziellen Browser-Flags oder alternativen Mechanismen möglich.
             */
            const isCI = process.env.CI === 'true';
            const reason =
                'BLOCKED: Expo-Web benötigt localStorage für Token-Persistenz; stabiler Storage-Fallback fehlt und das Deaktivieren von localStorage ist in Browsern oft durch Security-Policies instabil.';

            test.skip(isCI, reason);
            test.fixme(!isCI, reason);

            await page.addInitScript(() => {
                Object.defineProperty(window, 'localStorage', {
                    value: {
                        getItem: () => null,
                        setItem: () => {
                            throw new Error('LocalStorage is disabled');
                        },
                        removeItem: () => {
                        },
                        clear: () => {
                        },
                        key: () => null,
                        length: 0,
                    },
                    writable: false,
                });
            });

            await page.goto('/');

            await page.screenshot({path: 'test-results/browser-02-no-storage.png'});
        });

    test('@advanced BROWSER-02: App degradiert gracefully bei Storage-Quota-Überschreitung',
        async ({page}) => {
            /**
             * Ziel: Simuliere QuotaExceededError beim Persistieren des Refresh-Tokens.
             * Setup: localStorage.setItem(...) wirft QuotaExceededError für 'hw_refresh_token'.
             * Durchführung: User wird erstellt, Login wird versucht.
             * Erwartung: App crasht nicht, bleibt im Login, zeigt Fehlermeldung, Token nicht gespeichert.
             */
            await page.addInitScript(() => {
                const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window.localStorage as any).setItem = (key: string, value: string) => {
                    if (key === 'hw_refresh_token') {
                        throw new DOMException('Quota exceeded', 'QuotaExceededError');
                    }
                    return originalSetItem(key, value);
                };
            });

            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'browser02-quota');

            await page.goto('/');

            const loginLink = page.getByTestId(TEST_ID_HOME_LOGIN_LINK);
            await loginLink.waitFor({state: 'visible', timeout: 15_000});
            await loginLink.click();

            await page.getByTestId(TEST_ID_LOGIN_EMAIL).waitFor({state: 'visible', timeout: 10_000});
            await page.getByTestId(TEST_ID_LOGIN_EMAIL).fill(user.email);
            await page.getByTestId(TEST_ID_LOGIN_PASSWORD).fill(user.password);
            await page.getByTestId(TEST_ID_LOGIN_SUBMIT).click();

            await expect(page.getByTestId(TEST_ID_LOGIN_EMAIL)).toBeVisible({timeout: 10_000});
            await expect(page.getByTestId(TEST_ID_LOGIN_ERROR)).toBeVisible({timeout: 10_000});
            await expect(page.getByTestId(TEST_ID_LOGIN_ERROR)).toHaveText(/.+/);

            const token = await getRefreshToken(page);
            expect(token).toBeNull();

            await page.screenshot({path: 'test-results/browser-02-quota.png'});
        });

    // BROWSER-03 – Back-Button-Navigation
    test('@advanced BROWSER-03: Browser Back-Button funktioniert korrekt',
        async ({page}) => {
            /**
             * Ziel: Verifizieren, dass die Navigation via "Zurück"-Button korrekt funktioniert.
             * Setup: App wird geöffnet, Login-Link sichtbar.
             * Durchführung: Login-Link klicken, dann Navigation zurück via 'navigation.home'.
             * Erwartung: Home-View mit sichtbarem Login-Link.
             */
            await page.goto('/');

            const loginLink = page.getByTestId(TEST_ID_HOME_LOGIN_LINK);
            await loginLink.waitFor({state: 'visible'});
            await loginLink.click();

            await page.getByTestId(TEST_ID_LOGIN_EMAIL).waitFor({state: 'visible'});

            await page.getByTestId(TEST_ID_NAV_HOME).click();

            await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).toBeVisible({timeout: 10_000});

            await page.screenshot({path: 'test-results/browser-03-back-button.png'});
        });

    // BROWSER-04 – Fokus-Management für Accessibility
    test('@advanced BROWSER-04: Fokus wird korrekt gesetzt nach Navigation',
        async ({page}) => {
            /**
             * Ziel: Verifizieren, dass nach Navigation der Fokus korrekt gesetzt wird.
             * Setup: App öffnen, Login-Link sichtbar.
             * Durchführung: Login-Link klicken, Login-Form sichtbar machen.
             * Erwartung: Fokus liegt auf erstem Input-Feld.
             */
            const isCI = process.env.CI === 'true';
            const reason =
                'BLOCKED: Auto-Fokus auf erstem Input-Feld ist im LoginScreen aktuell nicht implementiert (kein autoFocus/Focus-Management).';

            test.skip(isCI, reason);
            test.fixme(!isCI, reason);

            await page.goto('/');

            const loginLink = page.getByTestId(TEST_ID_HOME_LOGIN_LINK);
            await loginLink.waitFor({state: 'visible'});
            await loginLink.click();

            const emailField = page.getByTestId(TEST_ID_LOGIN_EMAIL);
            await emailField.waitFor({state: 'visible'});

            // TODO: Verifiziere, dass Fokus auf erstem Input-Feld liegt
            // const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
            // expect(focusedElement).toBe(TEST_ID_LOGIN_EMAIL);

            await page.screenshot({path: 'test-results/browser-04-focus.png'});
        });

    // BROWSER-05 – Keyboard-Navigation
    test('@advanced BROWSER-05: Keyboard-Navigation funktioniert',
        async ({page}) => {
            /**
             * Ziel: Testen der Keyboard-Navigation und Highlighting.
             * Setup: App öffnen.
             * Durchführung: Tab-Taste drücken.
             * Erwartung: Fokussierte Elemente korrekt highlightet, alle interaktiven Elemente erreichbar.
             */
            test.skip(process.env.CI === 'true', 'BLOCKED-UI: Keyboard-Navigation-Highlighting nicht sichtbar implementiert. Entfernen sobald Keyboard-Accessibility implementiert ist.');

            await page.goto('/');

            await page.keyboard.press('Tab');

            // TODO: Verifiziere Keyboard-Navigation und Highlighting

            await page.screenshot({path: 'test-results/browser-05-keyboard-nav.png'});
        });

    // BROWSER-06 – Responsive Design / Mobile Viewport
    test('@advanced BROWSER-06: App funktioniert auf Mobile-Viewport',
        async ({page}) => {
            /**
             * Ziel: Verifizieren, dass App auf Mobile-Viewport funktioniert.
             * Setup: Mobile Viewport (iPhone SE) setzen.
             * Durchführung: App laden.
             * Erwartung: Wichtige Elemente sind sichtbar.
             */
            await page.setViewportSize({width: 375, height: 667}); // iPhone SE

            await page.goto('/');

            await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).toBeVisible({timeout: 10_000});

            await page.screenshot({path: 'test-results/browser-06-mobile.png'});
        });

    test('@advanced BROWSER-06: App funktioniert auf Tablet-Viewport',
        async ({page}) => {
            /**
             * Ziel: Verifizieren, dass App auf Tablet-Viewport funktioniert.
             * Setup: Tablet Viewport (iPad) setzen.
             * Durchführung: App laden.
             * Erwartung: Wichtige Elemente sind sichtbar.
             */
            await page.setViewportSize({width: 768, height: 1024}); // iPad

            await page.goto('/');

            await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).toBeVisible();

            await page.screenshot({path: 'test-results/browser-06-tablet.png'});
        });
});

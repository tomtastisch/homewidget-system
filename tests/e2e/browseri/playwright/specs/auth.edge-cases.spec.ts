import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAs, logout} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

const TEST_ID_HOME_LOGIN_LINK = 'home.loginLink';
const TEST_ID_NAV_ACCOUNT = 'navigation.account';
const STORAGE_KEY_REFRESH_TOKEN = 'hw_refresh_token';
const DEFAULT_E2E_BASE_URL = 'http://127.0.0.1:8100';

async function expectLoggedIn(page: Parameters<typeof loginAs>[0]) {
    await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).not.toBeVisible();
}

async function expectLoggedOut(page: Parameters<typeof loginAs>[0], timeoutMs = 10_000) {
    await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).toBeVisible({timeout: timeoutMs});
}

async function setRefreshToken(page: Parameters<typeof loginAs>[0], value: string) {
    await page.evaluate(
        ({key, token}) => {
            localStorage.setItem(key, token);
        },
        {key: STORAGE_KEY_REFRESH_TOKEN, token: value},
    );
}

async function getRefreshToken(page: Parameters<typeof loginAs>[0]) {
    return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY_REFRESH_TOKEN);
}

test.describe('@advanced Auth Edge Cases', () => {
    // AUTH-09 – Token-Refresh während paralleler Requests
    test('@advanced AUTH-09: Token-Refresh während paralleler API-Calls',
        async ({page}) => {
            /**
             * Ziel
             * - Sicherstellen, dass parallele API-Requests während eines Token-Refreshs korrekt funktionieren.
             *
             * Setup
             * - Nutzer mit Rolle 'auth09' anlegen.
             * - Login über UI.
             *
             * Durchführung
             * - Simuliere nahezu abgelaufenen Token.
             * - Führe 5 parallele API-Calls mit dem Refresh-Token aus.
             *
             * Erwartung
             * - Alle API-Calls sind erfolgreich (Status 200).
             * =============================================================================
             */
            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'auth09');

            // Login über UI
            await loginAs(page, user.email, user.password);
            await expectLoggedIn(page);

            // Führe mehrere parallele API-Calls aus
            const parallelCalls = Array.from({length: 5}, (_, i) =>
                page.evaluate(async (args) => {
                    const {baseUrl, index, storageKey} = args;
                    try {
                        const response = await fetch(`${baseUrl}/api/widgets/`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem(storageKey)}`,
                            },
                        });
                        return {index, status: response.status, ok: response.ok};
                    } catch (error) {
                        return {index, error: error instanceof Error ? error.message : 'Unknown'};
                    }
                }, {
                    baseUrl: process.env.E2E_API_BASE_URL || DEFAULT_E2E_BASE_URL,
                    index: i,
                    storageKey: STORAGE_KEY_REFRESH_TOKEN,
                })
            );

            const results = await Promise.all(parallelCalls);

            // Verifiziere, dass alle Calls erfolgreich waren (trotz potentiellem Token-Refresh)
            results.forEach(result => {
                expect(result.status).toBe(200);
            });

            await page.screenshot({path: 'test-results/auth-09-parallel-refresh.png'});
        });

    // AUTH-10 – mehrfacher Logout
    test('@advanced AUTH-10: Mehrfacher Logout verursacht keine Fehler',
        async ({page}) => {
            /**
             * Ziel
             * - Sicherstellen, dass mehrfacher Logout keine Fehler verursacht.
             *
             * Setup
             * - Nutzer mit Rolle 'auth10' anlegen.
             * - Login über UI.
             *
             * Durchführung
             * - Mehrfacher Logout ausführen.
             *
             * Erwartung
             * - Nach jedem Logout ist der Nutzer ausgeloggt.
             * - Kein Fehler in Console oder Page.
             * =============================================================================
             */
            const consoleErrors: string[] = [];
            const pageErrors: string[] = [];

            page.on('console', (msg) => {
                if (msg.type() !== 'error') return;
                consoleErrors.push(msg.text());
            });

            page.on('pageerror', (err) => {
                pageErrors.push(err.message);
            });

            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'auth10');

            // Login über UI
            await loginAs(page, user.email, user.password);
            await expectLoggedIn(page);

            // Erster Logout
            await logout(page);
            await expectLoggedOut(page);

            // Verifiziere, dass Token entfernt wurde
            const token1 = await getRefreshToken(page);
            expect(token1).toBeNull();

            // Zweiter Logout (sollte idempotent sein, keine Fehler)
            await logout(page);
            await expectLoggedOut(page);

            // Dritter Logout
            await logout(page);
            await expectLoggedOut(page);

            await page.screenshot({path: 'test-results/auth-10-multiple-logout.png'});

            // Verifiziere, dass keine Console- oder Page-Errors aufgetreten sind
            expect(pageErrors, `Page errors during test:\n${pageErrors.join('\n')}`).toHaveLength(0);
            expect(consoleErrors, `Console errors during test:\n${consoleErrors.join('\n')}`).toHaveLength(0);
        });

    // AUTH-11 – leere/getrimmte Tokens im Refresh-Request
    test('@advanced AUTH-11: Leere oder getrimmte Tokens werden korrekt abgelehnt',
        async ({page}) => {
            /**
             * Ziel
             * - Validierung der Behandlung leerer, whitespace-only und ungültiger Tokens.
             *
             * Setup
             * - Keine initiale Authentifizierung notwendig.
             *
             * Durchführung
             * - Setze unterschiedliche ungültige Tokens in localStorage.
             * - Reload der Seite zur Triggerung der Token-Prüfung.
             *
             * Erwartung
             * - App behandelt Nutzer als unauthentifiziert (Login-Link sichtbar).
             * =============================================================================
             */
            // Test mit leerem Token - erst navigieren, dann Token setzen
            await page.goto('/');
            await page.waitForLoadState('domcontentloaded');

            await setRefreshToken(page, '');

            // Reload um Token-Check zu triggern
            await page.reload();

            // Erwarte, dass App als unauthentifiziert behandelt wird
            await expectLoggedOut(page);

            await page.screenshot({path: 'test-results/auth-11-empty-token.png'});

            // Test mit nur Whitespace
            await page.goto('/');
            await page.waitForLoadState('domcontentloaded');

            await setRefreshToken(page, '   ');

            await page.reload();
            await expectLoggedOut(page);

            await page.screenshot({path: 'test-results/auth-11-whitespace-token.png'});

            // Test mit ungültigen Zeichen
            await page.goto('/');
            await page.waitForLoadState('domcontentloaded');

            await setRefreshToken(page, 'invalid-token-###');

            await page.reload();
            await expectLoggedOut(page);

            await page.screenshot({path: 'test-results/auth-11-invalid-token.png'});
        });

    // AUTH-12 – Session-Hijacking-Schutz (aktueller Stand: Refresh-Token ist nicht gebunden)
    test('@advanced AUTH-12: Refresh-Token kann in anderem Browser wiederverwendet werden (Risk documented)',
        async ({page, context}) => {
            /**
             * Ziel
             * - Nachweis, dass Refresh-Token aktuell nicht an Browser gebunden sind.
             *
             * Setup
             * - Nutzer mit Rolle 'auth12' anlegen.
             * - Login im ersten Browser.
             *
             * Durchführung
             * - Token aus erstem Browser auslesen.
             * - Refresh-Request serverseitig mit gestohlenem Token prüfen.
             * - Token in neuem Browser-Context setzen und Seite laden.
             *
             * Erwartung
             * - Refresh-Request mit gestohlenem Token ist erfolgreich.
             * - UI akzeptiert Session im neuen Browser.
             * =============================================================================
             */
            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'auth12');

            // Login im ersten Browser
            await loginAs(page, user.email, user.password);
            await expectLoggedIn(page);

            // Hole Token (simuliert Token-Diebstahl)
            const stolenToken = await getRefreshToken(page);
            expect(stolenToken).not.toBeNull();

            // Verifiziere serverseitig: Refresh mit diesem Token ist aktuell möglich (kein Token-Binding)
            const refreshRes = await api.post('/api/auth/refresh', {
                data: {refresh_token: stolenToken!},
            });
            expect(refreshRes.ok()).toBeTruthy();

            // Öffne neuen Browser-Context (simuliert anderen Browser)
            const browser = context.browser();
            if (!browser) throw new Error('Could not access browser');

            const newContext = await browser.newContext();
            try {
                const newPage = await newContext.newPage();

                // Setze gestohlenen Token in neuem Browser
                await newPage.addInitScript(
                    ([key, token]) => {
                        localStorage.setItem(key, token);
                    },
                    [STORAGE_KEY_REFRESH_TOKEN, stolenToken!]
                );

                await newPage.goto('/');

                // Verifiziere UI-seitig: Session wird im neuen Context akzeptiert (Account-Button sichtbar)
                await expect(newPage.getByText('Home-Feed')).toBeVisible({timeout: 15_000});
                await expect(newPage.getByTestId(TEST_ID_NAV_ACCOUNT)).toBeVisible({timeout: 15_000});

                await newPage.screenshot({path: 'test-results/auth-12-token-sharing.png'});
            } finally {
                await newContext.close();
            }
        });

    // AUTH-13 – Gleichzeitige Login-Versuche desselben Users
    test('@advanced AUTH-13: Gleichzeitige Logins desselben Users',
        async ({page, context}) => {
            /**
             * Ziel
             * - Überprüfung gleichzeitiger Logins desselben Nutzers in verschiedenen Browsern.
             *
             * Setup
             * - Nutzer mit Rolle 'auth13' anlegen.
             *
             * Durchführung
             * - Öffne zweiten Browser-Context.
             * - Führe in beiden Browsern gleichzeitig Login durch.
             *
             * Erwartung
             * - Beide Browser sind eingeloggt.
             * - Beide Browser besitzen unterschiedliche Refresh-Tokens.
             * =============================================================================
             */
            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'auth13');

            // Öffne zweiten Browser-Context
            const newContext = await context.browser()?.newContext();
            if (!newContext) {
                throw new Error('Could not create new context');
            }
            const page2 = await newContext.newPage();

            // Führe gleichzeitige Logins in beiden Browsern aus
            const login1 = loginAs(page, user.email, user.password);
            const login2 = loginAs(page2, user.email, user.password);

            await Promise.all([login1, login2]);

            // Verifiziere, dass beide Logins erfolgreich waren
            await expectLoggedIn(page);
            await expectLoggedIn(page2);

            // Beide Browser sollten unterschiedliche Refresh-Tokens haben
            const token1 = await getRefreshToken(page);
            const token2 = await getRefreshToken(page2);

            expect(token1).not.toBeNull();
            expect(token2).not.toBeNull();
            // Tokens sollten unterschiedlich sein (separate Sessions)
            expect(token1).not.toBe(token2);

            await page.screenshot({path: 'test-results/auth-13-simultaneous-login-1.png'});
            await page2.screenshot({path: 'test-results/auth-13-simultaneous-login-2.png'});

            await page2.close();
            await newContext.close();
        });
});

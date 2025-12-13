/**
 * =============================================================================
 * Modul: Feed – Standard (E2E)
 * Datei: tests/e2e/browseri/playwright/specs/feed.spec.ts
 * =============================================================================
 *
 * Zweck
 * - Validiert Feed-Verhalten (Rendering, Fehlerfälle, Security) auf Standard-Ebene.
 *
 * Geltungsbereich
 * - Playwright E2E (Expo Web / Mobile-Frontend über Web-Renderer).
 *
 * Qualitätsregeln
 * - Keine „Sleep“-Tests ohne Anlass: bevorzugt explizite UI-Signale (`expect(...).toBeVisible()`).
 * - Setup/Cleanup robust: Ressourcen werden auch bei Test-Failure entfernt (`try/finally`).
 * - Assertions bevorzugt über stabile Selektoren (testIds) statt unspezifischer DOM-Abfragen.
 * =============================================================================
 */

import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAs} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById, listWidgets} from '../helpers/widgets';

const TEST_ID_HOME_LOGIN_LINK = 'home.loginLink';
const TEST_ID_ACCOUNT_ROLE = 'account.role';
const TEST_ID_FEED_WIDGET_NAME = 'feed.widget.name';
const TEST_ID_ERROR_TOAST = 'error.toast';
const TEST_ID_FEED_EMPTY = 'feed.empty';

const FEED_ENDPOINT_GLOB = '**/api/home/feed**';

async function expectLoggedIn(page: Parameters<typeof loginAs>[0]) {
    await expect(page.getByTestId(TEST_ID_HOME_LOGIN_LINK)).not.toBeVisible();
}

async function expectWidgetNameVisible(page: any, widgetName: string, timeoutMs = 10_000) {
    await expect(
        page.getByTestId(TEST_ID_FEED_WIDGET_NAME).filter({hasText: widgetName}),
    ).toBeVisible({timeout: timeoutMs});
}

test.describe('@standard Feed', () => {

    test('@standard FEED-01: Home-Feed zeigt eigene Widgets',
        async ({page}) => {
            /**
             * =============================================================================
             * FEED-01: Home-Feed zeigt eigene Widgets
             * =============================================================================
             *
             * Ziel
             * - Feed rendert Widgets des eingeloggten Users zuverlässig.
             *
             * Setup
             * - User via API erzeugen (Role: demo)
             * - Zwei Widgets via API für diesen User anlegen
             *
             * Durchführung
             * - Login über UI (dieselbe Identität wie im API-Setup)
             * - UI-Validierung: Beide Widget-Namen sind sichtbar
             * - API-Validierung: Widgets sind in `/api/widgets` vorhanden
             *
             * Erwartung
             * - UI zeigt beide Widgets im Feed
             * =============================================================================
             */

            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'feed01');

            const widget1 = await createWidget(api, 'Feed Test Widget 1', '{}', user.access_token);
            const widget2 = await createWidget(api, 'Feed Test Widget 2', '{}', user.access_token);

            try {
                await loginAs(page, user.email, user.password);
                await expectLoggedIn(page);

                await expectWidgetNameVisible(page, 'Feed Test Widget 1');
                await expectWidgetNameVisible(page, 'Feed Test Widget 2');

                const widgets = await listWidgets(api, user.access_token);
                expect(widgets.some((w) => w.name === 'Feed Test Widget 1')).toBeTruthy();
                expect(widgets.some((w) => w.name === 'Feed Test Widget 2')).toBeTruthy();

                await page.screenshot({path: 'test-results/feed-01-widgets-loaded.png'});
            } finally {
                await deleteWidgetById(api, widget1.id, user.access_token);
                await deleteWidgetById(api, widget2.id, user.access_token);
            }
        });

    test('@standard FEED-02: Feed-Caching verhindert redundante API-Calls',
        async ({page}) => {
            /**
             * =============================================================================
             * FEED-02: Feed-Caching verhindert redundante API-Calls
             * =============================================================================
             *
             * Ziel
             * - Nach initialem Feed-Load soll eine Navigation weg vom HomeScreen und zurück
             *   innerhalb des Cache-Fensters keinen zusätzlichen GET auf `/api/home/feed`
             *   auslösen.
             *
             * Kerngedanke
             * - Exakt ein User (API-Setup + UI-Login).
             * - Tracking wird erst nach stabiler UI aktiviert, damit initiale Calls
             *   (erwartet) nicht in die Assertion laufen.
             *
             * Durchführung
             * - Widget vor UI-Login erzeugen (damit initialer Feed-Load es enthalten kann)
             * - Nach initialem Render: Tracking aktivieren
             * - Tab-Navigation: Home → Account → Home (kein Hard-Reload)
             *
             * Erwartung
             * - Kein zusätzlicher Feed-GET während des Navigation-Roundtrips
             * =============================================================================
             */

        const api = await newApiRequestContext();
        const user = await createUserWithRole(api, 'demo', 'feed02');

        const widget = await createWidget(api, 'Cache Test Widget', '{}', user.access_token);

        const feedCalls: string[] = [];
        let trackApiCalls = false;

            await page.route(FEED_ENDPOINT_GLOB, async (route) => {
            const req = route.request();

            if (trackApiCalls && req.method() === 'GET') {
                feedCalls.push(req.url());
            }

            await route.continue();
        });

            try {
                await loginAs(page, user.email, user.password);
                await expectLoggedIn(page);

                await expectWidgetNameVisible(page, 'Cache Test Widget');

                trackApiCalls = true;

                await page.getByRole('button', {name: 'Account'}).click();
                await expect(page.getByTestId(TEST_ID_ACCOUNT_ROLE)).toBeVisible({timeout: 10_000});

                // Explizit zurück über Tab-Navigation (robuster als `page.goBack()` in SPA-Setups)
                await page.getByRole('button', {name: 'Home'}).click();
                await expectWidgetNameVisible(page, 'Cache Test Widget');

                await page.waitForTimeout(500);

                expect(feedCalls).toHaveLength(0);

                await page.screenshot({path: 'test-results/feed-02-caching.png'});

            } finally {
                await deleteWidgetById(api, widget.id, user.access_token);
            }
    });

    test('@standard FEED-03: Feed-Rate-Limit zeigt Fehlermeldung',
        async ({page}) => {
            /**
             * =============================================================================
             * FEED-03: Feed-Rate-Limit zeigt Fehlermeldung
             * =============================================================================
             *
             * Ziel
             * - Ein 429 vom Feed-Endpoint muss in der UI als Error-Toast erscheinen.
             *
             * Durchführung
             * - Login über UI
             * - Feed-Endpoint für GET auf 429 mocken
             * - Reload triggert Feed-Fetch
             *
             * Erwartung
             * - `error.toast` ist sichtbar und enthält eine Rate-Limit-Meldung
             * =============================================================================
             */

            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'feed03');

            await loginAs(page, user.email, user.password);
            await expectLoggedIn(page);

            await page.route(FEED_ENDPOINT_GLOB, async (route) => {
                if (route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 429,
                        contentType: 'application/json',
                        body: JSON.stringify({detail: 'Rate limit exceeded. Please try again later.'}),
                    });
                    return;
                }
                await route.continue();
            });

            await page.reload();

            await page.waitForTimeout(1500);

            await expect(page.getByTestId(TEST_ID_ERROR_TOAST)).toBeVisible({timeout: 10_000});
            await expect(
                page.getByTestId(TEST_ID_ERROR_TOAST).getByText(/Rate limit|zu viele|too many/i),
            ).toBeVisible({timeout: 5_000});

            await page.screenshot({path: 'test-results/feed-03-rate-limit.png'});
        });

    test('@standard FEED-04: XSS in Feed-Inhalten wird escaped',
        async ({page}) => {
            /**
             * =============================================================================
             * FEED-04: XSS in Feed-Inhalten wird escaped
             * =============================================================================
             *
             * Ziel
             * - XSS-Payloads im Widget-Namen dürfen nicht ausgeführt werden.
             *
             * Durchführung
             * - Widgets mit typischen XSS-Strings via API anlegen
             * - Dialog-Listener registrieren (falls `alert()` feuert)
             * - Login über UI
             * - UI-Validierung: Payloads erscheinen als Text in `feed.widget.name`
             *
             * Erwartung
             * - Keine Dialoge wurden getriggert
             * - Keine Script-Tags mit `alert(` wurden injiziert
             * =============================================================================
             */

            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'feed04');

            const xssPayloads = [
                '<script>alert("XSS1")</script>',
                '<img src="https://example.invalid/x" alt="" onerror="alert(\'XSS2\')">',
                '<svg onload="alert(\'XSS3\')"></svg>',
            ];

        const widgets = await Promise.all(
            xssPayloads.map((payload) =>
                createWidget(api, payload, '{}', user.access_token)),
        );

            const dialogs: string[] = [];
            page.on('dialog', async (d) => {
                dialogs.push(`${d.type()}: ${d.message()}`);
                await d.dismiss();
            });

            try {
                await loginAs(page, user.email, user.password);
                await expectLoggedIn(page);

                for (const payload of xssPayloads) {
                    await expect(
                        page.getByTestId(TEST_ID_FEED_WIDGET_NAME).filter({hasText: payload}),
                    ).toBeVisible({timeout: 10_000});
                }

                await expect(page.locator('script', {hasText: 'alert('})).toHaveCount(0);
                expect(dialogs).toHaveLength(0);

                await page.screenshot({path: 'test-results/feed-04-xss-escaped.png'});
            } finally {

                await Promise.all(widgets.map((w) =>
                    deleteWidgetById(api, w.id, user.access_token)));
            }
        });

    test('@standard FEED-05: Leerer Feed zeigt passende Nachricht',
        async ({page}) => {
            /**
             * =============================================================================
             * FEED-05: Leerer Feed zeigt passende Nachricht
             * =============================================================================
             *
             * Ziel
             * - Ein neuer User ohne Widgets soll einen Empty-State anzeigen.
             *
             * Durchführung
             * - User via API erzeugen (ohne Widgets)
             * - Login über UI mit denselben Credentials
             * - API-Check: Widget-Liste ist leer
             * - UI-Check: Empty-State (testID) + Text
             *
             * Erwartung
             * - `feed.empty` ist sichtbar und kommuniziert leeren Zustand
             * =============================================================================
             */

            const api = await newApiRequestContext();
            const user = await createUserWithRole(api, 'demo', 'feed05');

            await loginAs(page, user.email, user.password);
            await expectLoggedIn(page);

            const widgets = await listWidgets(api, user.access_token);
            expect(widgets).toHaveLength(0);

            await expect(page.getByTestId(TEST_ID_FEED_EMPTY)).toBeVisible({timeout: 10_000});
            await expect(page.getByText(/Keine Widgets/i)).toBeVisible({timeout: 10_000});

        await page.screenshot({path: 'test-results/feed-05-empty.png'});
        });

    test.skip(
        '@standard FEED-06: Feed-Invalidation nach Widget-Erstellung triggert Refetch',
        /**
         * =============================================================================
         * FEED-06 (BLOCKIERT): Feed-Invalidation nach Widget-Erstellung
         * =============================================================================
         *
         * Ziel
         * - Nach Erstellung eines Widgets via UI soll der Feed-Query invalidiert werden,
         *   sodass ein refetch auf `/api/home/feed` erfolgt und das neue Widget sichtbar wird.
         *
         * Blocker
         * - UI-Flows zum Erstellen/Löschen von Widgets sind in der bestehenden Suite
         *   derzeit nicht implementiert (siehe widgets.basic.spec.ts / WIDGET-02).
         *
         * Empfehlung
         * - Sobald die UI-Aktion existiert:
         *   - Feed initial laden (Tracking OFF)
         *   - Tracking ON
         *   - Widget via UI erstellen
         *   - Erwartung: >= 1 zusätzlicher GET auf `/api/home/feed` und Widget sichtbar
         * =============================================================================
         */
        async () => undefined,
    );

    test.skip(
        '@standard FEED-07: Feed-Invalidation nach Widget-Löschung triggert Refetch',
        /**
         * =============================================================================
         * FEED-07 (BLOCKIERT): Feed-Invalidation nach Widget-Löschung
         * =============================================================================
         *
         * Ziel
         * - Nach Löschung eines Widgets via UI soll der Feed-Query invalidiert werden,
         *   sodass ein refetch erfolgt und das gelöschte Widget verschwindet.
         *
         * Blocker
         * - UI-Flows zum Löschen von Widgets sind in der bestehenden Suite
         *   derzeit nicht implementiert (siehe widgets.basic.spec.ts / WIDGET-03).
         * =============================================================================
         */
        async () => undefined,
    );
});

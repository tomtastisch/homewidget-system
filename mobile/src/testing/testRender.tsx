/**
 * =============================================================================
 * Modul: Test-Renderer (Provider-Hülle)
 * Datei: mobile/src/testing/testRender.tsx
 * =============================================================================
 *
 * Zweck
 * - Einheitliche Render-Hilfe für React-Native-Tests, die globale Provider benötigen.
 *
 * Geltungsbereich
 * - Unit-/Component-Tests im `mobile`-Projekt (Jest + @testing-library/react-native).
 *
 * Architektur/Abhängigkeiten
 * - TanStack Query: QueryClientProvider für Hooks wie `useQuery()` / `useMutation()`.
 * - ToastProvider: stabiler Toast-Context in Tests.
 *
 * Qualitätsregeln
 * - Pro Render wird ein neuer QueryClient erzeugt (Test-Isolation, kein Shared-State).
 * - Retries/Refetch werden deaktiviert (Determinismus, weniger Flakes).
 * - Optional: Unterdrückt `console.error` während Tests, um Output zu beruhigen.
 *
 * Konfiguration
 * - `TEST_SILENCE_CONSOLE_ERRORS=false`  -> `console.error` wird NICHT unterdrückt.
 *
 * Hinweis
 * - TanStack Query v5 unterstützt weder `setLogger` noch `QueryClient({ logger })`.
 * =============================================================================
 */

import React from 'react';
import {render} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {ToastProvider} from '../ui/ToastContext';

/**
 * Steuert, ob `console.error` in Tests gedämpft wird.
 *
 * Default: aktiv (außer explizit deaktiviert).
 */
const SHOULD_SILENCE_CONSOLE_ERRORS: boolean =
    process.env.TEST_SILENCE_CONSOLE_ERRORS !== 'false';

/**
 * Jest-Spy-Handle für `console.error`.
 *
 * Wird pro Test sauber gesetzt/entfernt (kein Leaken zwischen Tests).
 */
let consoleErrorSpy: ReturnType<typeof jest.spyOn> | undefined;

if (SHOULD_SILENCE_CONSOLE_ERRORS) {
    beforeEach(() => {
        consoleErrorSpy = jest
            .spyOn(console, 'error')
            // In manchen Tests sind absichtliche Fehler/Rejects Teil des Szenarios.
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy?.mockRestore();
        consoleErrorSpy = undefined;
    });
}

/**
 * Standard-Query-Optionen für Tests.
 *
 * Ziel: deterministisches Verhalten ohne automatische Retries/Refetches.
 */
const TEST_QUERY_DEFAULT_OPTIONS = {
    queries: {
        retry: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
        gcTime: Infinity,
    },
} as const;

/**
 * Erzeugt einen isolierten QueryClient für einen einzelnen Render.
 */
function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: TEST_QUERY_DEFAULT_OPTIONS,
    });
}

export interface RenderWithProvidersOptions {
    /**
     * Optionaler QueryClient (z. B. wenn ein Test den Cache bewusst vorbefüllen will).
     *
     * Wenn nicht gesetzt, wird pro Render ein neuer Client erzeugt.
     */
    queryClient?: QueryClient;
}

/**
 * Rendert ein UI-Element mit allen benötigten globalen Providern.
 *
 * @param ui React-Element (Screen/Komponente)
 * @param options optionale Provider-Konfiguration (z. B. QueryClient)
 */
export function renderWithProviders(
    ui: React.ReactElement,
    options: RenderWithProvidersOptions = {},
): ReturnType<typeof render> {

    const queryClient = options.queryClient ?? createTestQueryClient();

    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>{ui}</ToastProvider>
        </QueryClientProvider>,
    );
}

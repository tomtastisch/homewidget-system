/**
 * =============================================================================
 * Modul: HomeScreen Demo/Feed-Rendering (Unit Test)
 * Datei: mobile/src/__tests__/HomeScreen.test.tsx
 * =============================================================================
 *
 * Ziel
 * - Verifiziert den unauthenticated Demo-Mode (sichtbare Demo-Elemente) sowie
 *   das asynchrone Rendering von Widgets aus dem (gemockten) Feed.
 *
 * Teststrategie
 * - Home-API wird stabil gemockt und liefert deterministische Widget-Daten.
 * - AuthContext liefert den Status `unauthenticated`.
 * - Asynchrone Assertions erfolgen über `findByText()` statt `waitFor(getByText)`.
 * =============================================================================
 */

import React from 'react';
import {cleanup} from '@testing-library/react-native';

import HomeScreen from '../screens/HomeScreen';
import {renderWithProviders} from '../testing/testRender';

const MOCK_WIDGETS = [
    {
        id: 1,
        name: 'Sommer Sale',
        config_json: JSON.stringify({
            type: 'banner',
            title: '-20 % auf alles',
            description: 'Nur heute',
            cta_label: 'Shop',
            cta_target: 'shop://summer',
        }),
    },
    {
        id: 2,
        name: 'Kreditkarte',
        config_json: JSON.stringify({
            type: 'card',
            title: 'Premium Card',
            description: 'Mit Bonuspunkten',
            cta_label: 'Jetzt beantragen',
            cta_target: 'product://card',
        }),
    },
] as const;

jest.mock('../api/homeApi', () => ({
    getHomeWidgets: jest.fn(async () => MOCK_WIDGETS),
}));

jest.mock('../auth/AuthContext', () => ({
    useAuth: () => ({status: 'unauthenticated', role: null}),
}));

function renderHomeScreen() {
    return renderWithProviders(
        <HomeScreen
            navigation={{navigate: jest.fn()} as any}
            route={{key: 'Home', name: 'Home', params: undefined} as any}
        />,
    );
}

describe('HomeScreen (unauthenticated)', () => {
    afterEach(() => {
        cleanup();
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('renders demo elements immediately and renders feed widgets asynchronously', async () => {
        const {getByText, queryByText, findByText} = renderHomeScreen();

        // Demo-Elemente müssen sofort sichtbar sein
        expect(getByText('Home-Feed')).toBeTruthy();
        expect(getByText('DEMO')).toBeTruthy();
        expect(getByText(/Demonstrations/i)).toBeTruthy();

        // Feed-Widgets werden asynchron gerendert
        expect(await findByText('-20 % auf alles')).toBeTruthy();
        expect(await findByText('Shop')).toBeTruthy();
        expect(await findByText('Premium Card')).toBeTruthy();
        expect(await findByText('Jetzt beantragen')).toBeTruthy();

        // Kein Premium-Badge im unauthenticated Demo-Mode
        expect(queryByText('PREMIUM')).toBeNull();
    });
});

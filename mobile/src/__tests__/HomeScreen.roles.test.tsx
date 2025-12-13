/**
 * =============================================================================
 * Modul: HomeScreen Rollen-Rendering (Unit Test)
 * Datei: mobile/src/__tests__/HomeScreen.roles.test.tsx
 * =============================================================================
 *
 * Ziel
 * - Verifiziert, dass der HomeScreen im authenticated-Zustand das korrekte Rollen-Badge
 *   rendert und erwartete Inhalte aus dem Home-Feed sichtbar sind.
 *
 * Teststrategie
 * - AuthContext wird dynamisch über `mockCurrentRole` gesteuert.
 * - Home-API wird stabil gemockt und liefert deterministische Widget-Daten.
 * - Assertions nutzen `findByText()` für klare Synchronisation.
 * =============================================================================
 */

import React from 'react';
import {cleanup} from '@testing-library/react-native';

import HomeScreen from '../screens/HomeScreen';
import {renderWithProviders} from '../testing/testRender';

/**
 * Aktuelle Rolle für den Auth-Mock.
 *
 * Wird pro Test gesetzt, damit die Mock-Implementation unverändert bleiben kann.
 */
let mockCurrentRole: 'common' | 'premium' = 'common';

jest.mock('../auth/AuthContext', () => ({
    // noinspection JSUnusedGlobalSymbols
    useAuth: () => ({status: 'authenticated', role: mockCurrentRole}),
}));

const MOCK_WIDGETS = [
    {
        id: 1,
        name: 'Common Offer',
        config_json: JSON.stringify({
            type: 'banner',
            title: 'Willkommen',
            description: 'Für alle Nutzer',
            cta_label: 'Mehr',
        }),
    },
    {
        id: 2,
        name: 'Premium Special',
        config_json: JSON.stringify({
            type: 'card',
            title: 'Exklusiv',
            description: 'Nur für Premium',
            cta_label: 'Entdecken',
        }),
    },
] as const;

jest.mock('../api/homeApi', () => ({
    getHomeWidgets: jest.fn(async () => MOCK_WIDGETS),
}));

type RoleCase = {
    role: 'common' | 'premium';
    expectedBadge: 'COMMON' | 'PREMIUM';
    expectedTitle: 'Willkommen' | 'Exklusiv';
};

const ROLE_CASES: readonly RoleCase[] = [
    {role: 'common', expectedBadge: 'COMMON', expectedTitle: 'Willkommen'},
    {role: 'premium', expectedBadge: 'PREMIUM', expectedTitle: 'Exklusiv'},
] as const;

function renderHomeScreen() {
    return renderWithProviders(
        <HomeScreen
            navigation={{navigate: jest.fn()} as any}
            route={{key: 'Home', name: 'Home', params: undefined} as any}
        />,
    );
}

describe('HomeScreen roles', () => {
    afterEach(() => {
        cleanup();
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it.each(ROLE_CASES)(
        'shows $expectedBadge badge when authenticated with role $role',
        async ({role, expectedBadge, expectedTitle}) => {
            mockCurrentRole = role;

            const {findByText} = renderHomeScreen();

            expect(await findByText(expectedBadge)).toBeTruthy();
            expect(await findByText(expectedTitle)).toBeTruthy();
        },
    );
});

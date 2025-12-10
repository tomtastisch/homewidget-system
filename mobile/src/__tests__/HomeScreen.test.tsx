import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

// Mock API
jest.mock('../api/homeApi', () => ({
	getHomeWidgets: jest.fn(async () => [
		{
			id: 1,
			name: 'Sommer Sale',
			config_json: JSON.stringify({
				type: 'banner',
				title: '-20% auf Alles',
				description: 'Nur heute',
				cta_label: 'Shop',
				cta_target: 'shop://summer'
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
				cta_target: 'product://card'
			}),
		},
	]),
}));

// Mock AuthContext
jest.mock('../auth/AuthContext', () => ({
	useAuth: () => ({status: 'unauthenticated', role: null}),
}));

describe('HomeScreen', () => {
	it('renders widgets by type and shows demo banner when unauthenticated', async () => {
		const {getByText, queryByText} = render(
			// Pass minimal navigation and route mocks to satisfy NativeStackScreenProps
			<HomeScreen
				navigation={{navigate: jest.fn()} as any}
				route={{key: 'Home', name: 'Home', params: undefined} as any}
			/>
		);
		
		// Demo indicators
		expect(getByText('Home‑Feed')).toBeTruthy();
		expect(getByText('DEMO')).toBeTruthy();
		expect(getByText(/Demonstrations/i)).toBeTruthy();
		
		// Wait for feed to render
		await waitFor(() => {
			expect(getByText('-20% auf Alles')).toBeTruthy(); // banner title
			expect(getByText('Shop')).toBeTruthy(); // banner CTA
			expect(getByText('Premium Card')).toBeTruthy(); // card title
			expect(getByText('Jetzt beantragen')).toBeTruthy(); // card CTA
		});
		
		// Role label for premium should not be present in demo
		expect(queryByText('PREMIUM')).toBeNull();
	});
});

import React from 'react';
import {cleanup, render, waitFor} from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

// Dynamic role mock for AuthContext
let currentRole: 'common' | 'premium' = 'common';
jest.mock('../auth/AuthContext', () => ({
	useAuth: () => ({status: 'authenticated', role: currentRole}),
}));

// Mock API
jest.mock('../api/homeApi', () => ({
	getHomeWidgets: jest.fn(async () => [
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
	]),
}));

describe('HomeScreen roles', () => {
	it('shows COMMON badge when authenticated with role common', async () => {
		currentRole = 'common';
		const {getByText, unmount} = render(
			<HomeScreen
				navigation={{navigate: jest.fn()} as any}
				route={{key: 'Home', name: 'Home', params: undefined} as any}
			/>
		);
		await waitFor(() => expect(getByText('COMMON')).toBeTruthy());
		await waitFor(() => expect(getByText('Willkommen')).toBeTruthy());
		unmount();
		cleanup();
	});
	
	it('shows PREMIUM badge when authenticated with role premium', async () => {
		currentRole = 'premium';
		const {getByText, unmount} = render(
			<HomeScreen
				navigation={{navigate: jest.fn()} as any}
				route={{key: 'Home', name: 'Home', params: undefined} as any}
			/>
		);
		await waitFor(() => expect(getByText('PREMIUM')).toBeTruthy());
		await waitFor(() => expect(getByText('Exklusiv')).toBeTruthy());
		unmount();
		cleanup();
	});
});

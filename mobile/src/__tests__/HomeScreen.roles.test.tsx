import React from 'react';
import {cleanup, render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import HomeScreen from '../screens/HomeScreen';
import {ToastProvider} from '../ui/ToastContext';

// Dynamic role mock for AuthContext
// Note: Jest allows referencing variables in mock factories if they start with 'mock'
let mockCurrentRole: 'common' | 'premium' = 'common';
jest.mock('../auth/AuthContext', () => ({
	useAuth: () => ({status: 'authenticated', role: mockCurrentRole}),
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
		mockCurrentRole = 'common';
		const qc = new QueryClient({defaultOptions: {queries: {retry: false}}});
		const {getByText, unmount} = render(
			<QueryClientProvider client={qc}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
  // Badge hängt nicht von async Daten ab → sofort prüfen
  expect(getByText('COMMON')).toBeTruthy();
  // Widgets werden asynchron geladen
  await waitFor(() => expect(getByText('Willkommen')).toBeTruthy());
		unmount();
		cleanup();
	});
	
	it('shows PREMIUM badge when authenticated with role premium', async () => {
		mockCurrentRole = 'premium';
		const qc = new QueryClient({defaultOptions: {queries: {retry: false}}});
		const {getByText, unmount} = render(
			<QueryClientProvider client={qc}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
  // Badge sollte sofort da sein
  expect(getByText('PREMIUM')).toBeTruthy();
  // Widgets asynchron
  await waitFor(() => expect(getByText('Exklusiv')).toBeTruthy());
		unmount();
		cleanup();
	});
});

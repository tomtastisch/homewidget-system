import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import HomeScreen from '../screens/HomeScreen';
import {ToastProvider} from '../ui/ToastContext';

// Mock API
jest.mock('../api/homeApi', () => ({
	getHomeWidgets: jest.fn(async () => [
		{
			id: 1,
			name: 'Sommer Sale',
			config_json: JSON.stringify({
				type: 'banner',
				title: '-20% auf alles',
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
	let queryClient: QueryClient;
	
	afterEach(() => {
		if (queryClient) {
			queryClient.clear();
			queryClient.unmount?.();
		}
	});
	
	it('renders widgets by type and shows demo banner when unauthenticated', async () => {
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0}},
		});
		const {getByText, queryByText} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		expect(getByText('Home‑Feed')).toBeTruthy();
		expect(getByText('DEMO')).toBeTruthy();
		expect(getByText('Demonstrations‑Ansicht – Inhalte sind Beispiele')).toBeTruthy(); // ← Korrigierter Text
		
		await waitFor(() => {
			expect(getByText(/-20\s% auf alles/i)).toBeTruthy(); // banner title
			expect(getByText('Shop')).toBeTruthy(); // banner CTA
			expect(getByText('Premium Card')).toBeTruthy(); // card title
			expect(getByText('Jetzt beantragen')).toBeTruthy(); // card CTA
		});
		
		expect(queryByText('PREMIUM')).toBeNull();
	});
});

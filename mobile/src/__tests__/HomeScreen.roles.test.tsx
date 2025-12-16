import React from 'react';
import {render, within} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import HomeScreen from '../screens/HomeScreen';
import {ToastProvider} from '../ui/ToastContext';
import {TID} from '../testing/testids';

// Dynamic role mock for AuthContext
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
	let queryClient: QueryClient;
	
	// CI kann bei Kaltstarts langsamer sein – erhöhe Timeout leicht
	jest.setTimeout(15_000);
	
	afterEach(() => {
		if (queryClient) {
			queryClient.clear();
			queryClient.unmount?.();
		}
	});
	
	it('shows the COMMON badge when authenticated with role common', async () => {
		mockCurrentRole = 'common';
		queryClient = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
		const {findByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		// Badge sollte synchron erscheinen, warte dennoch robust für CI
		const badge = await findByTestId(TID.home.role.badge);
		expect(badge).toBeTruthy();
		await within(badge).findByText('COMMON');
		
		// Widgets werden asynchron geladen
		await findByTestId(TID.home.widgets.list);
	});
	
	it('shows the PREMIUM badge when authenticated with role premium', async () => {
		mockCurrentRole = 'premium';
		queryClient = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
		const {findByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		// Badge sollte synchron erscheinen, warte dennoch robust für CI
		const badge = await findByTestId(TID.home.role.badge);
		expect(badge).toBeTruthy();
		await within(badge).findByText('PREMIUM');
		
		// Widgets asynchron
		await findByTestId(TID.home.widgets.list);
	});
});
import React from 'react';
import {afterEach, describe, expect, it} from '@jest/globals';
import {render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import HomeScreen from '../screens/HomeScreen';
import {ToastProvider} from '../ui/ToastContext';

// Mock feed_v1 API
jest.mock('../api/demoFeedV1', () => ({
	getDemoFeedPage: jest.fn(async ({cursor, limit}) => {
		// Simuliere paginierte Daten
		const items = [
			{id: 1001, name: 'News', priority: 5, created_at: '2024-01-01T08:00:00Z'},
			{id: 1002, name: 'Welcome', priority: 10, created_at: '2024-01-02T08:00:00Z'},
			{id: 1003, name: 'Offers', priority: 10, created_at: '2024-01-03T08:00:00Z'},
		];
		
		const start = cursor || 0;
		const end = start + (limit || 20);
		const pageItems = items.slice(start, end);
		const hasMore = end < items.length;
		
		return {
			items: pageItems,
			next_cursor: hasMore ? end : null,
		};
	}),
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
	
	it('renders widgets from feed_v1 and shows demo banner when unauthenticated', async () => {
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
		expect(getByText('Demonstrations‑Ansicht – Inhalte sind Beispiele')).toBeTruthy();
		
		await waitFor(() => {
			expect(getByText('News')).toBeTruthy();
			expect(getByText('Welcome')).toBeTruthy();
			expect(getByText('Offers')).toBeTruthy();
		});
		
		expect(queryByText('PREMIUM')).toBeNull();
	});
});

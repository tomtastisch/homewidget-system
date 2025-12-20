import React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import HomeScreen from '../screens/HomeScreen';
import {ToastProvider} from '../ui/ToastContext';

// Standard-Seitenlimit im Demo-Feed (entspricht useHomeFeedInfinite-Default)
const DEFAULT_FEED_PAGE_LIMIT = 20;

// Mock feed_v1 API mit erweiterten Pagination-Daten
const mockGetDemoFeedPage = jest.fn(async ({cursor, limit}) => {
	// Simuliere mehr Daten für Pagination-Tests
	const allItems = [
		{id: 1001, name: 'News', priority: 5, created_at: '2024-01-01T08:00:00Z'},
		{id: 1002, name: 'Welcome', priority: 10, created_at: '2024-01-02T08:00:00Z'},
		{id: 1003, name: 'Offers', priority: 10, created_at: '2024-01-03T08:00:00Z'},
		{id: 1004, name: 'Special', priority: 8, created_at: '2024-01-04T08:00:00Z'},
		{id: 1005, name: 'Update', priority: 7, created_at: '2024-01-05T08:00:00Z'},
	];
	
	const start = cursor ?? 0;
	const pageLimit = limit ?? DEFAULT_FEED_PAGE_LIMIT;
	const end = Math.min(start + pageLimit, allItems.length);
	const pageItems = allItems.slice(start, end);
	const hasMore = end < allItems.length;
	
	return {
		items: pageItems,
		next_cursor: hasMore ? end : null,
	};
});

jest.mock('../api/demoFeedV1', () => ({
	getDemoFeedPage: (args: any) => mockGetDemoFeedPage(args),
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
		mockGetDemoFeedPage.mockClear();
	});
	
	it('renders widgets from feed_v1 and shows demo banner when unauthenticated', async () => {
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
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
		}, {timeout: 8000});
		
		expect(queryByText('PREMIUM')).toBeNull();
	}, 15000);
	
	it('loads next page when onEndReached is triggered', async () => {
		// Mock API mit kleinerem Limit forcieren
		mockGetDemoFeedPage.mockImplementationOnce(async () => ({
			items: [
				{id: 1001, name: 'News', priority: 5, created_at: '2024-01-01T08:00:00Z'},
				{id: 1002, name: 'Welcome', priority: 10, created_at: '2024-01-02T08:00:00Z'},
			],
			next_cursor: 2,
		}));
		mockGetDemoFeedPage.mockImplementationOnce(async () => ({
			items: [
				{id: 1003, name: 'Offers', priority: 10, created_at: '2024-01-03T08:00:00Z'},
			],
			next_cursor: null,
		}));

		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		const {getByText, getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		// Warte auf initiales Laden
		await waitFor(() => {
			expect(getByText('News')).toBeTruthy();
			expect(getByText('Welcome')).toBeTruthy();
		}, {timeout: 8000});
		
		expect(mockGetDemoFeedPage).toHaveBeenCalledTimes(1);
		
		// Trigger onEndReached
		const flatList = getByTestId('home.widgets.list');
		if (flatList.props.onEndReached) {
			flatList.props.onEndReached();
		}
		
		// Warte auf Laden der zweiten Seite
		await waitFor(() => {
			expect(getByText('Offers')).toBeTruthy();
		}, {timeout: 8000});
		
		expect(mockGetDemoFeedPage).toHaveBeenCalledTimes(2);
		expect(mockGetDemoFeedPage).toHaveBeenLastCalledWith({cursor: 2, limit: DEFAULT_FEED_PAGE_LIMIT});
	}, 15000);
	
	it('refreshes feed when pull-to-refresh is triggered', async () => {
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		const {getByText, getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		// Warte auf initiales Laden
		await waitFor(() => {
			expect(getByText('News')).toBeTruthy();
		}, {timeout: 8000});
		
		const initialCallCount = mockGetDemoFeedPage.mock.calls.length;
		
		// Trigger Refresh
		const flatList = getByTestId('home.widgets.list');
		const refreshControl = flatList.props.refreshControl;
		
		if (refreshControl && refreshControl.props.onRefresh) {
			refreshControl.props.onRefresh();
			
			// Warte auf Refresh
			await waitFor(() => {
				expect(mockGetDemoFeedPage.mock.calls.length).toBeGreaterThan(initialCallCount);
			}, {timeout: 8000});
		}
	}, 15000);
});

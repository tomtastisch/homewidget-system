import React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {render} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import HomeScreen from '../screens/HomeScreen';
import {ToastProvider} from '../ui/ToastContext';

/**
 * Tests für FlatList-Virtualisierungs-Optimierungen (HW-NEXT-03B).
 * 
 * Prüft, dass die Performance-Props korrekt konfiguriert sind für:
 * - Initiales Rendering nur des sichtbaren Bereichs
 * - Inkrementelles Batch-Rendering
 * - Frühzeitiges Paging-Trigger
 * - Memory-Optimierung durch removeClippedSubviews
 */

// Mock feed_v1 API
const mockGetDemoFeedPage = jest.fn(async ({cursor, limit}) => {
	// Erzeuge große Datenmenge für Virtualisierungs-Tests
	const totalItems = 100;
	const allItems = Array.from({length: totalItems}, (_, i) => ({
		id: 2000 + i,
		name: `Widget ${i + 1}`,
		priority: 5,
		created_at: `2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
	}));
	
	const start = cursor ?? 0;
	const pageLimit = limit ?? 20;
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

// Mock AuthContext (Demo-Flow: unauthenticated)
jest.mock('../auth/AuthContext', () => ({
	useAuth: () => ({status: 'unauthenticated', role: null}),
}));

describe('HomeScreen – FlatList Virtualisierung (HW-NEXT-03B)', () => {
	let queryClient: QueryClient;
	
	afterEach(() => {
		if (queryClient) {
			queryClient.clear();
			queryClient.unmount?.();
		}
		mockGetDemoFeedPage.mockClear();
	});
	
	it('konfiguriert FlatList mit Virtualisierungs-Props für Performance', () => {
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		const {getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		const flatList = getByTestId('home.widgets.list');
		
		// Verifiziere Virtualisierungs-Props
		expect(flatList.props.initialNumToRender).toBe(10);
		expect(flatList.props.maxToRenderPerBatch).toBe(5);
		expect(flatList.props.windowSize).toBe(5);
		expect(flatList.props.removeClippedSubviews).toBe(true);
	});
	
	it('konfiguriert onEndReachedThreshold für frühzeitiges Paging (0.3)', () => {
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		const {getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		const flatList = getByTestId('home.widgets.list');
		
		// onEndReachedThreshold sollte 0.3 sein (30% vor Ende triggert Paging)
		expect(flatList.props.onEndReachedThreshold).toBe(0.3);
	});
	
	it('verwendet stabilen keyExtractor basierend auf Widget-ID', () => {
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		const {getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<ToastProvider>
					<HomeScreen
						navigation={{navigate: jest.fn()} as any}
						route={{key: 'Home', name: 'Home', params: undefined} as any}
					/>
				</ToastProvider>
			</QueryClientProvider>
		);
		
		const flatList = getByTestId('home.widgets.list');
		
		// keyExtractor sollte eine Funktion sein
		expect(typeof flatList.props.keyExtractor).toBe('function');
		
		// Verifiziere, dass keyExtractor stabile String-IDs liefert
		const testWidget = {id: 42, name: 'Test'};
		const key = flatList.props.keyExtractor(testWidget);
		expect(key).toBe('42');
	});
});

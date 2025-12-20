import React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {render, waitFor, fireEvent} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import WidgetDetailScreen from '../screens/WidgetDetailScreen';
import {TID} from '../testing/testids';
import type {WidgetDetailV1} from '../api/demoFeedV1';

const WAIT_FOR_TIMEOUT_MS = 10000;

// Mock getDemoWidgetDetail API
const mockGetDemoWidgetDetail = jest.fn<(id: number) => Promise<WidgetDetailV1 | null>>();

jest.mock('../api/demoFeedV1', () => ({
	getDemoWidgetDetail: (id: number) => mockGetDemoWidgetDetail(id),
}));

// Mock NetInfo
const mockNetInfo = {
	isConnected: true,
	isInternetReachable: true,
	type: 'wifi',
};

jest.mock('@react-native-community/netinfo', () => ({
	useNetInfo: () => mockNetInfo,
}));

// Mock navigation
const mockedNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({
			navigate: mockedNavigate,
		}),
	};
});

describe('WidgetDetailScreen', () => {
	let queryClient: QueryClient;
	
	const createMockDetail = (id: number): WidgetDetailV1 => ({
		id,
		container: {
			title: `Widget ${id}`,
			description: `Beschreibung für Widget ${id}`,
		},
		content_spec: {
			blocks: [
				{
					type: 'text',
					props: {
						text: 'Dies ist ein Beispieltext.',
					},
				},
			],
		},
	});
	
	const createRoute = (widgetId: number) => ({
		key: 'WidgetDetail',
		name: 'WidgetDetail' as const,
		params: {widgetId},
	});
	
	afterEach(() => {
		if (queryClient) {
			queryClient.clear();
		}
		mockGetDemoWidgetDetail.mockClear();
		mockedNavigate.mockClear();
		mockNetInfo.isConnected = true;
	});
	
	it('renders loading state while fetching data', async () => {
		// Mock eine langsame API-Antwort
		mockGetDemoWidgetDetail.mockImplementation(
			() => new Promise(resolve => setTimeout(() => resolve(createMockDetail(1001)), 5000))
		);
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {queryByTestId, queryByText} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		// Der Hauptinhalt sollte noch nicht vorhanden sein (während des Ladens)
		expect(queryByTestId(TID.widgetDetail.screen)).toBeNull();
		expect(queryByText('Widget 1001')).toBeNull();
		expect(queryByText('Fehler')).toBeNull();
	});
	
	it('renders widget detail successfully', async () => {
		const mockDetail = createMockDetail(1001);
		mockGetDemoWidgetDetail.mockResolvedValue(mockDetail);
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {getByText, getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		await waitFor(() => {
			expect(getByTestId(TID.widgetDetail.screen)).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
		
		expect(getByText('Widget 1001')).toBeTruthy();
		expect(getByText('Beschreibung für Widget 1001')).toBeTruthy();
		expect(getByText('Dies ist ein Beispieltext.')).toBeTruthy();
		expect(getByText('ID: 1001')).toBeTruthy();
	}, 15000);
	
	it('renders error state when API fails (online)', async () => {
		mockGetDemoWidgetDetail.mockResolvedValue(null);
		mockNetInfo.isConnected = true;
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {getByText, queryByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		await waitFor(() => {
			expect(getByText('Fehler')).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
		
		expect(getByText('Fehler beim Laden der Details.')).toBeTruthy();
		expect(getByText('Erneut versuchen')).toBeTruthy();
		expect(queryByTestId(TID.widgetDetail.screen)).toBeNull();
	}, 15000);
	
	it('renders offline error state when network is unavailable', async () => {
		mockGetDemoWidgetDetail.mockResolvedValue(null);
		mockNetInfo.isConnected = false;
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {getByText, queryByText, queryByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		await waitFor(() => {
			expect(getByText('Offline')).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
		
		expect(getByText('Inhalt nicht im Cache verfügbar. Bitte verbinde dich mit dem Internet.')).toBeTruthy();
		// Retry-Button sollte bei Offline nicht angezeigt werden
		expect(queryByText('Erneut versuchen')).toBeNull();
		expect(queryByTestId(TID.widgetDetail.screen)).toBeNull();
	}, 15000);
	
	it('shows offline banner when displaying cached data', async () => {
		const mockDetail = createMockDetail(1001);
		mockGetDemoWidgetDetail.mockResolvedValue(mockDetail);
		mockNetInfo.isConnected = false;
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {getByText, getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		await waitFor(() => {
			expect(getByTestId(TID.widgetDetail.screen)).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
		
		// Offline-Banner sollte sichtbar sein
		expect(getByText('Offline-Ansicht (Cached)')).toBeTruthy();
		
		// Inhalt sollte trotzdem angezeigt werden
		expect(getByText('Widget 1001')).toBeTruthy();
		expect(getByText('Beschreibung für Widget 1001')).toBeTruthy();
	}, 15000);
	
	it('calls refetch when retry button is pressed', async () => {
		mockGetDemoWidgetDetail.mockResolvedValue(null);
		mockNetInfo.isConnected = true;
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {getByText} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		await waitFor(() => {
			expect(getByText('Fehler')).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
		
		const initialCallCount = mockGetDemoWidgetDetail.mock.calls.length;
		
		// Retry-Button klicken
		const retryButton = getByText('Erneut versuchen');
		fireEvent.press(retryButton);
		
		// API sollte erneut aufgerufen werden
		await waitFor(() => {
			expect(mockGetDemoWidgetDetail.mock.calls.length).toBeGreaterThan(initialCallCount);
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
	}, 15000);
	
	it('renders multiple blocks correctly', async () => {
		const mockDetail: WidgetDetailV1 = {
			id: 1001,
			container: {
				title: 'Multi-Block Widget',
				description: 'Ein Widget mit mehreren Inhaltsblöcken',
			},
			content_spec: {
				blocks: [
					{
						type: 'hero',
						props: {
							headline: 'Willkommen',
							subline: 'Dies ist ein Hero-Block',
							image_url: 'https://example.com/hero.png',
						},
					},
					{
						type: 'text',
						props: {
							text: 'Dies ist ein Textblock.',
						},
					},
					{
						type: 'offer_grid',
						props: {
							title: 'Unsere Angebote',
							items: [
								{sku: 'SKU1', title: 'Produkt 1', price: 9.99},
							],
						},
					},
				],
			},
		};
		
		mockGetDemoWidgetDetail.mockResolvedValue(mockDetail);
		
		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});
		
		const {getByText, getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen
					navigation={{navigate: jest.fn()} as any}
					route={createRoute(1001) as any}
				/>
			</QueryClientProvider>
		);
		
		await waitFor(() => {
			expect(getByTestId(TID.widgetDetail.screen)).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
		
		// Alle Block-Inhalte sollten gerendert werden
		expect(getByText('Willkommen')).toBeTruthy();
		expect(getByText('Dies ist ein Hero-Block')).toBeTruthy();
		expect(getByText('Dies ist ein Textblock.')).toBeTruthy();
		expect(getByText('Unsere Angebote')).toBeTruthy();
		expect(getByText('Produkt 1')).toBeTruthy();
	}, 15000);
});

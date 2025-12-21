import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import WidgetDetailScreen from '../screens/WidgetDetailScreen';
import {TID} from '../testing/testids';
import type {WidgetDetailV1} from '../api/demoFeedV1';

const WAIT_FOR_TIMEOUT_MS = 5000;

// Mock der API-Funktion für Widget-Details
const mockGetDemoWidgetDetail = jest.fn<(id: number) => Promise<WidgetDetailV1 | null>>();

jest.mock('../api/demoFeedV1', () => ({
	getDemoWidgetDetail: (id: number) => mockGetDemoWidgetDetail(id),
}));

// Mock für Netzwerk-Status
const mockNetInfo = {
	isConnected: true,
};

jest.mock('@react-native-community/netinfo', () => ({
	useNetInfo: () => mockNetInfo,
}));

describe('WidgetDetailScreen', () => {
	let queryClient: QueryClient;

	const route = {
		params: { widgetId: 123 },
		key: 'WidgetDetail-123',
		name: 'WidgetDetail'
	} as any;

	const navigation = {
		navigate: jest.fn(),
		setOptions: jest.fn(),
	} as any;

	beforeEach(() => {
		mockNetInfo.isConnected = true;
	});

	afterEach(() => {
		if (queryClient) {
			queryClient.clear();
			queryClient.unmount?.();
		}
		mockGetDemoWidgetDetail.mockReset();
	});

	it('zeigt einen ActivityIndicator während des Ladens an', async () => {
		mockGetDemoWidgetDetail.mockReturnValue(new Promise(() => {})); // Simuliert unendliches Laden

		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});

		const { getByTestId } = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen route={route} navigation={navigation} />
			</QueryClientProvider>
		);

		expect(getByTestId(TID.widgetDetail.loading)).toBeTruthy();
	});

	it('rendert Widget-Details bei erfolgreichem Laden', async () => {
		const mockData: WidgetDetailV1 = {
			id: 123,
			container: {
				title: 'Test Widget',
				description: 'Dies ist ein Test-Widget'
			},
			content_spec: {
				kind: 'blocks',
				blocks: []
			}
		};
		mockGetDemoWidgetDetail.mockResolvedValue(mockData);

		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});

		const { getByText, getByTestId } = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen route={route} navigation={navigation} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(getByTestId(TID.widgetDetail.screen)).toBeTruthy();
			expect(getByText('Test Widget')).toBeTruthy();
			expect(getByText('Dies ist ein Test-Widget')).toBeTruthy();
			expect(getByText('ID: 123')).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
	});

	it('zeigt eine Fehlermeldung bei API-Fehler an', async () => {
		mockGetDemoWidgetDetail.mockRejectedValue(new Error('API Fehler'));

		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});

		const { getByText, getByTestId } = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen route={route} navigation={navigation} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(getByTestId(TID.widgetDetail.error)).toBeTruthy();
			expect(getByText('Fehler')).toBeTruthy();
			expect(getByText('API Fehler')).toBeTruthy();
			expect(getByText('Erneut versuchen')).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
	});

	it('zeigt Offline-Meldung wenn keine Internetverbindung besteht', async () => {
		mockNetInfo.isConnected = false;
		mockGetDemoWidgetDetail.mockRejectedValue(new Error('Network request failed'));

		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});

		const { getByText, queryByText, getByTestId } = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen route={route} navigation={navigation} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(getByTestId(TID.widgetDetail.error)).toBeTruthy();
			expect(getByText('Offline')).toBeTruthy();
			expect(getByText('Inhalt nicht im Cache verfügbar. Bitte verbinde dich mit dem Internet.')).toBeTruthy();
			expect(queryByText('Erneut versuchen')).toBeNull();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
	});

	it('zeigt Offline-Banner wenn Daten aus dem Cache kommen (Offline)', async () => {
		mockNetInfo.isConnected = false;
		const mockData: WidgetDetailV1 = {
			id: 123,
			container: {
				title: 'Cached Widget',
				description: 'Aus Cache'
			},
			content_spec: {
				kind: 'blocks',
				blocks: []
			}
		};
		mockGetDemoWidgetDetail.mockResolvedValue(mockData);

		queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false, gcTime: 0, staleTime: 0}},
		});

		const { getByText } = render(
			<QueryClientProvider client={queryClient}>
				<WidgetDetailScreen route={route} navigation={navigation} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(getByText('Offline-Ansicht (Cached)')).toBeTruthy();
			expect(getByText('Cached Widget')).toBeTruthy();
		}, {timeout: WAIT_FOR_TIMEOUT_MS});
	});
});

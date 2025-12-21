import React from 'react';
import {render, act} from '@testing-library/react-native';
import {AuthProvider, useAuth} from '../auth/AuthContext';
import {QueryClient, QueryClientProvider, useQuery} from '@tanstack/react-query';
import {Text, View} from 'react-native';

// Mocks
jest.mock('../api/client', () => ({
	api: {
		configure: jest.fn(),
	},
	authLogout: jest.fn().mockResolvedValue({}),
	authMe: jest.fn(),
	authRefresh: jest.fn(),
}));
jest.mock('../storage/tokens', () => ({
	clearTokens: jest.fn(),
	getRefreshToken: jest.fn(),
}));
jest.mock('../ui/notify', () => ({
	notifyForbidden: jest.fn(),
	notifyRateLimited: jest.fn(),
	notifySessionExpired: jest.fn(),
}));

const CacheTestComponent = () => {
	const {logout} = useAuth();
	const {data: demoData} = useQuery({ queryKey: ['demo', 'test'], queryFn: () => 'demo-value' });
	const {data: authData} = useQuery({ queryKey: ['auth', 'test'], queryFn: () => 'auth-value' });

	return (
		<View>
			<Text testID="demo-data">{demoData}</Text>
			<Text testID="auth-data">{authData}</Text>
			<Text testID="logout-btn" onPress={() => logout()}>Logout</Text>
		</View>
	);
};

describe('AuthContext Cache Purge', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: Infinity } }
		});
		jest.clearAllMocks();
	});

	it('should purge only protected cache on logout', async () => {
		const {getByTestId} = render(
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<CacheTestComponent />
				</AuthProvider>
			</QueryClientProvider>
		);

		// Daten sollten im Cache sein (nach erstem Render/Query)
		// Wir warten kurz bis React Query die Daten hat
		await act(async () => {
			await new Promise(r => setTimeout(r, 10));
		});

		expect(getByTestId('demo-data').children[0]).toBe('demo-value');
		expect(getByTestId('auth-data').children[0]).toBe('auth-value');

		// Logout triggern
		await act(async () => {
			getByTestId('logout-btn').props.onPress();
		});

		// Auth-Daten sollten weg sein, Demo-Daten sollten noch da sein
		// In React Query führt removeQueries dazu, dass die Daten beim nächsten Render nicht mehr da sind oder refetched werden.
		// Da wir staleTime Infinity haben, werden sie nicht refetched wenn sie noch da sind.
		
		expect(queryClient.getQueryData(['auth', 'test'])).toBeUndefined();
		expect(queryClient.getQueryData(['demo', 'test'])).toBe('demo-value');
	});
});

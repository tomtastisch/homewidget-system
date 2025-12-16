import {QueryClient} from '@tanstack/react-query';

let singleton: QueryClient | null = null;

export function getQueryClient(): QueryClient {
	if (singleton) return singleton;
	singleton = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000, // 5 min
				gcTime: 24 * 60 * 60 * 1000, // 24 h
				retry: 1,
				refetchOnReconnect: true,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: 0,
			},
		},
	});
	return singleton;
}

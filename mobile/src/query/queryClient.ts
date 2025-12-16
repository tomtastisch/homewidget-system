import {QueryClient} from '@tanstack/react-query';
import {getTimingPublic} from '../config/timingPublic';

let singleton: QueryClient | null = null;

export function getQueryClient(): QueryClient {
	if (singleton) return singleton;
	const timing = getTimingPublic();
	const {staleTimeMs, gcTimeMs} = timing.query;
	const {maxRetries, baseDelayMs, maxDelayMs} = timing.retry;
	
	// Falls Konfiguration 0 Wiederholungen vorsieht, schalten wir Retry komplett aus.
	const retryOption = maxRetries === 0 ? false : maxRetries;
	
	const retryDelay = (failureCount: number) => {
		// Exponentielles Backoff mit Cap
		const exp = Math.max(0, failureCount - 1);
		const base = Number.isFinite(baseDelayMs) ? baseDelayMs : 0;
		const cap = Number.isFinite(maxDelayMs) ? maxDelayMs : base;
		const delay = base * Math.pow(2, exp);
		return Math.min(delay, cap);
	};
	
	singleton = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: staleTimeMs,
				gcTime: gcTimeMs,
				retry: retryOption,
				retryDelay,
				refetchOnReconnect: true,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: retryOption,
				retryDelay,
			},
		},
	});
	return singleton;
}

// Nur für Tests: QueryClient‑Singleton zurücksetzen, um Profile zu wechseln
export function __resetQueryClientForTests() {
	if (singleton) {
		singleton.clear?.();
	}
	singleton = null;
}

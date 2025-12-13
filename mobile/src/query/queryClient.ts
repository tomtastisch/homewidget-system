import {QueryClient} from '@tanstack/react-query';
import {ApiError} from '../api/client';

function isRetriable(error: unknown): boolean {
    if (error instanceof ApiError) {
        // 4xx nicht retryen (falsche Credentials, Validation, Forbidden, etc.)
        if (error.status >= 400 && error.status < 500) {
            return false;
        }
        // 5xx kann transient sein
        return error.status >= 500;
    }

    // Fetch/Network-Fehler sind in JS oft TypeError (z. B. offline, DNS, CORS)
    if (error instanceof TypeError) {
        return true;
    }

    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return msg.includes('timeout') || msg.includes('network') || msg.includes('failed to fetch');
    }

    return false;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Realistisch, aber test-stabil: keine automatischen Refetches durch Fokus.
            refetchOnWindowFocus: false,

            // Bei Reconnect ist ein Refetch sinnvoll (kommt in CI i. d. R. nicht vor).
            refetchOnReconnect: true,

            // Refetch beim Remount nur wenn stale (staleTime wird pro Query gesetzt).
            refetchOnMount: 'always',

            // Begrenzter Retry nur für retriable Fehler.
            retry: (failureCount, error) => {
                if (failureCount >= 2) {
                    return false;
                }
                return isRetriable(error);
            },

            // Cache-GC: ungenutzte Queries bleiben kurz erhalten (UX), fluten aber nicht ewig.
            gcTime: 5 * 60_000,
        },
        mutations: {
            // PoC: deterministisch, keine automatischen Retries bei Writes.
            retry: 0,
        },
    },
});

import {useInfiniteQuery} from '@tanstack/react-query';
import {getDemoFeedPage, type FeedPageV1} from '../api/demoFeedV1';
import {getTimingPublic} from '../config/timingPublic';

/**
 * Basis-Query-Key für den Home-Feed (v1, InfiniteQuery).
 */
export const HOME_FEED_INFINITE_QK = ['home', 'feed_v1_infinite'] as const;

/**
 * Hook für den Home-Feed mit Infinite-Query und Paginierung.
 *
 * @param limit Maximale Anzahl Einträge pro Seite (Default: 20).
 * @param enabled Steuerung, ob die Query aktiv ist (Default: true).
 * @returns InfiniteQuery-Result mit Seiten, Status und Fetch-Methoden.
 *
 * Verhalten:
 * - Pagination über Cursor (`pageParam`), Startwert `null`.
 * - Nächste Seite über `next_cursor` der API; `null` beendet Pagination.
 * - Nutzt unauthenticated Demo-Endpoint für Demo-Flow.
 */
export function useHomeFeedInfinite(limit = 20, enabled = true) {
	const staleTime = getTimingPublic().query.staleTimeMs;
	
	return useInfiniteQuery<FeedPageV1>({
		queryKey: [...HOME_FEED_INFINITE_QK, limit] as const,
		queryFn: ({pageParam}) => getDemoFeedPage({cursor: pageParam ?? null, limit}),
		initialPageParam: null as number | null,
		getNextPageParam: (lastPage) => lastPage.next_cursor ?? null,
		enabled,
		staleTime,
	});
}

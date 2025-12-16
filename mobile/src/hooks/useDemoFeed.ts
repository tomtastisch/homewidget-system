/****
 * @file useDemoFeed.ts
 * @brief React-Query Hook für den paginierten Demo-Feed (v1).
 *
 * Stellt eine InfiniteQuery bereit, die Seiten per Cursor lädt und pro `limit`
 * getrennt cached.
 */
import {useInfiniteQuery} from '@tanstack/react-query';
import {getDemoFeedPage} from '../api/demoFeedV1';

/**
 * Basis-Query-Key für den Demo-Feed (v1).
 *
 * `limit` wird im Hook ergänzt, damit unterschiedliche Limits getrennt gecached werden.
 */
export const FEED_QK = ['demo', 'feed_v1'] as const;

/**
 * Liefert eine `useInfiniteQuery`-Instanz für den Demo-Feed (v1).
 *
 * @param limit Maximale Anzahl Einträge pro Seite (Default: 20).
 * @returns InfiniteQuery-Result inkl. Seiten, Status und Fetch-Methoden.
 *
 * Verhalten
 * - Pagination über Cursor (`pageParam`), Startwert `null`.
 * - Nächste Seite über `next_cursor` der API; `null` beendet Pagination.
 */
export function useDemoFeed(limit = 20) {
	return useInfiniteQuery({
		// `limit` ist Teil des Query-Keys, damit unterschiedliche Limits getrennt gecached werden.
		queryKey: [...FEED_QK, limit] as const,
		queryFn: ({pageParam}) => getDemoFeedPage({cursor: pageParam ?? null, limit}),
		initialPageParam: null as number | null,
		getNextPageParam: (lastPage) => lastPage.next_cursor ?? null,
	});
}

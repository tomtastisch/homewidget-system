import {getDemoFeedPage} from '../api/demoFeedV1';
import {getTimingPublic} from '../config/timingPublic';
import {useInfiniteFeedBase, type CursorFeedPage} from './base/useInfiniteFeedBase';
import type {WidgetContractV1} from '../homewidget/contracts/v1/schemas';

/**
 * Basis-Query-Key für den Home-Feed (v1, InfiniteQuery).
 */
export const HOME_FEED_INFINITE_QK = ['home', 'feed_v1_infinite'] as const;

/**
 * Hook für den Home-Feed mit Infinite-Query und Paginierung.
 *
 * Kontext-spezifischer Adapter für die zentrale `useInfiniteFeedBase`-Logik.
 * Injiziert Home-Feed-spezifische Konfiguration (Query-Key, API-Endpoint, Timing).
 *
 * @param limit Maximale Anzahl Einträge pro Seite (Default: 20).
 * @param enabled Steuerung, ob die Query aktiv ist (Default: true).
 * @returns InfiniteQuery-Result mit Seiten, Status und Fetch-Methoden.
 *
 * Verhalten:
 * - Pagination über Cursor (`pageParam`), Startwert `null`.
 * - Nächste Seite über `next_cursor` der API; `undefined` beendet Pagination.
 * - Nutzt unauthenticated Demo-Endpoint für Demo-Flow.
 */
export function useHomeFeedInfinite(limit: number = 20, enabled: boolean = true) {
	const staleTime = getTimingPublic().query.staleTimeMs;
	
	return useInfiniteFeedBase<WidgetContractV1, readonly [string, string, number]>({
		queryKey: [...HOME_FEED_INFINITE_QK, limit] as const,
		fetchPage: (cursor, lim) => getDemoFeedPage({cursor, limit: lim}) as Promise<CursorFeedPage<WidgetContractV1>>,
		limit,
		enabled,
		staleTime,
	});
}

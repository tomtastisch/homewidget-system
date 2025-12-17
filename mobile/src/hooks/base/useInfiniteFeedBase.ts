/**
 * Basis-Utility für Infinite-Query Feed-Implementierungen.
 * 
 * Kapselt die Kernlogik für cursor-basierte Paginierung ohne UI-/Framework-spezifische
 * Abhängigkeiten. Alle kontextspezifischen Anpassungen erfolgen durch Injection.
 */
import {useInfiniteQuery, type InfiniteData, type QueryKey} from '@tanstack/react-query';

/**
 * Typdefinition für eine Feed-Seite mit Cursor-Paginierung.
 * 
 * Generisch definiert, um verschiedene Item-Typen zu unterstützen.
 */
export interface CursorFeedPage<TItem> {
	items: TItem[];
	next_cursor?: number | null;
}

/**
 * Konfiguration für einen Infinite-Feed-Query.
 * 
 * @template TItem Der Typ der Feed-Items
 * @template TQueryKey Der Typ des Query-Keys (als Readonly-Tupel)
 */
export interface InfiniteFeedConfig<TItem, TQueryKey extends QueryKey> {
	/** Query-Key für Cache-Identifikation */
	queryKey: TQueryKey;
	
	/** Fetch-Funktion, die eine Seite lädt */
	fetchPage: (cursor: number | null, limit: number) => Promise<CursorFeedPage<TItem>>;
	
	/** Maximale Anzahl Items pro Seite */
	limit: number;
	
	/** Optionale Steuerung, ob Query aktiv ist (Default: true) */
	enabled?: boolean;
	
	/** Optionale staleTime in Millisekunden (Default: aus Config) */
	staleTime?: number;
}

/**
 * Basis-Hook für Infinite-Queries mit Cursor-Paginierung.
 * 
 * Zentrale, wiederverwendbare Implementierung ohne kontextspezifische Logik.
 * Alle Anpassungen erfolgen über die Config-Parameter.
 * 
 * @template TItem Der Typ der Feed-Items
 * @template TQueryKey Der Typ des Query-Keys
 * 
 * @param config Konfigurationsobjekt mit allen erforderlichen Parametern
 * @returns InfiniteQuery-Result mit standard React Query API
 * 
 * Verhalten:
 * - Pagination über Cursor (pageParam), Startwert `null`
 * - Nächste Seite über `next_cursor` der API; `undefined` beendet Pagination
 * - Vollständig typsicher durch Generics
 */
export function useInfiniteFeedBase<TItem, TQueryKey extends QueryKey>(
	config: InfiniteFeedConfig<TItem, TQueryKey>
) {
	const {queryKey, fetchPage, limit, enabled = true, staleTime} = config;
	
	return useInfiniteQuery<
		CursorFeedPage<TItem>,
		Error,
		InfiniteData<CursorFeedPage<TItem>>,
		TQueryKey,
		number | null
	>({
		queryKey,
		queryFn: ({pageParam}: {pageParam: number | null}) => fetchPage(pageParam, limit),
		initialPageParam: null as number | null,
		getNextPageParam: (lastPage: CursorFeedPage<TItem>) => lastPage.next_cursor ?? undefined,
		enabled,
		staleTime,
	});
}

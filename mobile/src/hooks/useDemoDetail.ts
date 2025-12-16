import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {getDemoWidgetDetail} from '../api/demoFeedV1';
import {getTimingPublic} from '../config/timingPublic';

/**
 * Normalisiert die Widget-ID für Detailabfragen.
 *
 * Regeln:
 * - Nur endliche Zahlen sind erlaubt
 * - IDs werden nach unten gerundet (floor)
 * - IDs müssen >= 1 sein (0 und negative Werte sind ungültig)
 */
function normalizeWidgetId(id: number | null | undefined): number | null {
	if (typeof id !== 'number' || !Number.isFinite(id)) return null;
	return Math.max(1, Math.floor(id));
}

export function useDemoDetail(id: number | null | undefined) {
	const staleTime = getTimingPublic().query.staleTimeMs;
	const normalizedId = normalizeWidgetId(id);
	const enabled = !!normalizedId;
	return useQuery({
		queryKey: ['demo', 'detail_v1', normalizedId],
		queryFn: () => getDemoWidgetDetail(normalizedId as number),
		enabled,
		staleTime,
		// Verhindert unnötigen UI-Jitter bei schnellen ID-Wechseln (react-query v5.x: placeholderData statt keepPreviousData)
		placeholderData: keepPreviousData,
	});
}

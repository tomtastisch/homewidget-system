import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {getDemoWidgetDetail} from '../api/demoFeedV1';
import {getTimingPublic} from '../config/timingPublic';

export function useDemoDetail(id: number | null | undefined) {
	const staleTime = getTimingPublic().query.staleTimeMs;
	const normalizedId = typeof id === 'number' && Number.isFinite(id) ? Math.max(1, Math.floor(id)) : null;
	const enabled = !!normalizedId;
	return useQuery({
		queryKey: ['demo', 'detail_v1', normalizedId],
		queryFn: () => getDemoWidgetDetail(normalizedId as number),
		enabled,
		staleTime,
		// Verhindert unnötigen UI-Jitter bei schnellen ID-Wechseln (v5: placeholderData statt keepPreviousData)
		placeholderData: keepPreviousData,
	});
}

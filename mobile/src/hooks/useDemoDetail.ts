import {useQuery} from '@tanstack/react-query';
import {getDemoWidgetDetail} from '../api/demoFeedV1';

export function useDemoDetail(id: number | null | undefined) {
	return useQuery({
		queryKey: ['demo', 'detail_v1', id],
		queryFn: () => getDemoWidgetDetail(id as number),
		enabled: !!id && id > 0,
		staleTime: 10 * 60 * 1000,
	});
}

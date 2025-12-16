import {useInfiniteQuery} from '@tanstack/react-query';
import {getDemoFeedPage} from '../api/demoFeedV1';

export const FEED_QK = ['demo', 'feed_v1'] as const;

export function useDemoFeed(limit = 20) {
	return useInfiniteQuery({
		// include limit so unterschiedliche Limits getrennt gecached werden
		queryKey: [...FEED_QK, limit] as const,
		queryFn: ({pageParam}) => getDemoFeedPage({cursor: pageParam ?? null, limit}),
		initialPageParam: null as number | null,
		getNextPageParam: (lastPage) => lastPage.next_cursor ?? null,
	});
}

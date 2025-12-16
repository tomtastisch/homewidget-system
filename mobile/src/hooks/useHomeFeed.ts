import {useQuery, type UseQueryOptions} from '@tanstack/react-query';
import {type BackendWidget, getHomeWidgets} from '../api/homeApi';

export const HOME_FEED_QK = ['home', 'feed'] as const;

export function useHomeFeed(opts?: Pick<UseQueryOptions<BackendWidget[]>, 'enabled'>) {
	return useQuery<BackendWidget[]>({
		queryKey: HOME_FEED_QK,
		queryFn: () => getHomeWidgets(),
		staleTime: 5 * 60 * 1000,
		enabled: opts?.enabled,
	});
}

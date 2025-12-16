import {useQuery, type UseQueryOptions} from '@tanstack/react-query';
import {type BackendWidget, getHomeWidgets} from '../api/homeApi';
import {getTimingPublic} from '../config/timingPublic';

export const HOME_FEED_QK = ['home', 'feed'] as const;
export const HOME_FEED_QK_BASE = HOME_FEED_QK;

/**
 * Home-Feed mit optionalen Filtern.
 *
 * - Parametrisierte QueryKeys vermeiden Cache-Kollisionen bei zukünftigen Filter-Varianten.
 */
export function useHomeFeed(
	opts?: Pick<UseQueryOptions<BackendWidget[]>, 'enabled'>,
	filters?: Readonly<Record<string, unknown>>,
) {
	const staleTime = getTimingPublic().query.staleTimeMs;
	const key = [...HOME_FEED_QK_BASE, filters ?? {}] as const;
	return useQuery<BackendWidget[]>({
		queryKey: key,
		queryFn: () => getHomeWidgets(),
		enabled: opts?.enabled,
		staleTime,
	});
}

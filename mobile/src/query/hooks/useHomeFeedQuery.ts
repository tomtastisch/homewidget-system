import {useQuery} from '@tanstack/react-query';

import type {Role} from '../../api/client';
import {type BackendWidget, getHomeWidgets} from '../../api/homeApi';
import {type AuthStatus, queryKeys} from '../queryKeys';

export function useHomeFeedQuery(params: {
    status: AuthStatus;
    userId: number | null;
    role: Role | null;
}) {
    const enabled = params.status !== 'checking';

    return useQuery<BackendWidget[], Error>({
        queryKey: queryKeys.homeFeed(params),
        queryFn: ({signal}) =>
            getHomeWidgets({signal}), enabled,

        // Realistische Basis: 30s "fresh" (kein Refetch bei Navigation innerhalb des Fensters)
        staleTime: 30_000,

        // UI-Stabilität: kein Leeren der Liste während Refetch (wichtig bei Navigation/back)
        placeholderData: (previousData) => previousData ?? [],
    });
}

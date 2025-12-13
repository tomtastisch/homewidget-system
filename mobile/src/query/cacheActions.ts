import type {Role} from '../api/client';
import {queryClient} from './queryClient';
import {type AuthStatus, queryKeys} from './queryKeys';

export function clearAllQueryCache(): void {
    queryClient.clear();
}

export async function invalidateHomeFeed(params: {
    status: AuthStatus;
    userId: number | null;
    role: Role | null;
}): Promise<void> {
    await queryClient.invalidateQueries({queryKey: queryKeys.homeFeed(params)});
}

import type {Role} from '../api/client';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export const queryKeys = {
    homeFeed: (params: {
        status: AuthStatus;
        userId: number | null;
        role: Role | null;
    }) =>

        ['homeFeed', params.status, params.userId, params.role] as const,
};

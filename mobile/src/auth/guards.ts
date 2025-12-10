import {Role} from '../api/client';
import {notifyForbidden} from '../ui/notify';

export type RequiredRole = 'common' | 'premium';

export function roleRank(role: Role | null): number {
	switch (role) {
		case 'premium':
			return 2;
		case 'common':
			return 1;
		case 'demo':
		default:
			return 0;
	}
}

export function roleSatisfies(current: Role | null, required: RequiredRole): boolean {
	const reqRank = required === 'premium' ? 2 : 1;
	return roleRank(current) >= reqRank;
}

/**
 * Guard helper for actions/routes that require a given role.
 * Returns true if access is granted; otherwise shows a forbidden notice
 * and returns false so callers can short-circuit and redirect.
 */
export function requireRole(current: Role | null, required: RequiredRole, onDenied?: () => void): boolean {
	if (roleSatisfies(current, required)) return true;
	notifyForbidden();
	if (onDenied) onDenied();
	return false;
}

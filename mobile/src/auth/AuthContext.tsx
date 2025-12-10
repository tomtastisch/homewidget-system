import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {api, authLogin, authRegister, authRefresh, authMe, authLogout, ApiError, Role, UserRead} from '../api/client';
import {clearTokens, getRefreshToken} from '../storage/tokens';
import {createLogger} from '../logging/logger';
import {notifyForbidden, notifyRateLimited, notifySessionExpired} from '../ui/notify';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
	status: AuthStatus;
	accessToken: string | null;
	user: UserRead | null;
	role: Role | null;
	error: string | null;
	// actions
	bootstrap: () => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	refresh: () => Promise<boolean>;
	loadMe: () => Promise<void>;
	// helpers
	isDemo: () => boolean;
	isCommon: () => boolean;
	isPremium: () => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: { children: React.ReactNode }) {
	const LOG = createLogger('mobile.auth');
	const [status, setStatus] = useState<AuthStatus>('checking');
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [user, setUser] = useState<UserRead | null>(null);
	const [role, setRole] = useState<Role | null>(null);
	const [error, setError] = useState<string | null>(null);
	
	// Keep the latest token in a ref for api client getter to avoid stale closures
	const accessRef = useRef<string | null>(null);
	useEffect(() => {
		accessRef.current = accessToken;
	}, [accessToken]);
	
	// Configure API client once
	useEffect(() => {
		api.configure({
			getAccessToken: () => accessRef.current,
			onTokenRefreshed: async (access, _refresh) => {
				setAccessToken(access);
			},
			onUnauthorized: async (reason) => {
				LOG.warn('onUnauthorized', {reason});
				// Map reasons to user-facing notices and state transitions
				switch (reason) {
					case 'forbidden': {
						setError('Keine Berechtigung für diese Aktion.');
						notifyForbidden();
						// Keep session; do not clear tokens
						break;
					}
					
					case 'refresh_rate_limited':
					case 'refresh_failed':
					case 'unauthorized':
					case 'no_token': {
						if (reason === 'refresh_rate_limited') {
							setError('Zu viele Anfragen – bitte später erneut anmelden.');
							notifyRateLimited();
						} else if (reason === 'refresh_failed' || reason === 'unauthorized') {
							setError('Sitzung abgelaufen. Bitte erneut einloggen.');
						}
						
						await clearTokens();
						setAccessToken(null);
						setUser(null);
						setRole(null);
						setStatus('unauthenticated');
						notifySessionExpired();
						break;
					}
					
					default:
						break;
				}
			},
		});
	}, []);
	
	const loadMe = useCallback(async () => {
		try {
			const me = await authMe();
			setUser(me);
			setRole(me.role);
		} catch (e: any) {
			const err = e as ApiError;
			setError(err?.message || 'Konnte Profildaten nicht laden');
			// If unauthorized here, status will be flipped by api.onUnauthorized
		}
	}, []);
	
	const refresh = useCallback(async (): Promise<boolean> => {
		try {
			const data = await authRefresh();
			setAccessToken(data.access_token);
			return true;
		} catch (e: any) {
			const err = e as ApiError;
			LOG.warn('refresh_failed', {status: err.status});
			if (err.status === 429) {
				setError('Zu viele Anfragen an die Sitzungserneuerung. Bitte später erneut versuchen.');
			}
			return false;
		}
	}, []);
	
	const bootstrap = useCallback(async () => {
		setStatus('checking');
		setError(null);
		const hasRefresh = await getRefreshToken();
		if (!hasRefresh) {
			setStatus('unauthenticated');
			return;
		}
		const ok = await refresh();
		if (ok) {
			await loadMe();
			setStatus('authenticated');
		} else {
			await clearTokens();
			setStatus('unauthenticated');
		}
	}, [loadMe, refresh]);
	
	useEffect(() => {
		// Perform initial bootstrap once
		bootstrap();
	}, [bootstrap]);
	
	const register = useCallback(async (email: string, password: string) => {
		setError(null);
		try {
			await authRegister(email, password);
			// do not auto-login; caller can navigate to login
		} catch (e: any) {
			const err = e as ApiError;
			if (err.status === 409) {
				setError('E‑Mail ist bereits registriert.');
			} else if (err.status === 400 || err.status === 422) {
				const detail = err.body?.detail || 'Ungültige Eingaben.';
				setError(typeof detail === 'string' ? detail : 'Ungültige Eingaben.');
			} else {
				setError('Registrierung fehlgeschlagen.');
			}
			throw err;
		}
	}, []);
	
	const login = useCallback(async (email: string, password: string) => {
		setError(null);
		try {
			const data = await authLogin(email, password);
			setAccessToken(data.access_token);
			await loadMe();
			setStatus('authenticated');
		} catch (e: any) {
			const err = e as ApiError;
			if (err.status === 401) {
				setError('E‑Mail oder Passwort ist falsch.');
			} else if (err.status === 400 || err.status === 422) {
				setError('Eingaben unvollständig oder ungültig.');
			} else {
				setError('Login fehlgeschlagen.');
			}
			throw err;
		}
	}, [loadMe]);
	
	const logout = useCallback(async () => {
		try {
			await authLogout();
		} finally {
			setAccessToken(null);
			setUser(null);
			setRole(null);
			setStatus('unauthenticated');
		}
	}, []);
	
	const value: AuthContextValue = useMemo(
		() => ({
			status,
			accessToken,
			user,
			role,
			error,
			bootstrap,
			register,
			login,
			logout,
			refresh,
			loadMe,
			isDemo: () => role === 'demo',
			isCommon: () => role === 'common',
			isPremium: () => role === 'premium',
		}), [status, accessToken, user, role, error, bootstrap, register, login, logout, refresh, loadMe]
	);
	
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}

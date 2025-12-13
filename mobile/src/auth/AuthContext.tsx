import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,} from 'react';

import {
    api,
    ApiError,
    authLogin,
    authLogout,
    authMe,
    authRefresh,
    authRegister,
    type Role,
    type UserRead,
} from '../api/client';
import {clearTokens, getRefreshToken} from '../storage/tokens';
import {createLogger} from '../logging/logger';
import {notifyForbidden, notifyRateLimited, notifySessionExpired} from '../ui/notify';
import {clearAllQueryCache} from '../query/cacheActions';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
    status: AuthStatus;
    accessToken: string | null;
    user: UserRead | null;
    role: Role | null;
    error: string | null;

    // Aktionen
    bootstrap: () => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<boolean>;
    loadMe: () => Promise<void>;

    // Convenience-Checks
    isDemo: () => boolean;
    isCommon: () => boolean;
    isPremium: () => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: { children: React.ReactNode }) {
    const LOG = useMemo(() => createLogger('mobile.auth'), []);

    const [status, setStatus] = useState<AuthStatus>('checking');
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserRead | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Access-Token in einem Ref spiegeln, damit der API-Client (Getter) stets den aktuellen Token
     * zurückliefert und keine veralteten Closures genutzt werden.
     */
    const accessRef = useRef<string | null>(null);
    useEffect(() => {
        accessRef.current = accessToken;
    }, [accessToken]);

    /**
     * API-Client wird genau einmal konfiguriert.
     * onUnauthorized ist die zentrale Stelle, an der “Session ist nicht verwendbar” konsistent behandelt wird.
     */
    const apiConfiguredRef = useRef(false);
    useEffect(() => {
        if (apiConfiguredRef.current) {
            return;
        }
        apiConfiguredRef.current = true;

        api.configure({
            getAccessToken: () => accessRef.current,

            onTokenRefreshed: async (access, _refresh) => {
                // Refresh erfolgreich: Access-Token im State aktualisieren.
                setAccessToken(access);
            },

            onUnauthorized: async (reason) => {
                LOG.warn('onUnauthorized', {reason});

                switch (reason) {
                    case 'forbidden': {
                        /**
                         * 403: Session bleibt gültig, aber die Aktion ist aufgrund von Rollen/ACLs nicht erlaubt.
                         * Tokens und Cache bleiben erhalten.
                         */
                        setError('Keine Berechtigung für diese Aktion.');
                        notifyForbidden();
                        break;
                    }

                    case 'refresh_rate_limited':
                    case 'refresh_failed':
                    case 'unauthorized':
                    case 'no_token': {
                        /**
                         * Ab hier gilt: Session ist nicht mehr verlässlich nutzbar.
                         * Konsequenz:
                         * - Tokens löschen (damit keine “halb kaputte” Session weiterverwendet wird)
                         * - Query-Cache leeren (damit keine Daten aus der alten Session in der UI “blitzen”)
                         */
                        if (reason === 'refresh_rate_limited') {
                            setError('Zu viele Anfragen – bitte später erneut anmelden.');
                            notifyRateLimited();
                        } else {
                            setError('Sitzung abgelaufen. Bitte erneut einloggen.');
                            notifySessionExpired();
                        }

                        await clearTokens();
                        clearAllQueryCache();

                        setAccessToken(null);
                        setUser(null);
                        setRole(null);
                        setStatus('unauthenticated');
                        break;
                    }

                    default:
                        break;
                }
            },
        });
    }, [LOG]);

    const loadMe = useCallback(async () => {
        try {
            const me = await authMe();
            setUser(me);
            setRole(me.role);
        } catch (e: unknown) {
            const err = e as ApiError;
            // Wenn die Ursache “unauthorized” ist, wird der harte Reset zusätzlich über onUnauthorized ausgeführt.
            setError(err?.message || 'Konnte Profildaten nicht laden');
        }
    }, []);

    const refresh = useCallback(async (): Promise<boolean> => {
        try {
            const data = await authRefresh();
            setAccessToken(data.access_token);
            return true;
        } catch (e: unknown) {
            const err = e as ApiError;
            LOG.warn('refresh_failed', {status: err.status});

            // 429 ist ein erwartbarer Zustand, der separat kommuniziert wird.
            if (err.status === 429) {
                setError('Zu viele Anfragen an die Sitzungserneuerung. Bitte später erneut versuchen.');
            }
            return false;
        }
    }, [LOG]);

    /**
     * Bootstrap versucht eine vorhandene Session wiederherzustellen.
     * Dabei wird bei “kein Refresh-Token” oder “Refresh fehlgeschlagen” ebenfalls der Query-Cache geleert,
     * um stale UI-Daten aus vorherigen Sessions zu vermeiden.
     */
    const bootstrap = useCallback(async () => {
        setStatus('checking');
        setError(null);

        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
            await clearTokens();
            clearAllQueryCache();

            setAccessToken(null);
            setUser(null);
            setRole(null);
            setStatus('unauthenticated');
            return;
        }

        const ok = await refresh();
        if (ok) {
            await loadMe();
            setStatus('authenticated');
            return;
        }

        await clearTokens();
        clearAllQueryCache();

        setAccessToken(null);
        setUser(null);
        setRole(null);
        setStatus('unauthenticated');
    }, [loadMe, refresh]);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    const register = useCallback(async (email: string, password: string) => {
        setError(null);

        try {
            await authRegister(email, password);
        } catch (e: unknown) {
            const err = e as ApiError;

            if (err.status === 409) {
                setError('E-Mail ist bereits registriert.');
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

            // Profil laden, bevor der Auth-Status umspringt → Screens sehen direkt konsistente user/role Werte.
            await loadMe();
            setStatus('authenticated');
        } catch (e: unknown) {
            const err = e as ApiError;

            if (err.status === 401) {
                setError('E-Mail oder Passwort ist falsch.');
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
            /**
             * Logout wird “hart” durchgeführt, unabhängig vom Ergebnis des Server-Calls:
             * - Tokens löschen
             * - Query-Cache leeren (keine Daten-Leaks/kein “Blitzen” nach Logout)
             */
            await clearTokens();
            clearAllQueryCache();

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
        }),
        [status, accessToken, user, role, error, bootstrap, register, login, logout, refresh, loadMe],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}

import {clearTokens, getRefreshToken, saveRefreshToken} from '../storage/tokens';
import {createLogger} from '../logging/logger';

const LOG = createLogger('mobile.api');

/**
 * Bevorzugte Basis-URL für Backend-Aufrufe (E2E, Expo, lokale Entwicklung).
 *
 * Auflösungsreihenfolge:
 * - E2E_API_BASE_URL (Detox/Contracts)
 * - EXPO_PUBLIC_API_BASE_URL (Expo)
 * - Fallback: http://localhost:8000
 */
export const BASE_URL =
	(process.env.E2E_API_BASE_URL as string | undefined) ||
	(process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
	'http://localhost:8000';

/**
 * Standardisierter API-Fehlertyp mit HTTP-Status und Antwortkörper.
 */
export class ApiError extends Error {
	status: number;
	body: any;
	
	constructor(status: number, body: any, message?: string) {
		super(message || (body && (body.detail || body.message)) || `HTTP ${status}`);
		this.status = status;
		this.body = body;
	}
}

type UnauthorizedReason =
	| 'no_token'
	| 'unauthorized'
	| 'refresh_failed'
	| 'refresh_rate_limited'
	| 'forbidden';

export type ApiClientOptions = {
	/** Optional abweichende Basis-URL, z. B. für Tests. */
	baseUrl?: string;
	/** Callback für Session-Invalidierung oder Berechtigungsprobleme. */
	onUnauthorized?: (reason: UnauthorizedReason) => void | Promise<void>;
	/** Callback bei erfolgreicher Token-Aktualisierung. */
	onTokenRefreshed?: (access: string, refresh: string) => void | Promise<void>;
	/** Getter für das aktuelle Access-Token (z. B. aus Context/State). */
	getAccessToken?: () => string | null;
};

/**
 * HTTP-Client mit zentralem Token-, Fehler- und Reauth-Handling für die Mobile-App.
 */
export class ApiClient {
	private baseUrl: string;
	private refreshLock: Promise<boolean> | null = null;
	private onUnauthorized?: ApiClientOptions['onUnauthorized'];
	private onTokenRefreshed?: ApiClientOptions['onTokenRefreshed'];
	private getAccessToken?: ApiClientOptions['getAccessToken'];
	
	constructor(opts: ApiClientOptions = {}) {
		this.baseUrl = opts.baseUrl || BASE_URL;
		this.onUnauthorized = opts.onUnauthorized;
		this.onTokenRefreshed = opts.onTokenRefreshed;
		this.getAccessToken = opts.getAccessToken;
	}
	
	/**
	 * Aktualisiert Laufzeitkonfiguration des Clients, z. B. nach Login oder Rollenwechsel.
	 */
	configure(opts: ApiClientOptions): void {
		if (opts.baseUrl) this.baseUrl = opts.baseUrl;
		this.onUnauthorized = opts.onUnauthorized ?? this.onUnauthorized;
		this.onTokenRefreshed = opts.onTokenRefreshed ?? this.onTokenRefreshed;
		this.getAccessToken = opts.getAccessToken ?? this.getAccessToken;
	}
	
	/**
	 * Informiert den Client über aktualisierte Tokens (z. B. nach Login/Refresh).
	 */
	async notifyTokenRefreshed(access: string, refresh: string): Promise<void> {
		if (this.onTokenRefreshed) {
			await this.onTokenRefreshed(access, refresh);
		}
	}
	
	/**
	 * Führt einen HTTP-Request mit optionalem Reauth-Retry und Session-Invalidierung aus.
	 */
	async request(path: string, init: RequestInit = {}): Promise<Response> {
		const method = (init.method || 'GET').toUpperCase();
		LOG.debug('request', {method, path});
		
		let access = this.getAccessToken ? this.getAccessToken() : null;
		const headers: Record<string, string> = {
			...(init.headers as Record<string, string>),
		};
		
		if (access) headers['Authorization'] = `Bearer ${access}`;
		
		let res = await fetch(`${this.baseUrl}${path}`, {...init, headers});
		
		if (res.status === 401) {
			LOG.warn('unauthorized_response', {path});
			const ok = await this.ensureRefreshed();
			
			if (!ok) {
				await clearTokens();
				return res;
			}
			
			access = this.getAccessToken ? this.getAccessToken() : null;
			const retryHeaders: Record<string, string> = {
				...(init.headers as Record<string, string>),
			};
			if (access) retryHeaders['Authorization'] = `Bearer ${access}`;
			
			res = await fetch(`${this.baseUrl}${path}`, {...init, headers: retryHeaders});
			
			if (res.status === 401 || res.status === 403) {
				LOG.warn('retry_unauthorized_or_forbidden', {path, status: res.status});
				await clearTokens();
				if (this.onUnauthorized) await this.onUnauthorized('unauthorized');
				return res;
			}
		}
		
		if (res.status === 403) {
			LOG.warn('forbidden_response', {path});
			if (this.onUnauthorized) await this.onUnauthorized('forbidden');
		}
		
		LOG.info('response', {method, path, status: res.status});
		return res;
	}
	
	/**
	 * Führt einen JSON-Request aus und wirft bei Fehlern einen ApiError.
	 */
	async json<T = any>(path: string, init: RequestInit = {}): Promise<T> {
		const res = await this.request(path, init);
		return parseJsonResponse<T>(res);
	}
	
	/**
	 * Führt einen GET-Request mit JSON-Antwort aus.
	 */
	get<T = any>(path: string, init: RequestInit = {}): Promise<T> {
		return this.json<T>(path, {...init, method: 'GET'});
	}
	
	/**
	 * Führt einen POST-Request mit JSON-Body und JSON-Antwort aus.
	 */
	post<T = any>(
		path: string,
		body?: any,
		headers?: Record<string, string>,
	): Promise<T> {
		const h = {'Content-Type': 'application/json', ...(headers || {})};
		return this.json<T>(path, {
			method: 'POST',
			headers: h,
			body: body != null ? JSON.stringify(body) : undefined,
		});
	}
	
	private async ensureRefreshed(): Promise<boolean> {
		if (!this.refreshLock) {
			this.refreshLock = this.doRefresh().finally(() => {
				this.refreshLock = null;
			});
		}
		return this.refreshLock;
	}
	
	private async doRefresh(): Promise<boolean> {
		const refresh = await getRefreshToken();
		if (!refresh) {
			LOG.warn('no_refresh_token');
			if (this.onUnauthorized) await this.onUnauthorized('no_token');
			return false;
		}
		
		const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({refresh_token: refresh}),
		});
		
		if (res.status === 429) {
			LOG.warn('refresh_rate_limited');
			if (this.onUnauthorized) await this.onUnauthorized('refresh_rate_limited');
			return false;
		}
		
		if (!res.ok) {
			LOG.warn('refresh_failed', {status: res.status});
			if (this.onUnauthorized) await this.onUnauthorized('refresh_failed');
			return false;
		}
		
		const text = await res.text();
		let data: any;
		
		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			LOG.warn('refresh_parse_error', {text});
			if (this.onUnauthorized) await this.onUnauthorized('refresh_failed');
			return false;
		}
		
		await saveRefreshToken(data.refresh_token);
		LOG.info('token_refreshed');
		await this.notifyTokenRefreshed(data.access_token, data.refresh_token);
		return true;
	}
}

/**
 * Globale ApiClient-Instanz für alle Mobile-HTTP-Aufrufe.
 */
export const api = new ApiClient();

/**
 * Rollenmodell für Benutzer im Mobile-Client.
 */
export type Role = 'demo' | 'common' | 'premium';

/**
 * Token-Paar entsprechend OAuth/JWT-Login-Flow.
 */
export type TokenPair = {
	access_token: string;
	refresh_token: string;
	token_type: 'bearer';
	expires_in: number;
	role: Role;
};

/**
 * Serialisierte Repräsentation des angemeldeten Benutzers.
 */
export type UserRead = {
	id: number;
	email: string;
	is_active: boolean;
	created_at: string;
	role: Role;
};

async function parseJsonResponse<T = any>(res: Response): Promise<T> {
	const text = await res.text();
	let data: any;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		throw new ApiError(res.status, text, `Unerwartete Antwort: ${text}`);
	}
	
	if (!res.ok) {
		throw new ApiError(res.status, data);
	}
	
	return data as T;
}

async function handleTokenResponse(res: Response): Promise<TokenPair> {
	const data = await parseJsonResponse<TokenPair>(res);
	await saveRefreshToken(data.refresh_token);
	await api.notifyTokenRefreshed(data.access_token, data.refresh_token);
	return data;
}

/**
 * Registriert einen neuen Benutzer im Backend.
 */
export async function authRegister(
	email: string,
	password: string,
): Promise<UserRead | { ok: true }> {
	const res = await fetch(`${BASE_URL}/api/auth/register`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({email, password}),
	});
	return parseJsonResponse<UserRead | { ok: true }>(res);
}

/**
 * Authentifiziert einen Benutzer und liefert ein Token-Paar zurück.
 */
export async function authLogin(username: string, password: string): Promise<TokenPair> {
	const body = new URLSearchParams();
	body.append('username', username);
	body.append('password', password);
	
	const res = await fetch(`${BASE_URL}/api/auth/login`, {
		method: 'POST',
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		body: body.toString(),
	});
	
	return handleTokenResponse(res);
}

/**
 * Ruft Profildaten des aktuell authentifizierten Benutzers ab.
 */
export async function authMe(): Promise<UserRead> {
	return api.get<UserRead>('/api/auth/me');
}

/**
 * Aktualisiert das Token-Paar basierend auf dem gespeicherten Refresh-Token.
 */
export async function authRefresh(): Promise<TokenPair> {
	const refresh = await getRefreshToken();
	if (!refresh) {
		throw new ApiError(401, {detail: 'No refresh token'});
	}
	
	const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({refresh_token: refresh}),
	});
	
	return handleTokenResponse(res);
}

/**
 * Meldet den Benutzer am Backend ab und bereinigt lokale Token.
 */
export async function authLogout(): Promise<void> {
	try {
		await api.post('/api/auth/logout');
	} finally {
		await clearTokens();
	}
}

/**
 * Upgraded einen Common-User zu Premium.
 *
 * Erfordert Authentifizierung.
 */
export async function authUpgradeToPremium(): Promise<UserRead> {
	return api.post<UserRead>('/api/auth/upgrade-to-premium');
}

import {getRefreshToken, saveRefreshToken, clearTokens} from '../storage/tokens';
import { createLogger } from '../logging/logger';

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Einheitlicher API-Fehler mit Status/Body
export class ApiError extends Error {
	status: number;
	body: any;
	
	constructor(status: number, body: any, message?: string) {
		super(message || (body && (body.detail || body.message)) || `HTTP ${status}`);
		this.status = status;
		this.body = body;
	}
}

type UnauthorizedReason = 'no_token' | 'unauthorized' | 'refresh_failed' | 'refresh_rate_limited' | 'forbidden';

export type ApiClientOptions = {
	baseUrl?: string;
	onUnauthorized?: (reason: UnauthorizedReason) => void | Promise<void>;
	onTokenRefreshed?: (access: string, refresh: string) => void | Promise<void>;
	getAccessToken?: () => string | null;
};

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
	
	configure(opts: ApiClientOptions) {
		if (opts.baseUrl) this.baseUrl = opts.baseUrl;
		this.onUnauthorized = opts.onUnauthorized ?? this.onUnauthorized;
		this.onTokenRefreshed = opts.onTokenRefreshed ?? this.onTokenRefreshed;
		this.getAccessToken = opts.getAccessToken ?? this.getAccessToken;
	}
	
	private async doRefresh(): Promise<boolean> {
		const LOG = createLogger('mobile.api');
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
		const data = await res.json();
		// Persist ONLY refresh token
		await saveRefreshToken(data.refresh_token);
		LOG.info('token_refreshed');
		if (this.onTokenRefreshed) await this.onTokenRefreshed(data.access_token, data.refresh_token);
		return true;
	}
	
	private async ensureRefreshed(): Promise<boolean> {
		if (!this.refreshLock) {
			this.refreshLock = this.doRefresh().finally(() => {
				this.refreshLock = null;
			});
		}
		return this.refreshLock;
	}
	
	async request(path: string, init: RequestInit = {}): Promise<Response> {
		const LOG = createLogger('mobile.api');
		const method = (init.method || 'GET').toUpperCase();
		LOG.debug('request', {method, path});
		let access = this.getAccessToken ? this.getAccessToken() : null;
		const headers: Record<string, string> = {...(init.headers as Record<string, string>)};
		if (access) headers['Authorization'] = `Bearer ${access}`;
		let res = await fetch(`${this.baseUrl}${path}`, {...init, headers});
		
		if (res.status === 401) {
			LOG.warn('unauthorized_response', {path});
			const ok = await this.ensureRefreshed();
			if (!ok) {
				await clearTokens();
				// onUnauthorized was already invoked by doRefresh with specific reason
				return res;
			}
			access = this.getAccessToken ? this.getAccessToken() : null;
			const retryHeaders: Record<string, string> = {...(init.headers as Record<string, string>)};
			if (access) retryHeaders['Authorization'] = `Bearer ${access}`;
			res = await fetch(`${this.baseUrl}${path}`, {...init, headers: retryHeaders});
			
			// If the retried request still fails with 401/403, treat session as invalid
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
	
	async json<T = any>(path: string, init: RequestInit = {}): Promise<T> {
		const res = await this.request(path, init);
		const text = await res.text();
		let data: any;
		try {
			data = text ? JSON.parse(text) : null;
		} catch (e) {
			throw new ApiError(res.status, text, `Unerwartete Antwort: ${text}`);
		}
		if (!res.ok) {
			throw new ApiError(res.status, data);
		}
		return data as T;
	}
	
	// Convenience-Methoden
	get<T = any>(path: string, init: RequestInit = {}) {
		return this.json<T>(path, {...init, method: 'GET'});
	}
	
	post<T = any>(path: string, body?: any, headers?: Record<string, string>) {
		const h = {'Content-Type': 'application/json', ...(headers || {})};
		return this.json<T>(path, {method: 'POST', headers: h, body: body != null ? JSON.stringify(body) : undefined});
	}
	
	put<T = any>(path: string, body?: any, headers?: Record<string, string>) {
		const h = {'Content-Type': 'application/json', ...(headers || {})};
		return this.json<T>(path, {method: 'PUT', headers: h, body: body != null ? JSON.stringify(body) : undefined});
	}
	
	del<T = any>(path: string, headers?: Record<string, string>) {
		return this.json<T>(path, {method: 'DELETE', headers});
	}
}

// Singleton für App-weite Nutzung
export const api = new ApiClient();

// Abwärtskompatible, zentrale Helfer
export async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
	return api.request(path, init);
}

export async function requestJSON<T = any>(path: string, init: RequestInit = {}): Promise<T> {
	return api.json<T>(path, init);
}

export type Role = 'demo' | 'common' | 'premium';
export type TokenPair = {
	access_token: string;
	refresh_token: string;
	token_type: 'bearer';
	expires_in: number;
	role: Role
};
export type UserRead = { id: number; email: string; is_active: boolean; created_at: string; role: Role };

export async function authRegister(email: string, password: string): Promise<UserRead | { ok: true } | any> {
	const res = await fetch(`${BASE_URL}/api/auth/register`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({email, password}),
	});
	const text = await res.text();
	const data = text ? JSON.parse(text) : null;
	if (!res.ok) {
		throw new ApiError(res.status, data);
	}
	return data;
}

export async function authLogin(username: string, password: string): Promise<TokenPair> {
	const body = new URLSearchParams();
	body.append('username', username);
	body.append('password', password);
	const res = await fetch(`${BASE_URL}/api/auth/login`, {
		method: 'POST',
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		body: body.toString(),
	});
	const text = await res.text();
	const data = text ? JSON.parse(text) : null;
	if (!res.ok) {
		throw new ApiError(res.status, data);
	}
	// Persist only refresh; propagate access via callback
	await saveRefreshToken(data.refresh_token);
	if (api) await api['onTokenRefreshed']?.(data.access_token, data.refresh_token);
	return data as TokenPair;
}

export async function authMe(): Promise<UserRead> {
	return api.get<UserRead>(`/api/auth/me`);
}

export async function authRefresh(): Promise<TokenPair> {
	const refresh = await getRefreshToken();
	if (!refresh) throw new ApiError(401, {detail: 'No refresh token'});
	const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({refresh_token: refresh}),
	});
	const text = await res.text();
	const data = text ? JSON.parse(text) : null;
	if (!res.ok) {
		throw new ApiError(res.status, data);
	}
	await saveRefreshToken(data.refresh_token);
	if (api) await api['onTokenRefreshed']?.(data.access_token, data.refresh_token);
	return data as TokenPair;
}

export async function authLogout(): Promise<void> {
	try {
		await api.post(`/api/auth/logout`);
	} finally {
		await clearTokens();
	}
}

export async function getFeed() {
	return api.get('/api/home/feed');
}

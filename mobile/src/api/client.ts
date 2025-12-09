import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../storage/tokens';
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

type UnauthorizedReason = 'no_token' | 'unauthorized' | 'refresh_failed' | 'forbidden';

export type ApiClientOptions = {
  baseUrl?: string;
  onUnauthorized?: (reason: UnauthorizedReason) => void | Promise<void>;
  onTokenRefreshed?: (access: string, refresh: string) => void | Promise<void>;
};

export class ApiClient {
  private baseUrl: string;
  private refreshLock: Promise<boolean> | null = null;
  private onUnauthorized?: ApiClientOptions['onUnauthorized'];
  private onTokenRefreshed?: ApiClientOptions['onTokenRefreshed'];

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl = opts.baseUrl || BASE_URL;
    this.onUnauthorized = opts.onUnauthorized;
    this.onTokenRefreshed = opts.onTokenRefreshed;
  }

  configure(opts: ApiClientOptions) {
    if (opts.baseUrl) this.baseUrl = opts.baseUrl;
    this.onUnauthorized = opts.onUnauthorized ?? this.onUnauthorized;
    this.onTokenRefreshed = opts.onTokenRefreshed ?? this.onTokenRefreshed;
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      LOG.warn('refresh_failed', { status: res.status });
      if (this.onUnauthorized) await this.onUnauthorized('refresh_failed');
      return false;
    }
    const data = await res.json();
    await saveTokens(data.access_token, data.refresh_token);
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
    LOG.debug('request', { method, path });
    let access = await getAccessToken();
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (access) headers['Authorization'] = `Bearer ${access}`;
    let res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });

    if (res.status === 401) {
      LOG.warn('unauthorized_response', { path });
      const ok = await this.ensureRefreshed();
      if (!ok) {
        await clearTokens();
        if (this.onUnauthorized) await this.onUnauthorized('unauthorized');
        return res;
      }
      access = await getAccessToken();
      const retryHeaders: Record<string, string> = { ...(init.headers as Record<string, string>) };
      if (access) retryHeaders['Authorization'] = `Bearer ${access}`;
      res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: retryHeaders });
    }

    if (res.status === 403) {
      LOG.warn('forbidden_response', { path });
      if (this.onUnauthorized) await this.onUnauthorized('forbidden');
    }
    LOG.info('response', { method, path, status: res.status });
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
    return this.json<T>(path, { ...init, method: 'GET' });
  }
  post<T = any>(path: string, body?: any, headers?: Record<string, string>) {
    const h = { 'Content-Type': 'application/json', ...(headers || {}) };
    return this.json<T>(path, { method: 'POST', headers: h, body: body != null ? JSON.stringify(body) : undefined });
  }

  put<T = any>(path: string, body?: any, headers?: Record<string, string>) {
    const h = { 'Content-Type': 'application/json', ...(headers || {}) };
    return this.json<T>(path, { method: 'PUT', headers: h, body: body != null ? JSON.stringify(body) : undefined });
  }

  del<T = any>(path: string, headers?: Record<string, string>) {
    return this.json<T>(path, { method: 'DELETE', headers });
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

export async function login(username: string, password: string) {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new ApiError(res.status, msg, msg || 'Login failed');
  }
  const data = await res.json();
  await saveTokens(data.access_token, data.refresh_token);
  if (api) await api['onTokenRefreshed']?.(data.access_token, data.refresh_token);
  return data;
}

export async function signup(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new ApiError(res.status, msg, msg || 'Signup failed');
  }
  return res.json();
}

export async function getFeed() {
  return api.get('/api/home/feed');
}

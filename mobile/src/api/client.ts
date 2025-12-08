import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../storage/tokens';

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Eine einfache Sperre, um parallele Refresh-Requests zu verhindern
let refreshLock: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  await saveTokens(data.access_token, data.refresh_token);
  return true;
}

async function ensureRefreshed(): Promise<boolean> {
  if (!refreshLock) {
    refreshLock = doRefresh().finally(() => {
      // Nach Abschluss wieder freigeben
      refreshLock = null;
    });
  }
  return refreshLock;
}

export async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  let access = await getAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (access) headers['Authorization'] = `Bearer ${access}`;
  let res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    const ok = await ensureRefreshed();
    if (!ok) {
      await clearTokens();
      return res;
    }
    access = await getAccessToken();
    const retryHeaders: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };
    if (access) retryHeaders['Authorization'] = `Bearer ${access}`;
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers: retryHeaders });
  }
  return res;
}

export async function requestJSON<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(path, init);
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new Error(`Unerwartete Antwort: ${text}`);
  }
  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || res.statusText || 'Request fehlgeschlagen';
    throw new Error(String(message));
  }
  return data as T;
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
    throw new Error(msg || 'Login failed');
  }
  const data = await res.json();
  await saveTokens(data.access_token, data.refresh_token);
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
    throw new Error(msg || 'Signup failed');
  }
  return res.json();
}

export async function getFeed() {
  return requestJSON('/api/home/feed');
}

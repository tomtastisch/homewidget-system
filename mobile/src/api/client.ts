import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '../storage/tokens';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function refreshAccessToken(): Promise<boolean> {
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

export async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  let access = await getAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (access) headers['Authorization'] = `Bearer ${access}`;
  let res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    const ok = await refreshAccessToken();
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
  const res = await fetchWithAuth('/api/home/feed');
  if (!res.ok) throw new Error('Failed to load feed');
  return res.json();
}

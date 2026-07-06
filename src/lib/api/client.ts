/**
 * API client for aisphere-iam-front.
 *
 * Talks DIRECTLY to the aisphere-iam backend (no Next.js rewrites). The IAM URL
 * is configured via NEXT_PUBLIC_IAM_URL env var (defaults to
 * http://127.0.0.1:18080 for local dev).
 *
 * Auth:
 *
 *   Access token is stored in localStorage and sent as
 *   `Authorization: Bearer <token>` on every request. On 401, the
 *   client automatically calls /v1/iam/auth/refresh once and retries the
 *   original request. If refresh fails, tokens are cleared and the
 *   user is redirected to login.
 *
 *   Public endpoints (/v1/iam/login-url, /v1/iam/auth/exchange, etc.) do
 *   not require a token — the IAM service's authn middleware skips them.
 */

const TOKEN_KEY = 'iam_console_token';
const REFRESH_KEY = 'iam_console_refresh';
const ID_TOKEN_KEY = 'iam_console_id_token';
const EXPIRES_KEY = 'iam_console_expires';

/** IAM base URL. Always ends without trailing slash. */
export const IAM_URL: string = (
  process.env.NEXT_PUBLIC_IAM_URL || 'http://127.0.0.1:18080'
).replace(/\/+$/, '');

/** Listeners fired when the session becomes invalid (401) or on explicit logout. */
type AuthListener = (reason: 'expired' | 'logout' | 'manual') => void;
const authListeners = new Set<AuthListener>();

export function onAuthEvent(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function emitAuth(reason: 'expired' | 'logout' | 'manual') {
  authListeners.forEach((l) => {
    try {
      l(reason);
    } catch {
      /* ignore */
    }
  });
}

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getRefreshToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REFRESH_KEY) || '';
}

export function getIdToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ID_TOKEN_KEY) || '';
}

export function setTokens(
  accessToken: string,
  refreshToken?: string,
  opts?: { idToken?: string; expiresIn?: number },
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (opts?.idToken) localStorage.setItem(ID_TOKEN_KEY, opts.idToken);
  if (opts?.expiresIn && opts.expiresIn > 0) {
    const expiresAt = Date.now() + opts.expiresIn * 1000;
    localStorage.setItem(EXPIRES_KEY, String(expiresAt));
  }
}

export function getTokenExpiresAt(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(EXPIRES_KEY);
  return raw ? Number(raw) : 0;
}

/** Returns true if the access token is expired or about to expire (within 60s). */
export function isTokenExpiring(): boolean {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return false;
  return Date.now() > expiresAt - 60_000;
}

export function clearTokens(reason: 'expired' | 'logout' | 'manual' = 'manual') {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  emitAuth(reason);
}

// ─── Refresh machinery ────────────────────────────────────────────────
// Avoids parallel refresh storms when multiple API calls hit 401 at once.
let refreshPromise: Promise<string> | null = null;
let onManualRefresh:
  | (() => Promise<{
      accessToken: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn?: number;
    }>)
  | null = null;

/** Allows the auth module to register its refresh implementation. */
export function registerRefreshFn(
  fn:
    | (() => Promise<{
        accessToken: string;
        refreshToken?: string;
        idToken?: string;
        expiresIn?: number;
      }>)
    | null,
) {
  onManualRefresh = fn;
}

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  if (!onManualRefresh) return Promise.reject(new Error('no refresh fn'));
  refreshPromise = onManualRefresh()
    .then((res) => {
      setTokens(res.accessToken, res.refreshToken, {
        idToken: res.idToken,
        expiresIn: res.expiresIn,
      });
      return res.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/**
 * Core request function. Sends a request to the IAM service, auto-refreshes
 * on 401, and returns the JSON body.
 *
 * `path` is a path relative to IAM_URL (e.g. '/v1/iam/me').
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const fullUrl = IAM_URL + path;
  const headers = new Headers(init.headers || []);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(fullUrl, { ...init, headers });

  // Try one automatic refresh on 401 if we have a refresh token.
  // Skip the refresh endpoint itself to avoid infinite loops.
  if (res.status === 401 && token && getRefreshToken() && !path.endsWith('/v1/iam/auth/refresh')) {
    try {
      const newToken = await refreshAccessToken();
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(fullUrl, { ...init, headers });
    } catch {
      clearTokens('expired');
      throw new Error('common.sessionExpired');
    }
  }

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (res.status === 401) clearTokens('expired');
    let msg = `${res.status} ${res.statusText}`;
    try {
      if (contentType.includes('json')) {
        const j = await res.json();
        msg = j.message || j.error || msg;
      } else {
        const text = await res.text();
        if (text.length < 200) msg = text;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(msg);
  }

  // Empty body (e.g. DELETE returns empty).
  if (contentType.includes('application/json') || contentType === '') {
    const text = await res.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  return (await res.text()) as T;
}

/**
 * Build a URL query string from a params object. Skips undefined / null
 * / empty-string values.
 */
export function toQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  return q.toString();
}
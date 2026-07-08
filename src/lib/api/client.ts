/**
 * API base for browser-side IAM requests.
 *
 * In production this can be left empty for same-origin Envoy Gateway hosting.
 * In local development set NEXT_PUBLIC_IAM_URL to the Gateway/IAM origin, for
 * example https://api.weagent.cc:30723.
 */
export const IAM_URL: string = (process.env.NEXT_PUBLIC_IAM_URL || '').replace(/\/+$/, '');

const LOGIN_PROBE_KEY = 'aisphere_iam_gateway_login_started';

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`IAM request path must be relative: ${path}`);
  }
  return IAM_URL ? `${IAM_URL}${path}` : path;
}

function apiOrigin(): string {
  if (typeof window === 'undefined' || !IAM_URL) return '';
  try {
    return new URL(IAM_URL, window.location.origin).origin;
  } catch {
    return '';
  }
}

export function isCrossOriginIAM(): boolean {
  if (typeof window === 'undefined' || !IAM_URL) return false;
  return apiOrigin() !== '' && apiOrigin() !== window.location.origin;
}

export function markGatewayLoginStarted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LOGIN_PROBE_KEY, '1');
  } catch {
    // Ignore unavailable storage, for example strict privacy modes.
  }
}

function hasGatewayLoginStarted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(LOGIN_PROBE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Same-origin Gateway hosting can always probe /me because the whole frontend is
 * already behind OIDC. In local cross-origin development, probing /me before the
 * user clicks Login triggers Envoy's OIDC redirect inside XHR, producing noisy
 * authorize requests whose state points to /v1/iam/me. Avoid that until a login
 * flow has been started explicitly.
 */
export function shouldProbePrincipal(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isCrossOriginIAM()) return true;
  return hasGatewayLoginStarted();
}

export function buildGatewayLoginUrl(): string {
  markGatewayLoginStarted();
  const loginUrl = process.env.NEXT_PUBLIC_GATEWAY_LOGIN_URL || '/v1/iam/ui/login';
  const target = loginUrl.startsWith('/') ? apiUrl(loginUrl) : loginUrl;
  if (typeof window === 'undefined') return target;
  const url = new URL(target, window.location.origin);
  url.searchParams.set('return_to', window.location.href);
  return url.toString();
}

export function buildGatewayLogoutUrl(): string {
  const logoutUrl = process.env.NEXT_PUBLIC_GATEWAY_LOGOUT_URL || '/v1/iam/logout';
  return logoutUrl.startsWith('/') ? apiUrl(logoutUrl) : logoutUrl;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || []);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: init.credentials || 'include',
    redirect: init.redirect || 'manual',
    headers,
  });

  const contentType = res.headers.get('content-type') || '';

  if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      if (contentType.includes('json')) {
        const j = await res.json();
        msg = j.message || j.error || msg;
      } else {
        const text = await res.text();
        if (text.length > 0 && text.length < 200) msg = text;
      }
    } catch {
      // Ignore parse errors and preserve the status message.
    }
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text) return {} as T;

  if (contentType.includes('json') || contentType === '') {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  return text as T;
}

export function toQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  return q.toString();
}

/**
 * API base for browser-side IAM requests.
 *
 * In production with same-origin Envoy Gateway hosting (iam.weagent.cc),
 * this can be left empty. In local development set NEXT_PUBLIC_IAM_URL
 * to the Gateway/IAM origin.
 */
export const IAM_URL: string = (process.env.NEXT_PUBLIC_IAM_URL || '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`IAM request path must be relative: ${path}`);
  }
  return IAM_URL ? `${IAM_URL}${path}` : path;
}

/**
 * Build the login URL.
 *
 * In production, the frontend is behind Envoy Gateway OIDC protection.
 * Simply navigate to a protected route (e.g. /app) and Envoy will
 * automatically redirect to Casdoor for authentication.
 *
 * In local cross-origin development, navigate to the Gateway's protected URL.
 */
export function buildGatewayLoginUrl(): string {
  // 整个 IAM 前端在 OIDC 保护下，直接访问首页即可触发 Envoy 登录
  const loginUrl = process.env.NEXT_PUBLIC_GATEWAY_LOGIN_URL || '/';
  return loginUrl.startsWith('/') ? apiUrl(loginUrl) : loginUrl;
}

/**
 * Build the logout URL.
 */
export function buildGatewayLogoutUrl(): string {
  const logoutUrl = process.env.NEXT_PUBLIC_GATEWAY_LOGOUT_URL || '/logout';
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
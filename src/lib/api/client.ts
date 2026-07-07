const DEFAULT_IAM_URL = 'http://127.0.0.1:18080';

/**
 * IAM upstream used by Next.js rewrites in local/dev deployments.
 *
 * Browser-side API calls intentionally use relative paths. In production the
 * frontend and IAM API should be exposed by the same Envoy Gateway host, for
 * example:
 *
 *   https://iam.weagent.cc:30723/        -> iam-front
 *   https://iam.weagent.cc:30723/v1/iam -> aisphere-iam
 */
export const IAM_URL: string = (process.env.NEXT_PUBLIC_IAM_URL || DEFAULT_IAM_URL).replace(/\/+$/, '');

export function buildGatewayLogoutUrl(): string {
  return process.env.NEXT_PUBLIC_GATEWAY_LOGOUT_URL || '/v1/iam/logout';
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/')) {
    throw new Error(`IAM request path must be relative: ${path}`);
  }

  const headers = new Headers(init.headers || []);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
      window.location.href = '/';
    }

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

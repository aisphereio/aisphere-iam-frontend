import { apiUrl } from './client';

export type IamFetchConfig = RequestInit & { url: string };

type KernelErrorEnvelope = {
  code?: string;
  message?: string;
  request_id?: string;
  trace_id?: string;
  metadata?: Record<string, unknown>;
};

export class IamApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(status: number, envelope: KernelErrorEnvelope = {}) {
    super(envelope.message || `IAM API request failed with status ${status}`);
    this.name = 'IamApiError';
    this.status = status;
    this.code = envelope.code || `HTTP_${status}`;
    this.requestId = envelope.request_id;
    this.traceId = envelope.trace_id;
    this.metadata = envelope.metadata;
  }
}

export function iamFetch<T>(config: IamFetchConfig): Promise<T>;
export function iamFetch<T>(url: string, init?: RequestInit): Promise<T>;
export async function iamFetch<T>(configOrUrl: IamFetchConfig | string, init: RequestInit = {}): Promise<T> {
  const { url, requestInit } = splitConfig(configOrUrl, init);
  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !isFormData(requestInit.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(url), {
    ...requestInit,
    credentials: requestInit.credentials || 'include',
    redirect: requestInit.redirect || 'manual',
    headers,
  });

  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    throw new IamApiError(response.status, await readErrorEnvelope(response));
  }

  const text = await response.text();
  if (!text) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('json') || contentType === '') {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
  return text as T;
}

function splitConfig(configOrUrl: IamFetchConfig | string, init: RequestInit) {
  if (typeof configOrUrl === 'string') {
    return { url: configOrUrl, requestInit: init };
  }
  const { url, ...requestInit } = configOrUrl;
  return { url, requestInit };
}

function isFormData(body: BodyInit): boolean {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function readErrorEnvelope(response: Response): Promise<KernelErrorEnvelope> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    try {
      const body = await response.json();
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        return body as KernelErrorEnvelope;
      }
    } catch {
      return {};
    }
  }
  try {
    const message = (await response.text()).trim();
    return message ? { message } : {};
  } catch {
    return {};
  }
}

import { apiUrl } from './client';

export type IamFetchConfig = RequestInit & { url: string };

type KernelErrorEnvelope = {
  code?: string;
  message?: string;
  reason?: string;
  request_id?: string;
  trace_id?: string;
  decision_id?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Structured IAM API error with enriched fields extracted from the Kernel
 * error envelope and its metadata.
 */
export class IamApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly decisionId?: string;
  readonly reason?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly requiredPermission?: string;
  readonly fieldViolations?: Record<string, string>;
  readonly metadata?: Record<string, unknown>;

  constructor(status: number, envelope: KernelErrorEnvelope = {}) {
    super(envelope.message || `IAM API request failed with status ${status}`);
    this.name = 'IamApiError';
    this.status = status;
    this.code = envelope.code || `HTTP_${status}`;
    this.requestId = envelope.request_id;
    this.traceId = envelope.trace_id;
    this.decisionId = envelope.decision_id;
    this.reason = envelope.reason;
    this.metadata = envelope.metadata;

    // Extract enriched fields from metadata when present
    if (envelope.metadata) {
      this.decisionId ??= asString(envelope.metadata.decision_id);
      this.reason ??= asString(envelope.metadata.reason);
      this.resourceType = asString(envelope.metadata.resource_type);
      this.resourceId = asString(envelope.metadata.resource_id);
      this.requiredPermission = asString(envelope.metadata.required_permission);
      this.fieldViolations = envelope.metadata.field_violations as Record<string, string> | undefined;
    }
  }

  /** True if the error is an authentication failure (not logged in). */
  get isAuthFailure(): boolean {
    return this.status === 401 || this.code === 'UNAUTHENTICATED';
  }

  /** True if the error is an authorization failure (logged in but denied). */
  get isPermissionDenied(): boolean {
    return this.status === 403 || this.code.startsWith('AUTHZ_') || this.code === 'PERMISSION_DENIED';
  }

  /** True if the error is a client-side validation error. */
  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /** True if the error is a server-side failure. */
  get isServerError(): boolean {
    return this.status >= 500;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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
    throw new IamApiError(response.status, {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required — redirect to login',
    });
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

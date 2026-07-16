import { afterEach, describe, expect, it, vi } from 'vitest';

import { IamApiError, iamFetch } from './iam-fetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('iamFetch', () => {
  it('sends the Envoy session cookie and preserves caller headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'group-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await iamFetch<{ id: string }>({
      url: '/v1/iam/groups',
      method: 'POST',
      headers: { 'X-Request-Source': 'group-editor' },
      body: JSON.stringify({ group: { name: 'dev' } }),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/v1/iam/groups');
    expect(init.credentials).toBe('include');
    expect(init.redirect).toBe('manual');
    expect(new Headers(init.headers).get('X-Request-Source')).toBe('group-editor');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('reports a manual redirect as an authentication challenge', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302 })));

    const error = await iamFetch({ url: '/v1/iam/me' }).catch((caught) => caught);
    expect(error).toBeInstanceOf(IamApiError);
    expect(error).toMatchObject({
      status: 302,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('throws the Kernel error envelope with correlation metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 'IAM_PERMISSION_DENIED',
      message: 'Permission denied',
      request_id: 'req-1',
      trace_id: 'trace-1',
      metadata: { action: 'edit_group' },
    }, 403)));

    const error = await iamFetch({ url: '/v1/iam/groups' }).catch((caught) => caught);

    expect(error).toBeInstanceOf(IamApiError);
    expect(error).toMatchObject({
      status: 403,
      code: 'IAM_PERMISSION_DENIED',
      requestId: 'req-1',
      traceId: 'trace-1',
      metadata: { action: 'edit_group' },
    });
  });

  it('returns typed JSON for successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ groups: [{ id: 'g1' }] })));

    const result = await iamFetch<{ groups: Array<{ id: string }> }>({ url: '/v1/iam/groups' });

    expect(result.groups[0].id).toBe('g1');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { iamAuthApi } from '@/lib/api';
import { buildGatewayLogoutUrl } from '@/lib/api/client';
import type { IamPrincipal } from '@/lib/api/types';

type GetMeReply = {
  principal?: IamPrincipal;
};

function unwrapPrincipal(value: IamPrincipal | GetMeReply): IamPrincipal {
  const reply = value as GetMeReply;
  return reply.principal || (value as IamPrincipal);
}

/**
 * Fetch the current user principal.
 *
 * Same-origin Gateway deployments can probe immediately. Local cross-origin
 * development should pass enabled=false until the user explicitly starts login,
 * otherwise Envoy OIDC redirects are triggered inside XHR requests to /me.
 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['iam', 'me'],
    queryFn: async () => unwrapPrincipal(await iamAuthApi.getMe()),
    retry: 1,
    staleTime: 30_000,
    enabled,
  });
}

/** Logout through the IAM backend logout endpoint. */
export function useLogout() {
  return async () => {
    window.location.href = buildGatewayLogoutUrl();
  };
}

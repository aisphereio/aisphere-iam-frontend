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
 * Envoy Gateway owns the OIDC browser session. If the user is not authenticated,
 * Gateway redirects before the request reaches the frontend or IAM backend.
 */
export function useMe() {
  return useQuery({
    queryKey: ['iam', 'me'],
    queryFn: async () => unwrapPrincipal(await iamAuthApi.getMe()),
    retry: 1,
    staleTime: 30_000,
  });
}

/** Logout through the Gateway OIDC logout endpoint. */
export function useLogout() {
  return async () => {
    window.location.href = buildGatewayLogoutUrl();
  };
}

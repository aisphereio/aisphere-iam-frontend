'use client';

import { useQuery } from '@tanstack/react-query';
import { iamAuthApi } from '@/lib/api';
import { buildGatewayLogoutUrl, isGatewayOIDCMode } from '@/lib/api/client';

/**
 * Fetch the current user principal.
 *
 * In Gateway-only OIDC mode, the Envoy Gateway handles authentication.
 * If the user is not authenticated, the Gateway redirects to Casdoor
 * before the request reaches the frontend. So this hook always assumes
 * the user is authenticated when the page loads.
 */
export function useMe() {
  return useQuery({
    queryKey: ['iam', 'me'],
    queryFn: () => iamAuthApi.getMe(),
    retry: 1,
    staleTime: 30_000,
  });
}

/**
 * Logout by redirecting to the Gateway's OIDC logout endpoint.
 * The Gateway handles the Casdoor RP-Initiated Logout flow.
 */
export function useLogout() {
  return async () => {
    const logoutUrl = buildGatewayLogoutUrl();
    window.location.href = logoutUrl;
  };
}
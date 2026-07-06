'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { iamAuthApi } from '@/lib/api';
import {
  getToken,
  getRefreshToken,
  getIdToken,
  setTokens,
  clearTokens,
  registerRefreshFn,
  onAuthEvent,
} from '@/lib/api/client';
import type { IamPrincipal } from '@/lib/api/types';

// Register the IAM refresh implementation once at module load.
registerRefreshFn(async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('common.noRefreshToken');
  const res = await iamAuthApi.refreshToken(refreshToken);
  return {
    accessToken: res.accessToken || '',
    refreshToken: res.refreshToken || '',
    idToken: res.idToken || '',
    expiresIn: res.expiresIn || 0,
  };
});

/** Fetch the current user principal. Enabled only when a token exists. */
export function useMe() {
  const token = typeof window !== 'undefined' ? getToken() : '';
  return useQuery({
    queryKey: ['iam', 'me'],
    queryFn: () => iamAuthApi.getMe(),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 30_000,
  });
}

/** Returns a logout function that clears tokens and redirects. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const idToken = getIdToken();
    const redirectUri = typeof window !== 'undefined'
      ? window.location.origin
      : '';

    // Ask IAM for the Casdoor logout URL before clearing tokens so the
    // request carries Authorization and the backend can revoke the token.
    let logoutUrl = '';
    try {
      logoutUrl = await iamAuthApi.logoutUrl(redirectUri, idToken);
    } catch {
      // If the JSON endpoint fails, fall back to a direct Casdoor logout URL.
      // The backend will handle the 302 redirect.
    }

    clearTokens('logout');
    queryClient.clear();

    if (typeof window !== 'undefined' && logoutUrl) {
      window.location.href = logoutUrl;
    }
  }, [queryClient]);
}

/** Subscribe to forced-logout events (401, refresh failure). */
export function useAuthEvents(handlers?: {
  onExpired?: () => void;
  onLogout?: () => void;
}) {
  useEffect(() => {
    if (!handlers) return;
    const off = onAuthEvent((reason) => {
      if (reason === 'expired') handlers.onExpired?.();
      if (reason === 'logout') handlers.onLogout?.();
    });
    return off;
  }, [handlers]);
}

/** Exchange an OAuth code for tokens and store them. */
export function useAuthCallback() {
  const queryClient = useQueryClient();

  return useCallback(
    async (code: string, redirectUri: string) => {
      const tokens = await iamAuthApi.exchangeCode(code, redirectUri);
      if (!tokens.accessToken) throw new Error('common.noAccessToken');
      setTokens(tokens.accessToken, tokens.refreshToken, {
        idToken: tokens.idToken,
        expiresIn: tokens.expiresIn,
      });
      queryClient.invalidateQueries({ queryKey: ['iam', 'me'] });
    },
    [queryClient],
  );
}
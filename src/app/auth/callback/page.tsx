'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { setTokens } from '@/lib/api/client';
import { iamAuthApi } from '@/lib/api';
import { useT } from '@/lib/i18n';

const CALLBACK_EXCHANGE_TTL_MS = 2 * 60 * 1000;

function readTokenParam(params: URLSearchParams, key: string): string {
  return params.get(key) || params.get(key.replace('_', '')) || '';
}

function exchangeStorageKey(code: string, state: string): string {
  return `aisphere:iam:oauth-code:${state}:${code}`;
}

function hasRecentExchangeAttempt(key: string): boolean {
  const raw = sessionStorage.getItem(key);
  if (!raw) return false;
  const startedAt = Number(raw);
  return Number.isFinite(startedAt) && Date.now() - startedAt < CALLBACK_EXCHANGE_TTL_MS;
}

export default function AuthCallbackPage() {
  const t = useT();
  const startedRef = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function completeLogin() {
      let exchangeKey = '';
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search.replace(/^\?/, ''));
        const accessToken = readTokenParam(hashParams, 'access_token') || readTokenParam(queryParams, 'access_token');
        const refreshToken = readTokenParam(hashParams, 'refresh_token') || readTokenParam(queryParams, 'refresh_token');
        const idToken = readTokenParam(hashParams, 'id_token') || readTokenParam(queryParams, 'id_token');
        const expiresInRaw = readTokenParam(hashParams, 'expires_in') || readTokenParam(queryParams, 'expires_in');
        const code = queryParams.get('code') || '';
        const state = queryParams.get('state') || '';
        const next = queryParams.get('next') || '/';
        const safeNext = next.startsWith('/') ? next : '/';

        if (!accessToken && !code) {
          setError(t('login.noToken'));
          return;
        }

        // OAuth authorization codes are single-use. Remove the code/state from
        // the URL before exchanging so refresh, route remount, React StrictMode,
        // or browser back/forward cannot replay the same code.
        window.history.replaceState({}, document.title, window.location.pathname);
        setMessage(t('login.storing'));

        if (accessToken) {
          setTokens(accessToken, refreshToken || undefined, {
            idToken: idToken || undefined,
            expiresIn: expiresInRaw ? Number(expiresInRaw) : undefined,
          });
        } else if (code) {
          exchangeKey = exchangeStorageKey(code, state);
          if (hasRecentExchangeAttempt(exchangeKey)) {
            setMessage(t('login.completing'));
            window.location.replace(safeNext);
            return;
          }
          sessionStorage.setItem(exchangeKey, String(Date.now()));

          const callbackPath = process.env.NEXT_PUBLIC_AUTH_CALLBACK_PATH || '/auth/callback';
          const redirectUri = callbackPath.startsWith('http')
            ? callbackPath
            : `${window.location.origin}${callbackPath}`;
          const tokens = await iamAuthApi.exchangeCode(code, redirectUri, state);
          if (!tokens.accessToken) {
            sessionStorage.removeItem(exchangeKey);
            setError(t('login.noToken'));
            return;
          }
          setTokens(tokens.accessToken, tokens.refreshToken || undefined, {
            idToken: tokens.idToken || undefined,
            expiresIn: tokens.expiresIn,
          });
        }

        window.location.replace(safeNext);
      } catch (e) {
        if (exchangeKey) {
          sessionStorage.removeItem(exchangeKey);
        }
        setError(e instanceof Error ? e.message : t('common.error'));
      }
    }
    completeLogin();
  }, [t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        {error ? (
          <>
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{message || t('login.completing')}</span>
          </>
        )}
      </div>
    </div>
  );
}

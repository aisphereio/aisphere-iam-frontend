'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { iamAuthApi } from '@/lib/api';
import { buildGatewayLogoutUrl } from '@/lib/api/client';
import type { IamPrincipal } from '@/lib/api/types';

type GetMeReply = {
  principal?: IamPrincipal;
};

function copyAlias(target: Record<string, unknown>, source: Record<string, unknown>, camelKey: string, snakeKey: string) {
  if (target[camelKey] === undefined && source[snakeKey] !== undefined) {
    target[camelKey] = source[snakeKey];
  }
}

function normalizePrincipal(value: IamPrincipal): IamPrincipal {
  const source = value as Record<string, unknown>;
  const principal = { ...value } as IamPrincipal;
  const target = principal as Record<string, unknown>;

  copyAlias(target, source, 'subjectId', 'subject_id');
  copyAlias(target, source, 'subjectType', 'subject_type');
  copyAlias(target, source, 'externalId', 'external_id');
  copyAlias(target, source, 'tenantId', 'tenant_id');
  copyAlias(target, source, 'orgId', 'org_id');
  copyAlias(target, source, 'appId', 'app_id');
  copyAlias(target, source, 'projectId', 'project_id');
  copyAlias(target, source, 'displayName', 'display_name');
  copyAlias(target, source, 'authMethod', 'auth_method');
  copyAlias(target, source, 'issuedAt', 'issued_at');
  copyAlias(target, source, 'expiresAt', 'expires_at');

  return principal;
}

function unwrapPrincipal(value: IamPrincipal | GetMeReply): IamPrincipal {
  const reply = value as GetMeReply;
  return normalizePrincipal(reply.principal || (value as IamPrincipal));
}

/**
 * Fetch the current user principal.
 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['iam', 'me'],
    queryFn: async () => unwrapPrincipal(await iamAuthApi.getMe()),
    retry: false,
    staleTime: 30_000,
    enabled,
  });
}

/** Logout through the Envoy Gateway logout endpoint. */
export function useLogout() {
  return React.useCallback(async () => {
    window.location.href = buildGatewayLogoutUrl();
  }, []);
}
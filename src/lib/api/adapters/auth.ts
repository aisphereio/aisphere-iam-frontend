import { iAMAuthServiceGetMe } from '../generated/iamauth-service/iamauth-service';
import type { IamPrincipal } from '../types';

/** IAM Auth Service */
export const iamAuthApi = {
  /** Get current user principal from the IAM backend. */
  getMe: async (): Promise<IamPrincipal> => {
    const reply = await iAMAuthServiceGetMe();
    const p = reply.principal;
    return {
      subjectId: p?.subjectId || '',
      subjectType: p?.subjectType || '',
      provider: p?.provider,
      externalId: p?.externalId,
      issuer: p?.issuer,
      audience: p?.audience,
      tenantId: p?.tenantId,
      orgId: p?.orgId,
      appId: p?.appId,
      projectId: p?.projectId,
      username: p?.username,
      name: p?.name,
      email: p?.email,
      phone: p?.phone,
      roles: p?.roles,
      groups: p?.groups,
      scopes: p?.scopes,
      authMethod: p?.authMethod,
      issuedAt: p?.issuedAt,
      expiresAt: p?.expiresAt,
    };
  },
};
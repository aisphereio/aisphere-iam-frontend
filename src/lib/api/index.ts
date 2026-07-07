import {
  request,
  toQuery,
  getToken,
  IAM_URL,
  isGatewayOIDCMode,
  buildGatewayLoginUrl,
  buildGatewayLogoutUrl,
} from './client';
import type {
  IamPrincipal,
  IamUser,
  IamOrganization,
  IamGroup,
  IamCpOrganization,
  IamProject,
  IamCapability,
  IamProjectCapability,
  IamResourceType,
  IamResource,
  IamResourceBinding,
  IamRoleTemplate,
  IamGrant,
  IamRelationship,
  IamCheckPermissionRequest,
  IamCheckPermissionResponse,
  LocalUser,
} from './types';

// ─── IAM Service API (aisphere-iam /v1/iam/*) ──────────────────────────

function iamRequest<T>(path: string, init: RequestInit = {}, publicEndpoint = false): Promise<T> {
  const fullUrl = IAM_URL + path;
  const headers = new Headers(init.headers || []);
  const gatewayMode = isGatewayOIDCMode();
  // Public endpoints (login-url, exchange, etc.) must NOT send Authorization
  // header, otherwise the IAM backend will try to validate a stale token
  // before processing the request, causing 401 and consuming the OAuth code.
  if (!gatewayMode && !publicEndpoint) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(fullUrl, {
    ...init,
    headers,
    credentials: gatewayMode ? 'include' : init.credentials,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        msg = j.message || j.error || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  });
}

/** IAM Auth Service */
export const iamAuthApi = {
  /** Build Casdoor OAuth login URL. In gateway_oidc mode, this returns a Gateway-protected URL. */
  buildLoginUrl: (redirectUri: string, state = '') => {
    if (isGatewayOIDCMode()) {
      return Promise.resolve(buildGatewayLoginUrl(state));
    }
    return iamRequest<{ loginUrl?: string; login_url?: string }>(
      `/v1/iam/login-url?${toQuery({ redirect_uri: redirectUri, state })}`,
      {},
      true, // public endpoint, no auth header
    ).then((r) => r.loginUrl || r.login_url || '');
  },

  /** Exchange authorization code for tokens. Disabled when Envoy Gateway owns the OIDC callback. */
  exchangeCode: async (code: string, redirectUri: string, state = '') => {
    if (isGatewayOIDCMode()) {
      throw new Error('OAuth code exchange is handled by Envoy Gateway in gateway_oidc mode');
    }
    const raw = await iamRequest<{
      tokens?: {
        accessToken?: string;
        refreshToken?: string;
        idToken?: string;
        tokenType?: string;
        expiresIn?: number;
        scope?: string;
        access_token?: string;
        refresh_token?: string;
        id_token?: string;
        token_type?: string;
        expires_in?: number;
      };
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
      tokenType?: string;
      expiresIn?: number;
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
      token_type?: string;
      expires_in?: number;
    }>('/v1/iam/auth/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
    }, true); // public endpoint, no auth header
    // Handle both nested { tokens: {...} } and flat response structures
    const t = raw.tokens || raw;
    return {
      accessToken: t.accessToken || t.access_token || '',
      refreshToken: t.refreshToken || t.refresh_token || '',
      idToken: t.idToken || t.id_token || '',
      tokenType: t.tokenType || t.token_type || '',
      expiresIn: t.expiresIn || t.expires_in || 0,
    };
  },

  /** Refresh access token */
  refreshToken: (refreshToken: string) => {
    if (isGatewayOIDCMode()) {
      return Promise.reject(new Error('Session refresh is handled by Envoy Gateway in gateway_oidc mode'));
    }
    return iamRequest<{
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn?: number;
    }>('/v1/iam/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  /** Get current user profile */
  getMe: () => iamRequest<IamPrincipal>('/v1/iam/me'),

  /** Build Casdoor OIDC RP-Initiated Logout URL */
  logoutUrl: (postLogoutRedirectUri = '', idTokenHint = '', state = '') => {
    if (isGatewayOIDCMode()) {
      return Promise.resolve(buildGatewayLogoutUrl());
    }
    const q = toQuery({
      post_logout_redirect_uri: postLogoutRedirectUri,
      id_token_hint: idTokenHint,
      state,
    });
    return iamRequest<{ logoutUrl?: string; logout_url?: string }>(
      `/v1/iam/logout-url${q ? `?${q}` : ''}`,
      { method: 'GET' },
      true, // public endpoint, no auth header
    ).then((r) => r.logoutUrl || r.logout_url || '');
  },
};

/** IAM Directory Service */
export const iamDirectoryApi = {
  /** Get a user by org and user id */
  getUser: (orgId: string, userId: string) =>
    iamRequest<IamUser>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}`),

  /** List users in an organization */
  listUsers: (orgId: string) =>
    iamRequest<{ users: IamUser[] }>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/users`),

  /** Get organization */
  getOrganization: (orgId: string) =>
    iamRequest<IamOrganization>(`/v1/iam/orgs/${encodeURIComponent(orgId)}`),

  /** List groups in an organization */
  listGroups: (orgId: string) =>
    iamRequest<{ groups: IamGroup[] }>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups`),
};

/** IAM Permission Service */
export const iamPermissionApi = {
  /** Check permission */
  check: (req: IamCheckPermissionRequest) =>
    iamRequest<IamCheckPermissionResponse>('/v1/iam/permissions/check', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** Write relationship */
  writeRelationship: (relationship: IamRelationship) =>
    iamRequest<{ consistencyToken?: string }>('/v1/iam/relationships', {
      method: 'POST',
      body: JSON.stringify(relationship),
    }),

  /** Delete relationship */
  deleteRelationship: (relationship: IamRelationship) =>
    iamRequest<{ consistencyToken?: string }>('/v1/iam/relationships/delete', {
      method: 'POST',
      body: JSON.stringify(relationship),
    }),
};

/** IAM Project Service (Control Plane) */
export const iamProjectApi = {
  /** Create organization */
  createOrganization: (org: { slug: string; displayName?: string; casdoorOrg?: string }) =>
    iamRequest<IamCpOrganization>('/v1/iam/control-plane/orgs', {
      method: 'POST',
      body: JSON.stringify(org),
    }),

  /** Get organization */
  getOrganization: (orgId: string) =>
    iamRequest<IamCpOrganization>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}`),

  /** List organizations */
  listOrganizations: () =>
    iamRequest<{ organizations: IamCpOrganization[] }>('/v1/iam/control-plane/orgs'),

  /** Update organization */
  updateOrganization: (orgId: string, org: Partial<IamCpOrganization>) =>
    iamRequest<IamCpOrganization>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}`, {
      method: 'PATCH',
      body: JSON.stringify(org),
    }),

  /** Archive organization */
  archiveOrganization: (orgId: string) =>
    iamRequest<{ success: boolean }>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}/archive`, {
      method: 'POST',
    }),

  /** Create project */
  createProject: (orgId: string, project: { slug: string; displayName?: string; description?: string }) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}/projects`, {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  /** Get project */
  getProject: (projectId: string) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`),

  /** List projects */
  listProjects: () =>
    iamRequest<{ projects: IamProject[] }>('/v1/iam/control-plane/projects'),

  /** Update project */
  updateProject: (projectId: string, project: Partial<IamProject>) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    }),

  /** Archive project */
  archiveProject: (projectId: string) =>
    iamRequest<{ success: boolean }>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    }),

  /** List capabilities */
  listCapabilities: () =>
    iamRequest<{ capabilities: IamCapability[] }>('/v1/iam/control-plane/capabilities'),

  /** Register capability */
  registerCapability: (capability: { name: string; displayName?: string; ownerService?: string }) =>
    iamRequest<IamCapability>('/v1/iam/control-plane/capabilities', {
      method: 'POST',
      body: JSON.stringify(capability),
    }),

  /** List project capabilities */
  listProjectCapabilities: (projectId: string) =>
    iamRequest<{ capabilities: IamProjectCapability[] }>(
      `/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/capabilities`,
    ),

  /** Enable project capability */
  enableProjectCapability: (projectId: string, capabilityId: string) =>
    iamRequest<{ success: boolean }>(
      `/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/capabilities/${encodeURIComponent(capabilityId)}/enable`,
      { method: 'POST' },
    ),

  /** Disable project capability */
  disableProjectCapability: (projectId: string, capabilityId: string) =>
    iamRequest<{ success: boolean }>(
      `/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/capabilities/${encodeURIComponent(capabilityId)}/disable`,
      { method: 'POST' },
    ),
};

/** IAM Resource Service */
export const iamResourceService = {
  /** Register resource type */
  registerResourceType: (rt: { type: string; displayName?: string; description?: string }) =>
    iamRequest<IamResourceType>('/v1/iam/control-plane/resource-types', {
      method: 'POST',
      body: JSON.stringify(rt),
    }),

  /** Get resource type */
  getResourceType: (type: string) =>
    iamRequest<IamResourceType>(`/v1/iam/control-plane/resource-types/${encodeURIComponent(type)}`),

  /** List resource types */
  listResourceTypes: () =>
    iamRequest<{ resourceTypes: IamResourceType[] }>('/v1/iam/control-plane/resource-types'),

  /** List resources */
  listResources: (params?: { type?: string; orgId?: string; projectId?: string }) =>
    iamRequest<{ resources: IamResource[] }>(
      `/v1/iam/control-plane/resources${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    ),

  /** Get resource */
  getResource: (resourceType: string, resourceId: string) =>
    iamRequest<IamResource>(
      `/v1/iam/control-plane/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`,
    ),

  /** List resource bindings */
  listResourceBindings: (params?: { resourceType?: string; resourceId?: string }) =>
    iamRequest<{ bindings: IamResourceBinding[] }>(
      `/v1/iam/control-plane/resource-bindings${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    ),
};

/** IAM Grant Service */
export const iamGrantService = {
  /** Register role template */
  registerRoleTemplate: (rt: { resourceType?: string; roleKey: string; displayName?: string; description?: string }) =>
    iamRequest<IamRoleTemplate>('/v1/iam/control-plane/role-templates', {
      method: 'POST',
      body: JSON.stringify(rt),
    }),

  /** List role templates */
  listRoleTemplates: () =>
    iamRequest<{ roleTemplates: IamRoleTemplate[] }>('/v1/iam/control-plane/role-templates'),

  /** Grant access */
  grantAccess: (grant: {
    resource?: { type: string; id: string };
    roleKey?: string;
    subject?: { type: string; id: string };
    reason?: string;
  }) =>
    iamRequest<IamGrant>('/v1/iam/control-plane/grants', {
      method: 'POST',
      body: JSON.stringify(grant),
    }),

  /** Revoke access */
  revokeAccess: (grantId: string) =>
    iamRequest<{ success: boolean }>(`/v1/iam/control-plane/grants/${encodeURIComponent(grantId)}`, {
      method: 'DELETE',
    }),

  /** List grants */
  listGrants: (params?: { resourceType?: string; resourceId?: string; subjectType?: string; subjectId?: string }) =>
    iamRequest<{ grants: IamGrant[] }>(
      `/v1/iam/control-plane/grants${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    ),

  /** Explain access */
  explainAccess: (params: { resource: { type: string; id: string }; subject: { type: string; id: string } }) =>
    iamRequest<{ grants: IamGrant[] }>('/v1/iam/control-plane/grants/explain', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// ─── Legacy Local User API (hub backend) ───────────────────────────────
// These are for the "Local Users" tab which manages users in the hub's
// own database (not Casdoor). They talk to the hub backend.

export const localUserApi = {
  list: () => request<{ users: LocalUser[] }>('/v1/users'),
  save: (u: LocalUser) =>
    request<LocalUser>('/v1/users', {
      method: 'POST',
      body: JSON.stringify(u),
    }),
  delete: (username: string) =>
    request<{ success: boolean }>(`/v1/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    }),
};

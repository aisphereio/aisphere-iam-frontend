import { request, toQuery } from './client';
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

function iamRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
}

/** IAM Auth Service
 *
 * Browser authentication is handled exclusively by Envoy Gateway OIDC.
 * The frontend does not build Casdoor login URLs, exchange authorization codes,
 * refresh access tokens, or persist token sets.
 */
export const iamAuthApi = {
  /** Get current user principal restored by Kernel from Gateway claim headers. */
  getMe: () => iamRequest<IamPrincipal>('/v1/iam/me'),

  /** Gateway logout endpoint configured in Envoy Gateway SecurityPolicy. */
  logoutUrl: () => Promise.resolve('/v1/iam/logout'),
};

/** IAM Directory Service
 *
 * Users are treated as external Casdoor users. The frontend is read-only and
 * does not create, update, disable, or delete identity-provider users.
 *
 * Casdoor organizations are displayed as read-only availability zones. Groups
 * are managed below a selected zone; the zone itself is never selectable as a
 * group and cannot be created from the IAM frontend.
 */
export const iamDirectoryApi = {
  /** Get a user by org and user id */
  getUser: (orgId: string, userId: string) =>
    iamRequest<IamUser>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}`),

  /** List external users in a Casdoor organization */
  listUsers: (
    orgId: string,
    params?: { query?: string; groupId?: string; role?: string; pageSize?: number; pageToken?: string },
  ) => {
    const q = toQuery({
      query: params?.query,
      group_id: params?.groupId,
      role: params?.role,
      page_size: params?.pageSize,
      page_token: params?.pageToken,
    });
    return iamRequest<{ users: IamUser[]; nextPageToken?: string; next_page_token?: string }>(
      `/v1/iam/orgs/${encodeURIComponent(orgId)}/users${q ? `?${q}` : ''}`,
    );
  },

  /** Get organization / availability zone */
  getOrganization: (orgId: string) =>
    iamRequest<IamOrganization>(`/v1/iam/orgs/${encodeURIComponent(orgId)}`),

  /** List groups in an availability zone */
  listGroups: (orgId: string, params?: { parentId?: string; type?: string; userId?: string }) => {
    const q = toQuery({
      parent_id: params?.parentId,
      type: params?.type,
      user_id: params?.userId,
    });
    return iamRequest<{ groups: IamGroup[] }>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups${q ? `?${q}` : ''}`);
  },

  /** Create a group below the read-only availability-zone root or another group. */
  createGroup: (orgId: string, group: { parentId?: string; name: string; displayName?: string; type?: string }) =>
    iamRequest<IamGroup>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups`, {
      method: 'POST',
      body: JSON.stringify(group),
    }),

  /** Update an existing group. */
  updateGroup: (orgId: string, groupId: string, group: { parentId?: string; name?: string; displayName?: string; type?: string }) =>
    iamRequest<IamGroup>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups/${encodeURIComponent(groupId)}`, {
      method: 'PATCH',
      body: JSON.stringify(group),
    }),

  /** Delete an existing group. Availability-zone roots cannot be deleted here. */
  deleteGroup: (orgId: string, groupId: string, recursive = false) =>
    iamRequest<{ success: boolean }>(
      `/v1/iam/orgs/${encodeURIComponent(orgId)}/groups/${encodeURIComponent(groupId)}${recursive ? '?recursive=true' : ''}`,
      { method: 'DELETE' },
    ),
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

// ─── Local User API ────────────────────────────────────────────────────

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

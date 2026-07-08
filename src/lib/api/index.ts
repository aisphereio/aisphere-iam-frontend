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
  IamAuthzSchemaReply,
  IamAuthzRelationshipListReply,
  IamAuthzEffectivePermissionsReply,
  LocalUser,
} from './types';

// ─── IAM Service API (aisphere-iam /v1/iam/*) ──────────────────────────

function iamRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
}

function relationshipFilterBody(filter: {
  resourceType?: string;
  resourceId?: string;
  relation?: string;
  subjectType?: string;
  subjectId?: string;
  subjectRelation?: string;
}) {
  return {
    resource_type: filter.resourceType,
    resource_id: filter.resourceId,
    relation: filter.relation,
    subject_type: filter.subjectType,
    subject_id: filter.subjectId,
    subject_relation: filter.subjectRelation,
  };
}

function checkPermissionBody(req: IamCheckPermissionRequest) {
  return {
    subject: req.subject,
    resource: req.resource,
    permission: req.permission,
    org_id: req.orgId,
    project_id: req.projectId,
  };
}

type ApiRecord = Record<string, unknown>;

function asRecord(input: unknown): ApiRecord {
  if (input && typeof input === 'object' && !Array.isArray(input)) return input as ApiRecord;
  return {};
}

function valueOf(record: ApiRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function stringValue(record: ApiRecord, ...keys: string[]): string | undefined {
  const value = valueOf(record, ...keys);
  if (value === undefined || value === null) return undefined;
  return String(value).trim() || undefined;
}

function boolValue(record: ApiRecord, ...keys: string[]): boolean | undefined {
  const value = valueOf(record, ...keys);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'disabled'].includes(normalized)) return false;
  }
  return undefined;
}

function stringListValue(record: ApiRecord, ...keys: string[]): string[] | undefined {
  const value = valueOf(record, ...keys);
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === 'string') {
    const items = value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

function normalizeIamUser(input: unknown): IamUser {
  const record = asRecord(input);
  const username = stringValue(record, 'username', 'userName', 'user_name', 'name') || '';
  const id = stringValue(record, 'id', 'userId', 'user_id', 'externalId', 'external_id') || username;
  const externalId = stringValue(record, 'externalId', 'external_id') || id || undefined;
  const displayName = stringValue(record, 'displayName', 'display_name', 'display', 'name') || username || undefined;

  return {
    id,
    externalId,
    provider: stringValue(record, 'provider'),
    orgId: stringValue(record, 'orgId', 'org_id', 'organization', 'owner'),
    username,
    displayName,
    email: stringValue(record, 'email'),
    phone: stringValue(record, 'phone'),
    roles: stringListValue(record, 'roles'),
    groups: stringListValue(record, 'groups'),
    enabled: boolValue(record, 'enabled', 'isEnabled', 'is_enabled'),
  };
}

function normalizeIamUsersReply(input: unknown): { users: IamUser[]; nextPageToken?: string; next_page_token?: string } {
  const record = asRecord(input);
  const rawUsers = valueOf(record, 'users');
  const users = Array.isArray(rawUsers) ? rawUsers.map(normalizeIamUser) : [];
  const nextPageToken = stringValue(record, 'nextPageToken', 'next_page_token');
  return {
    users,
    nextPageToken,
    next_page_token: nextPageToken,
  };
}

/** IAM Auth Service
 *
 * Browser authentication is handled exclusively by Envoy Gateway OIDC.
 * The frontend does not build Casdoor login URLs, exchange authorization codes,
 * refresh access tokens, or persist token sets.
 */
export const iamAuthApi = {
  /** Get current user principal from the IAM backend. */
  getMe: () => iamRequest<IamPrincipal>('/v1/iam/me'),

  /** IAM backend logout endpoint. */
  logoutUrl: () => Promise.resolve('/v1/iam/logout'),
};

/** IAM Directory Service */
export const iamDirectoryApi = {
  getUser: (orgId: string, userId: string) =>
    iamRequest<unknown>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}`).then(normalizeIamUser),

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
    return iamRequest<unknown>(
      `/v1/iam/orgs/${encodeURIComponent(orgId)}/users${q ? `?${q}` : ''}`,
    ).then(normalizeIamUsersReply);
  },

  getOrganization: (orgId: string) =>
    iamRequest<IamOrganization>(`/v1/iam/orgs/${encodeURIComponent(orgId)}`),

  listGroups: (orgId: string, params?: { parentId?: string; type?: string; userId?: string }) => {
    const q = toQuery({
      parent_id: params?.parentId,
      type: params?.type,
      user_id: params?.userId,
    });
    return iamRequest<{ groups: IamGroup[] }>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups${q ? `?${q}` : ''}`);
  },

  createGroup: (orgId: string, group: { parentId?: string; name: string; displayName?: string; type?: string }) =>
    iamRequest<IamGroup>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups`, {
      method: 'POST',
      body: JSON.stringify(group),
    }),

  updateGroup: (orgId: string, groupId: string, group: { parentId?: string; name?: string; displayName?: string; type?: string }) =>
    iamRequest<IamGroup>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups/${encodeURIComponent(groupId)}`, {
      method: 'PATCH',
      body: JSON.stringify(group),
    }),

  deleteGroup: (orgId: string, groupId: string, recursive = false) =>
    iamRequest<{ success: boolean }>(
      `/v1/iam/orgs/${encodeURIComponent(orgId)}/groups/${encodeURIComponent(groupId)}${recursive ? '?recursive=true' : ''}`,
      { method: 'DELETE' },
    ),
};

/** IAM Permission Service */
export const iamPermissionApi = {
  check: (req: IamCheckPermissionRequest) =>
    iamRequest<IamCheckPermissionResponse>('/v1/iam/permissions/check', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  writeRelationship: (relationship: IamRelationship) =>
    iamRequest<{ consistencyToken?: string }>('/v1/iam/relationships', {
      method: 'POST',
      body: JSON.stringify(relationship),
    }),

  deleteRelationship: (relationship: IamRelationship) =>
    iamRequest<{ consistencyToken?: string }>('/v1/iam/relationships/delete', {
      method: 'POST',
      body: JSON.stringify(relationship),
    }),
};

/** IAM AuthZ Admin / Permission Console API */
export const iamAuthzAdminApi = {
  getSchema: () => iamRequest<IamAuthzSchemaReply>('/v1/iam/authz/schema'),

  validateSchema: (text: string) =>
    iamRequest<{ valid: boolean; error?: string }>('/v1/iam/authz/schema:validate', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  publishSchema: (text: string) =>
    iamRequest<{ published: boolean }>('/v1/iam/authz/schema:publish', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  listRelationships: (params?: {
    resourceType?: string;
    resourceId?: string;
    relation?: string;
    subjectType?: string;
    subjectId?: string;
    subjectRelation?: string;
  }) =>
    iamRequest<IamAuthzRelationshipListReply>(
      `/v1/iam/authz/relationships${params ? `?${toQuery({
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        relation: params.relation,
        subject_type: params.subjectType,
        subject_id: params.subjectId,
        subject_relation: params.subjectRelation,
      })}` : ''}`,
    ),

  writeRelationship: (relationship: IamRelationship) =>
    iamRequest<{ written: number; consistencyToken?: string }>('/v1/iam/authz/relationships', {
      method: 'POST',
      body: JSON.stringify({ relationships: [relationship] }),
    }),

  deleteRelationships: (filter: {
    resourceType?: string;
    resourceId?: string;
    relation?: string;
    subjectType?: string;
    subjectId?: string;
    subjectRelation?: string;
  }) =>
    iamRequest<{ deleted: number; consistencyToken?: string }>('/v1/iam/authz/relationships:delete', {
      method: 'POST',
      body: JSON.stringify({ filter: relationshipFilterBody(filter) }),
    }),

  checkPermission: (req: IamCheckPermissionRequest) =>
    iamRequest<IamCheckPermissionResponse>('/v1/iam/authz/permissions:check', {
      method: 'POST',
      body: JSON.stringify(checkPermissionBody(req)),
    }),

  explainPermission: (req: IamCheckPermissionRequest) =>
    iamRequest<IamCheckPermissionResponse>('/v1/iam/authz/permissions:explain', {
      method: 'POST',
      body: JSON.stringify(checkPermissionBody(req)),
    }),

  effectivePermissions: (params: {
    subjectType: string;
    subjectId: string;
    subjectRelation?: string;
    resourceType: string;
    resourceId: string;
    permissions?: string[];
  }) =>
    iamRequest<IamAuthzEffectivePermissionsReply>(
      `/v1/iam/authz/effective-permissions?${toQuery({
        subject_type: params.subjectType,
        subject_id: params.subjectId,
        subject_relation: params.subjectRelation,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        permissions: params.permissions?.join(','),
      })}`,
    ),
};

/** IAM Project Service (Control Plane) */
export const iamProjectApi = {
  createOrganization: (org: { slug: string; displayName?: string; casdoorOrg?: string }) =>
    iamRequest<IamCpOrganization>('/v1/iam/control-plane/orgs', {
      method: 'POST',
      body: JSON.stringify(org),
    }),

  getOrganization: (orgId: string) =>
    iamRequest<IamCpOrganization>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}`),

  listOrganizations: () =>
    iamRequest<{ organizations: IamCpOrganization[] }>('/v1/iam/control-plane/orgs'),

  updateOrganization: (orgId: string, org: Partial<IamCpOrganization>) =>
    iamRequest<IamCpOrganization>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}`, {
      method: 'PATCH',
      body: JSON.stringify(org),
    }),

  archiveOrganization: (orgId: string) =>
    iamRequest<{ success: boolean }>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}/archive`, {
      method: 'POST',
    }),

  createProject: (orgId: string, project: { slug: string; displayName?: string; description?: string }) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/orgs/${encodeURIComponent(orgId)}/projects`, {
      method: 'POST',
      body: JSON.stringify(project),
    }),

  getProject: (projectId: string) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`),

  listProjects: () =>
    iamRequest<{ projects: IamProject[] }>('/v1/iam/control-plane/projects'),

  updateProject: (projectId: string, project: Partial<IamProject>) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify(project),
    }),

  archiveProject: (projectId: string) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/archive`, {
      method: 'POST',
    }),

  listCapabilities: () =>
    iamRequest<{ capabilities: IamCapability[] }>('/v1/iam/control-plane/capabilities'),

  registerCapability: (capability: { name: string; displayName?: string; ownerService?: string }) =>
    iamRequest<IamCapability>('/v1/iam/control-plane/capabilities', {
      method: 'POST',
      body: JSON.stringify({ capability }),
    }),

  listProjectCapabilities: (projectId: string) =>
    iamRequest<{ capabilities: IamProjectCapability[] }>(
      `/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/capabilities`,
    ),

  enableProjectCapability: (projectId: string, capabilityId: string) =>
    iamRequest<IamProjectCapability>(
      `/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/capabilities/${encodeURIComponent(capabilityId)}:enable`,
      { method: 'POST' },
    ),

  disableProjectCapability: (projectId: string, capabilityId: string) =>
    iamRequest<IamProjectCapability>(
      `/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/capabilities/${encodeURIComponent(capabilityId)}:disable`,
      { method: 'POST' },
    ),
};

/** IAM Resource Service */
export const iamResourceService = {
  registerResourceType: (rt: { type: string; displayName?: string; description?: string }) =>
    iamRequest<IamResourceType>('/v1/iam/control-plane/resource-types', {
      method: 'POST',
      body: JSON.stringify({ resourceType: rt }),
    }),

  getResourceType: (type: string) =>
    iamRequest<IamResourceType>(`/v1/iam/control-plane/resource-types/${encodeURIComponent(type)}`),

  listResourceTypes: () =>
    iamRequest<{ resourceTypes: IamResourceType[] }>('/v1/iam/control-plane/resource-types'),

  listResources: (params?: { type?: string; orgId?: string; projectId?: string }) =>
    iamRequest<{ resources: IamResource[] }>(
      `/v1/iam/control-plane/resources${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    ),

  getResource: (resourceType: string, resourceId: string) =>
    iamRequest<IamResource>(
      `/v1/iam/control-plane/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`,
    ),

  listResourceBindings: (params?: { resourceType?: string; resourceId?: string }) =>
    iamRequest<{ bindings: IamResourceBinding[] }>(
      `/v1/iam/control-plane/resource-bindings${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    ),
};

/** IAM Grant Service */
export const iamGrantService = {
  registerRoleTemplate: (rt: { resourceType?: string; roleKey: string; displayName?: string; description?: string }) =>
    iamRequest<IamRoleTemplate>('/v1/iam/control-plane/role-templates', {
      method: 'POST',
      body: JSON.stringify({ roleTemplate: rt }),
    }),

  listRoleTemplates: () =>
    iamRequest<{ roleTemplates: IamRoleTemplate[] }>('/v1/iam/control-plane/role-templates'),

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

  revokeAccess: (grantId: string) =>
    iamRequest<{ grantId: string; revoked: boolean; consistencyToken?: string }>(
      `/v1/iam/control-plane/grants/${encodeURIComponent(grantId)}/revoke`,
      { method: 'POST' },
    ),

  listGrants: (params?: { resourceType?: string; resourceId?: string; subjectType?: string; subjectId?: string }) =>
    iamRequest<{ grants: IamGrant[] }>(
      `/v1/iam/control-plane/grants${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    ),

  explainAccess: (params: { resource: { type: string; id: string }; permission: string; subject: { type: string; id: string } }) =>
    iamRequest<{ allowed: boolean; steps: unknown[] }>('/v1/iam/control-plane/access:explain', {
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

import { request, toQuery } from './client';
import type {
  IamPrincipal,
  IamUser,
  IamOrganization,
  IamGroup,
  IamProject,
  IamCapability,
  IamProjectCapability,
  IamResourceType,
  IamResource,
  IamResourceBinding,
  IamRoleTemplate,
  IamRoleImpact,
  IamGrant,
  IamCheckPermissionRequest,
  IamCheckPermissionResponse,
  IamAuthzSchemaReply,
  IamAuthzRelationshipListReply,
  IamAuthzEffectivePermissionsReply,
} from './types';

// ─── IAM Service API (aisphere-iam /v1/iam/*) ──────────────────────────

function iamRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
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

function numberValue(record: ApiRecord, ...keys: string[]): number | undefined {
  const value = valueOf(record, ...keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
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
    const items = value.split(/[\s,;]+/).map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

/**
 * Normalize a proto timestamp value to an ISO date string.
 * Handles: {seconds, nanos} object (protojson), ISO string, epoch seconds/ms.
 */
function timestampValue(record: ApiRecord, ...keys: string[]): string | undefined {
  const value = valueOf(record, ...keys);
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === 'number') {
    // Treat large numbers as milliseconds, small as seconds.
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === 'object') {
    const obj = value as { seconds?: number; nanos?: number };
    if (typeof obj.seconds === 'number') {
      const d = new Date(obj.seconds * 1000 + (obj.nanos ?? 0) / 1e6);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
  }
  return undefined;
}

function stringMapValue(record: ApiRecord, ...keys: string[]): Record<string, string> | undefined {
  const value = valueOf(record, ...keys);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

function recordValue(record: ApiRecord, ...keys: string[]): Record<string, unknown> | undefined {
  const value = valueOf(record, ...keys);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizeIamResourceType(input: unknown): IamResourceType {
  const record = asRecord(input);
  return {
    type: stringValue(record, 'type') || '',
    capabilityId: stringValue(record, 'capabilityId', 'capability_id'),
    ownerService: stringValue(record, 'ownerService', 'owner_service'),
    displayName: stringValue(record, 'displayName', 'display_name'),
    description: stringValue(record, 'description'),
    parentTypes: stringListValue(record, 'parentTypes', 'parent_types'),
    grantable: boolValue(record, 'grantable'),
    auditable: boolValue(record, 'auditable'),
    spicedbType: stringValue(record, 'spicedbType', 'spicedb_type'),
    relations: stringListValue(record, 'relations'),
    permissions: stringListValue(record, 'permissions'),
    labels: stringMapValue(record, 'labels'),
    metadata: stringMapValue(record, 'metadata'),
    status: stringValue(record, 'status'),
    createdAt: timestampValue(record, 'createdAt', 'created_at'),
    updatedAt: timestampValue(record, 'updatedAt', 'updated_at'),
  };
}

function normalizeIamRoleTemplate(input: unknown): IamRoleTemplate {
  const record = asRecord(input);
  return {
    id: stringValue(record, 'id') || '',
    resourceType: stringValue(record, 'resourceType', 'resource_type'),
    roleKey: stringValue(record, 'roleKey', 'role_key') || '',
    displayName: stringValue(record, 'displayName', 'display_name'),
    description: stringValue(record, 'description'),
    relation: stringValue(record, 'relation'),
    builtIn: boolValue(record, 'builtIn', 'built_in'),
    enabled: boolValue(record, 'enabled'),
    sortOrder: numberValue(record, 'sortOrder', 'sort_order'),
    permissions: stringListValue(record, 'permissions') || [],
    activeGrantCount: numberValue(record, 'activeGrantCount', 'active_grant_count'),
    version: numberValue(record, 'version'),
    metadata: recordValue(record, 'metadata'),
    createdAt: timestampValue(record, 'createdAt', 'created_at'),
    updatedAt: timestampValue(record, 'updatedAt', 'updated_at'),
  };
}

function normalizeIamResourceTypesReply(input: unknown): { resourceTypes: IamResourceType[] } {
  const record = asRecord(input);
  const resourceTypes = valueOf(record, 'resourceTypes', 'resource_types');
  return { resourceTypes: Array.isArray(resourceTypes) ? resourceTypes.map(normalizeIamResourceType) : [] };
}

function normalizeIamRoleTemplatesReply(input: unknown): { roleTemplates: IamRoleTemplate[] } {
  const record = asRecord(input);
  const roleTemplates = valueOf(record, 'roleTemplates', 'role_templates');
  return { roleTemplates: Array.isArray(roleTemplates) ? roleTemplates.map(normalizeIamRoleTemplate) : [] };
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

/**
 * Normalize a single IAM Group object into the frontend IamGroup shape.
 *
 * The backend (aisphere-iam) returns groups from the Casdoor identity backend
 * via a proto-generated JSON encoder. Depending on the gateway / proto JSON
 * options, the same field can arrive as `parentId`, `parent_id`, or nested
 * under a parent object. We accept all known shapes and additionally derive
 * a parent from the `path` field as a fallback so the organization tree
 * renders with the correct hierarchy even when the backend omits parentId.
 */
function normalizeIamGroup(input: unknown): IamGroup {
  const record = asRecord(input);
  const id = stringValue(record, 'id', 'groupId', 'group_id', 'externalId', 'external_id', 'name') || '';
  const externalId = stringValue(record, 'externalId', 'external_id') || id || undefined;
  const orgId = stringValue(record, 'orgId', 'org_id', 'organization', 'owner');
  const name = stringValue(record, 'name', 'groupName', 'group_name', 'displayName', 'display_name') || id;
  const displayName = stringValue(record, 'displayName', 'display_name', 'title') || name || undefined;
  const type = stringValue(record, 'type', 'groupType', 'group_type') || undefined;
  const path = stringValue(record, 'path', 'groupPath', 'group_path', 'fullPath', 'full_path') || undefined;
  // parentId may be present under multiple keys depending on JSON encoder
  const parentId = stringValue(record, 'parentId', 'parent_id', 'parent', 'parentNode', 'parent_node', 'parentId');
  // Derive parentId from path if missing. Casdoor typically encodes group
  // hierarchy as a slash-separated path like "/org/parent/child". We strip
  // the leading org segment and use the last segment as the child name and
  // the previous segment as the parent name. We then look up the parent by
  // name in the caller (see normalizeIamGroupsReply) to resolve to its ID.
  if (!parentId && path) {
    const segments = path.split('/').map((s) => s.trim()).filter(Boolean);
    // path like ["aisphere", "地球联盟", "美利坚", "华盛顿"]
    if (segments.length >= 2) {
      // Defer the actual ID resolution to the list-level normalizer via a
      // __parentName hint field. The list normalizer will translate it to an
      // actual parent ID once all groups have been processed.
      (record as ApiRecord).__parentName = segments[segments.length - 2];
    }
  }
  const rawUsers = valueOf(record, 'users', 'userIds', 'user_ids', 'members');
  const users = Array.isArray(rawUsers)
    ? rawUsers.map((u) => (typeof u === 'string' ? u : stringValue(asRecord(u), 'id', 'userId', 'user_id', 'username') || '')).filter(Boolean)
    : [];
  return {
    id,
    externalId,
    orgId,
    parentId: parentId || undefined,
    name,
    displayName,
    type,
    path,
    users,
  };
}

/**
 * Normalize the list-groups API response. This performs a second pass to
 * resolve path-derived parent hints to actual parent IDs, ensuring the
 * hierarchy is preserved even when the backend omits parentId.
 */
function normalizeIamGroupsReply(input: unknown): { groups: IamGroup[] } {
  const record = asRecord(input);
  // The response might be { groups: [...] } or just an array
  const rawGroups = valueOf(record, 'groups');
  const groupArray = Array.isArray(rawGroups) ? rawGroups : (Array.isArray(input) ? input : []);
  const groups = groupArray.map(normalizeIamGroup);

  // Build a name -> id map so we can resolve path-derived parent hints
  const nameToId = new Map<string, string>();
  for (const g of groups) {
    if (g.name) nameToId.set(g.name, g.id);
    if (g.displayName && !nameToId.has(g.displayName)) nameToId.set(g.displayName, g.id);
  }

  // Resolve __parentName hints if parentId is still empty
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.parentId) continue;
    const raw = groupArray[i];
    const rawRecord = asRecord(raw);
    const parentName = stringValue(rawRecord, '__parentName');
    if (parentName && nameToId.has(parentName)) {
      const resolved = nameToId.get(parentName);
      if (resolved && resolved !== g.id) {
        groups[i] = { ...g, parentId: resolved };
      }
    }
  }

  return { groups };
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
type IamGroupWrite = { parentId?: string; name?: string; displayName?: string; type?: string };

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
    return iamRequest<unknown>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups${q ? `?${q}` : ''}`)
      .then(normalizeIamGroupsReply);
  },

  createGroup: (orgId: string, group: IamGroupWrite & { name: string }) =>
    iamRequest<unknown>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups`, {
      method: 'POST',
      body: JSON.stringify({
        name: group.name,
        displayName: group.displayName,
        parentId: group.parentId,
        type: group.type,
      }),
    }).then(normalizeIamGroup),

  updateGroup: (orgId: string, groupId: string, group: IamGroupWrite) =>
    iamRequest<unknown>(`/v1/iam/orgs/${encodeURIComponent(orgId)}/groups/${encodeURIComponent(groupId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: group.name,
        displayName: group.displayName,
        parentId: group.parentId,
        type: group.type,
      }),
    }).then(normalizeIamGroup),

  deleteGroup: (orgId: string, groupId: string, recursive = false) =>
    iamRequest<{ success: boolean }>(
      `/v1/iam/orgs/${encodeURIComponent(orgId)}/groups/${encodeURIComponent(groupId)}${recursive ? '?recursive=true' : ''}`,
      { method: 'DELETE' },
    ),

  assignUserToGroup: (orgId: string, groupId: string, userId: string) =>
    iamRequest<Record<string, never>>(
      '/v1/iam/directory/group-memberships:assign',
      { method: 'POST', body: JSON.stringify({ org_id: orgId, group_id: groupId, user_id: userId }) },
    ),

  removeUserFromGroup: (orgId: string, groupId: string, userId: string) =>
    iamRequest<Record<string, never>>(
      '/v1/iam/directory/group-memberships:remove',
      { method: 'POST', body: JSON.stringify({ org_id: orgId, group_id: groupId, user_id: userId }) },
    ),
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

// LifecycleStatus enum (proto3): ACTIVE=1, ARCHIVED=2, DELETED=3, DISABLED=4.
const PROJECT_STATUS_MAP: Record<number, string> = { 1: 'ACTIVE', 2: 'ARCHIVED', 3: 'DELETED', 4: 'DISABLED' };
// ProjectVisibility enum (proto3): PRIVATE=1, ORG=2, PUBLIC=3.
const PROJECT_VISIBILITY_MAP: Record<number, string> = { 1: 'PRIVATE', 2: 'ORG', 3: 'PUBLIC' };
// Reverse map for sending visibility back to the backend as a number.
const VISIBILITY_TO_PROTO: Record<string, number> = { PRIVATE: 1, ORG: 2, PUBLIC: 3, INTERNAL: 2 };

function normalizeIamProject(input: unknown): IamProject {
  const record = asRecord(input);
  const rawStatus = valueOf(record, 'status');
  const rawVisibility = valueOf(record, 'visibility');
  const status = typeof rawStatus === 'number' ? (PROJECT_STATUS_MAP[rawStatus] || String(rawStatus))
    : typeof rawStatus === 'string' ? rawStatus.toUpperCase() : undefined;
  const visibility = typeof rawVisibility === 'number' ? (PROJECT_VISIBILITY_MAP[rawVisibility] || String(rawVisibility))
    : typeof rawVisibility === 'string' ? rawVisibility.toUpperCase() : undefined;
  return {
    id: stringValue(record, 'id', 'projectId', 'project_id') || '',
    orgId: stringValue(record, 'orgId', 'org_id', 'owner') || '',
    slug: stringValue(record, 'slug') || '',
    displayName: stringValue(record, 'displayName', 'display_name'),
    description: stringValue(record, 'description'),
    status,
    visibility,
    labels: record['labels'] as Record<string, string> | undefined,
    annotations: record['annotations'] as Record<string, string> | undefined,
    metadata: record['metadata'] as Record<string, string> | undefined,
    createdBy: stringValue(record, 'createdBy', 'created_by'),
    owners: stringListValue(record, 'owners'),
    joined: boolValue(record, 'joined'),
    canManage: boolValue(record, 'canManage', 'can_manage'),
    stats: (valueOf(record, 'stats') as IamProject['stats']) || undefined,
    createdAt: timestampValue(record, 'createdAt', 'created_at'),
    updatedAt: timestampValue(record, 'updatedAt', 'updated_at'),
  };
}

export const iamProjectApi = {
  createProject: (project: { slug: string; displayName?: string; description?: string }) =>
    iamRequest<IamProject>('/v1/iam/control-plane/projects', {
      method: 'POST',
      body: JSON.stringify({
        slug: project.slug,
        display_name: project.displayName,
        description: project.description,
      }),
    }).then(normalizeIamProject),

  getProject: (projectId: string) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`).then(normalizeIamProject),

  listProjects: () =>
    iamRequest<{ projects: IamProject[] }>('/v1/iam/control-plane/projects').then((data) => ({
      projects: ((data as { projects?: unknown[] }).projects || []).map(normalizeIamProject),
    })),

  updateProject: (projectId: string, project: Partial<IamProject>) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: project.displayName,
        description: project.description,
        visibility: project.visibility
          ? VISIBILITY_TO_PROTO[project.visibility.toUpperCase()] ?? undefined
          : undefined,
      }),
    }).then(normalizeIamProject),

  archiveProject: (projectId: string) =>
    iamRequest<IamProject>(`/v1/iam/control-plane/projects/${encodeURIComponent(projectId)}/archive`, {
      method: 'POST',
      body: JSON.stringify({}),
    }).then(normalizeIamProject),

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

  listResourceTypes: async () =>
    normalizeIamResourceTypesReply(await iamRequest<unknown>('/v1/iam/control-plane/resource-types')),

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
  registerRoleTemplate: (rt: { resourceType: string; roleKey: string; displayName?: string; description?: string; permissions?: string[] }) =>
    iamRequest<IamRoleTemplate>('/v1/iam/control-plane/role-templates', {
      method: 'POST',
      body: JSON.stringify({ roleTemplate: { ...rt, permissions: rt.permissions || [] } }),
    }),

  updateRoleTemplate: (input: { id: string; displayName?: string; description?: string; permissions: string[]; expectedVersion: number }) =>
    iamRequest<IamRoleTemplate>(`/v1/iam/control-plane/role-templates/${encodeURIComponent(input.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  disableRoleTemplate: (input: { id: string; expectedVersion: number; confirmActiveGrants: boolean }) =>
    iamRequest<IamRoleTemplate>(`/v1/iam/control-plane/role-templates/${encodeURIComponent(input.id)}:disable`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  previewRoleTemplateImpact: (input: { id: string; permissions: string[] }) =>
    iamRequest<IamRoleImpact>(`/v1/iam/control-plane/role-templates/${encodeURIComponent(input.id)}:preview-impact`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listRoleTemplates: async (params?: { resourceType?: string; roleKey?: string; enabled?: boolean }) =>
    normalizeIamRoleTemplatesReply(await iamRequest<unknown>(
      `/v1/iam/control-plane/role-templates${params ? `?${toQuery(params as Record<string, unknown>)}` : ''}`,
    )),

  grantAccess: (grant: {
    resource?: { type: string; id: string };
    roleKey?: string;
    subject?: { type: string; id: string; relation?: string };
    source?: string;
    reason?: string;
    expiresAt?: string;
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

// ─── IAM Service Types (aisphere-iam /v1/iam/*) ────────────────────────

/** IAM Principal (authenticated identity) */
export interface IamPrincipal {
  subjectId: string;
  subjectType: string;
  provider?: string;
  externalId?: string;
  issuer?: string;
  audience?: string[];
  tenantId?: string;
  orgId?: string;
  appId?: string;
  projectId?: string;
  username?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  groups?: string[];
  scopes?: string[];
  authMethod?: string;
  issuedAt?: string;
  expiresAt?: string;
  avatar?: string;
  picture?: string;
  [key: string]: unknown;
}

/** IAM Directory User */
export interface IamUser {
  id: string;
  externalId?: string;
  provider?: string;
  orgId?: string;
  username: string;
  displayName?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  groups?: string[];
  enabled?: boolean;
}

/** IAM Directory Organization. In the frontend this is displayed as a read-only availability zone. */
export interface IamOrganization {
  id: string;
  externalId?: string;
  name: string;
  displayName?: string;
  ownerId?: string;
  parentId?: string;
  tags?: string[];
  enabled?: boolean;
}

/** IAM Directory Group */
export interface IamGroup {
  id: string;
  externalId?: string;
  orgId?: string;
  parentId?: string;
  name: string;
  displayName?: string;
  type?: string;
  path?: string;
  users?: string[];
}

/** IAM Control Plane Organization */
export interface IamCpOrganization {
  id: string;
  slug: string;
  displayName?: string;
  status?: string;
  casdoorOrg?: string;
  plan?: string;
  region?: string;
  metadata?: Record<string, string>;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** IAM Control Plane Project */
export interface IamProject {
  id: string;
  orgId: string;
  slug: string;
  displayName?: string;
  description?: string;
  status?: string;
  visibility?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  metadata?: Record<string, string>;
  createdBy?: string;
  owners?: string[];
  joined?: boolean;
  canManage?: boolean;
  stats?: {
    countMembers?: number;
    countResources?: number;
    countSkills?: number;
    countRepositories?: number;
    countAgents?: number;
    countSandboxes?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

/** IAM Capability */
export interface IamCapability {
  id: string;
  name: string;
  displayName?: string;
  ownerService?: string;
  status?: string;
  configSchema?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** IAM Project Capability */
export interface IamProjectCapability {
  projectId: string;
  capabilityId: string;
  enabled: boolean;
  config?: string;
  quota?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** IAM Resource Type */
export interface IamResourceType {
  type: string;
  capabilityId?: string;
  ownerService?: string;
  displayName?: string;
  description?: string;
  parentTypes?: string[];
  grantable?: boolean;
  auditable?: boolean;
  spicedbType?: string;
  relations?: string[];
  permissions?: string[];
  labels?: Record<string, string>;
  metadata?: Record<string, string>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** IAM Resource Ref */
export interface IamResourceRef {
  type: string;
  id: string;
}

/** IAM Resource */
export interface IamResource {
  ref: IamResourceRef;
  orgId?: string;
  projectId?: string;
  parent?: IamResourceRef;
  ownerService?: string;
  ownerResourceId?: string;
  slug?: string;
  displayName?: string;
  path?: string;
  status?: string;
  visibility?: string;
  grantable?: boolean;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  metadata?: Record<string, string>;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** IAM Resource Binding */
export interface IamResourceBinding {
  id: string;
  resource?: IamResourceRef;
  ownerService?: string;
  ownerResourceId?: string;
  status?: string;
  createdAt?: string;
}

/** IAM Role Template */
export interface IamRoleTemplate {
  id: string;
  resourceType?: string;
  roleKey: string;
  displayName?: string;
  description?: string;
  relation?: string;
  builtIn?: boolean;
  enabled?: boolean;
  sortOrder?: number;
  permissions?: string[];
  activeGrantCount?: number;
  version?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface IamRoleImpact {
  activeGrantCount: number;
  addedPermissions: string[];
  removedPermissions: string[];
}

/** IAM Grant */
export interface IamGrant {
  id: string;
  resource?: IamResourceRef;
  relation?: string;
  roleKey?: string;
  subject?: { type: string; id: string; relation?: string };
  source?: string;
  reason?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  revokedAt?: string;
  consistencyToken?: string;
  metadata?: Record<string, string>;
}

/** IAM Subject Ref */
export interface IamSubjectRef {
  type: string;
  id: string;
  relation?: string;
}

/** IAM Relationship */
export interface IamRelationship {
  resource: IamResourceRef;
  relation: string;
  subject: IamSubjectRef;
}

/** IAM Permission Check Request */
export interface IamCheckPermissionRequest {
  subject: IamSubjectRef;
  resource: IamResourceRef;
  permission: string;
  orgId?: string;
  projectId?: string;
}

/** IAM Permission Check Response */
export interface IamCheckPermissionResponse {
  allowed: boolean;
  effect?: string;
  reason?: string;
  consistencyToken?: string;
  steps?: string[];
}

export interface IamAuthzSchemaReply {
  text: string;
  version?: string;
}

export interface IamAuthzRelationshipListReply {
  relationships: IamRelationship[];
}

export interface IamAuthzEffectivePermissionsReply {
  subject: IamSubjectRef;
  resource: IamResourceRef;
  permissions: Record<string, { allowed: boolean; effect?: string; reason?: string }>;
}

export type LocalUser = {
  username: string;
  subjectId?: string;
  subjectType?: string;
  displayName?: string;
  email?: string;
  organization?: string;
  roles?: string[];
  permissions?: string[];
  disabled?: boolean;
};

export type Tab = 'users' | 'groups' | 'projects' | 'grants' | 'resources' | 'permissions' | 'capabilities' | 'permissions-center' | 'roles' | 'permission-diagnosis' | 'resource-permissions' | 'user-permissions' | 'platform-governance';

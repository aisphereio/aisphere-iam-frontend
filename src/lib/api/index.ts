/**
 * IAM API — Unified entry point.
 *
 * All IAM backend calls go through generated SDK → Adapter → re-export.
 * Pages and hooks import from here, never from `generated/` directly.
 *
 * Architecture:
 *   components / hooks
 *        ↓
 *   API Adapter (stable business interface, this file)
 *        ↓
 *   generated SDK (fully auto-generated from OpenAPI)
 *        ↓
 *   iamFetch (unified Cookie, error, Envoy same-origin access)
 */

export { iamAuthApi } from './adapters/auth';
export { iamDirectoryApi } from './adapters/directory';
export { iamPermissionApi } from './adapters/permission';
export { iamAuthzAdminApi } from './adapters/authorization-admin';
export { iamProjectApi } from './adapters/project';
export { iamResourceService } from './adapters/resource';
export { iamGrantService } from './adapters/grant';
export { iamAccessQueryApi } from './adapters/access-query';
export { iamIdentityAdminApi } from './adapters/identity-admin';

// Re-export client utilities still needed by other modules
export { buildGatewayLoginUrl, buildGatewayLogoutUrl, toQuery } from './client';

// Re-export types
export type {
  IamPrincipal,
  IamUser,
  IamOrganization,
  IamGroup,
  IamProject,
  IamCapability,
  IamProjectCapability,
  IamResourceType,
  IamResourceRef,
  IamResource,
  IamResourceBinding,
  IamRoleTemplate,
  IamRoleImpact,
  IamGrant,
  IamSubjectRef,
  IamRelationship,
  IamCheckPermissionRequest,
  IamCheckPermissionResponse,
  IamAuthzSchemaReply,
  IamAuthzRelationshipListReply,
  IamAuthzEffectivePermissionsReply,
  IamListSubjectEntitlementsReply,
  IamListResourceAccessReply,
  IamPreviewGrantReply,
  IamEntitlement,
  IamEntitlementSourceType,
  Tab,
} from './types';
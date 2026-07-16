import {
  iAMAuthorizationAdminServiceCheckAuthorization,
  iAMAuthorizationAdminServiceExplainAuthorization,
  iAMAuthorizationAdminServiceGetAuthorizationSchema,
  iAMAuthorizationAdminServiceGetEffectivePermissions,
  iAMAuthorizationAdminServiceListRelationships,
  iAMAuthorizationAdminServicePublishAuthorizationSchema,
  iAMAuthorizationAdminServiceValidateAuthorizationSchema,
} from '../generated/iamauthorization-admin-service/iamauthorization-admin-service';
import {
  iAMPermissionServiceDeleteRelationships,
} from '../generated/iampermission-service/iampermission-service';
import { iamFetch } from '../iam-fetch';
import type {
  IamAuthzEffectivePermissionsReply,
  IamAuthzRelationshipListReply,
  IamAuthzSchemaReply,
  IamCheckPermissionRequest,
  IamCheckPermissionResponse,
  IamRelationship,
} from '../types';

/** IAM AuthZ Admin / Permission Console API */
export const iamAuthzAdminApi = {
  getSchema: (): Promise<IamAuthzSchemaReply> =>
    iAMAuthorizationAdminServiceGetAuthorizationSchema().then((reply) => ({
      text: reply.text || '',
      version: reply.version,
    })),

  validateSchema: (text: string): Promise<{ valid: boolean; error?: string }> =>
    iAMAuthorizationAdminServiceValidateAuthorizationSchema({ text }).then((reply) => ({
      valid: reply.valid || false,
      error: reply.error,
    })),

  publishSchema: (text: string): Promise<{ published: boolean }> =>
    iAMAuthorizationAdminServicePublishAuthorizationSchema({ text }).then((reply) => ({
      published: reply.published || false,
    })),

  listRelationships: (params?: {
    resourceType?: string;
    resourceId?: string;
    relation?: string;
    subjectType?: string;
    subjectId?: string;
    subjectRelation?: string;
  }): Promise<IamAuthzRelationshipListReply> =>
    iAMAuthorizationAdminServiceListRelationships({
      resourceType: params?.resourceType,
      resourceId: params?.resourceId,
      relation: params?.relation,
      subjectType: params?.subjectType,
      subjectId: params?.subjectId,
      subjectRelation: params?.subjectRelation,
    }).then((reply) => ({
      relationships: (reply.relationships || []).map((r) => ({
        resource: { type: r.resource?.type || '', id: r.resource?.id || '' },
        relation: r.relation || '',
        subject: { type: r.subject?.type || '', id: r.subject?.id || '', relation: r.subject?.relation },
      })),
    })),

  writeRelationship: (relationship: IamRelationship): Promise<{ written: number; consistencyToken?: string }> => {
    const body = {
      relationships: [{
        resource: { type: relationship.resource.type, id: relationship.resource.id },
        relation: relationship.relation,
        subject: { type: relationship.subject.type, id: relationship.subject.id, relation: relationship.subject.relation },
      }],
    };
    return iamFetch<{ written: number; consistencyToken?: string }>('/v1/iam/authz/relationships', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteRelationships: (filter: {
    resourceType?: string;
    resourceId?: string;
    relation?: string;
    subjectType?: string;
    subjectId?: string;
    subjectRelation?: string;
  }): Promise<{ deleted: number; consistencyToken?: string }> =>
    iAMPermissionServiceDeleteRelationships({
      filter: {
        resourceType: filter.resourceType,
        resourceId: filter.resourceId,
        relation: filter.relation,
        subjectType: filter.subjectType,
        subjectId: filter.subjectId,
        subjectRelation: filter.subjectRelation,
      },
    }).then((reply) => ({
      deleted: reply.deleted || 0,
      consistencyToken: reply.consistencyToken,
    })),

  checkPermission: (req: IamCheckPermissionRequest): Promise<IamCheckPermissionResponse> =>
    iAMAuthorizationAdminServiceCheckAuthorization({
      subject: { type: req.subject.type, id: req.subject.id, relation: req.subject.relation },
      resource: { type: req.resource.type, id: req.resource.id },
      permission: req.permission,
      orgId: req.orgId,
      projectId: req.projectId,
    }).then((reply) => ({
      allowed: reply.allowed || false,
      effect: reply.effect,
      reason: reply.reason,
      consistencyToken: reply.consistencyToken,
    })),

  explainPermission: (req: IamCheckPermissionRequest): Promise<IamCheckPermissionResponse> =>
    iAMAuthorizationAdminServiceExplainAuthorization({
      subject: { type: req.subject.type, id: req.subject.id, relation: req.subject.relation },
      resource: { type: req.resource.type, id: req.resource.id },
      permission: req.permission,
      orgId: req.orgId,
      projectId: req.projectId,
    }).then((reply) => ({
      allowed: reply.allowed || false,
      effect: reply.effect,
      reason: reply.reason,
      consistencyToken: reply.consistencyToken,
      steps: reply.steps,
    })),

  effectivePermissions: (params: {
    subjectType: string;
    subjectId: string;
    subjectRelation?: string;
    resourceType: string;
    resourceId: string;
    permissions?: string[];
  }): Promise<IamAuthzEffectivePermissionsReply> => {
    return iAMAuthorizationAdminServiceGetEffectivePermissions({
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      subjectRelation: params.subjectRelation,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      permissions: params.permissions,
    }).then((reply) => {
      const perms: Record<string, { allowed: boolean; effect?: string; reason?: string }> = {};
      if (reply.permissions) {
        for (const [key, value] of Object.entries(reply.permissions)) {
          perms[key] = {
            allowed: value.allowed || false,
            effect: value.effect,
            reason: value.reason,
          };
        }
      }
      return {
        subject: { type: reply.subject?.type || '', id: reply.subject?.id || '', relation: reply.subject?.relation },
        resource: { type: reply.resource?.type || '', id: reply.resource?.id || '' },
        permissions: perms,
      };
    });
  },
};
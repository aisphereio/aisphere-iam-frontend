import {
  grantServiceDisableRoleTemplate,
  grantServiceExplainAccess,
  grantServiceGrantAccess,
  grantServiceListGrants,
  grantServiceListRoleTemplates,
  grantServicePreviewRoleTemplateImpact,
  grantServiceRegisterRoleTemplate,
  grantServiceRevokeAccess,
  grantServiceUpdateRoleTemplate,
} from '../generated/grant-service/grant-service';
import { normalizeIamRoleTemplate, normalizeIamRoleTemplatesReply } from '../mappers/authorization';
import type { IamGrant, IamRoleImpact, IamRoleTemplate } from '../types';

/** IAM Grant Service */
export const iamGrantService = {
  registerRoleTemplate: (rt: { resourceType: string; roleKey: string; displayName?: string; description?: string; permissions?: string[] }): Promise<IamRoleTemplate> =>
    grantServiceRegisterRoleTemplate({
      roleTemplate: {
        resourceType: rt.resourceType,
        roleKey: rt.roleKey,
        displayName: rt.displayName,
        description: rt.description,
        permissions: rt.permissions || [],
      },
    }).then((r) => normalizeIamRoleTemplate(r as unknown as Record<string, unknown>)),

  updateRoleTemplate: (input: { id: string; displayName?: string; description?: string; permissions: string[]; expectedVersion: number }): Promise<IamRoleTemplate> =>
    grantServiceUpdateRoleTemplate(input.id, {
      displayName: input.displayName,
      description: input.description,
      permissions: input.permissions,
      expectedVersion: String(input.expectedVersion),
    }).then((r) => normalizeIamRoleTemplate(r as unknown as Record<string, unknown>)),

  disableRoleTemplate: (input: { id: string; expectedVersion: number; confirmActiveGrants: boolean }): Promise<IamRoleTemplate> =>
    grantServiceDisableRoleTemplate(input.id, {
      expectedVersion: String(input.expectedVersion),
      confirmActiveGrants: input.confirmActiveGrants,
    }).then((r) => normalizeIamRoleTemplate(r as unknown as Record<string, unknown>)),

  previewRoleTemplateImpact: (input: { id: string; permissions: string[] }): Promise<IamRoleImpact> =>
    grantServicePreviewRoleTemplateImpact(input.id, {
      permissions: input.permissions,
    }).then((reply) => ({
      activeGrantCount: Number(reply.activeGrantCount) || 0,
      addedPermissions: reply.addedPermissions || [],
      removedPermissions: reply.removedPermissions || [],
    })),

  listRoleTemplates: (): Promise<{ roleTemplates: IamRoleTemplate[] }> =>
    grantServiceListRoleTemplates().then((reply) => normalizeIamRoleTemplatesReply(reply as unknown as Record<string, unknown>)),

  grantAccess: (orgId: string, grant: {
    resource?: { type: string; id: string };
    role_key?: string;
    subject?: { type: string; id: string; relation?: string };
    source?: string;
    reason?: string;
    expires_at?: string;
  }): Promise<IamGrant> =>
    grantServiceGrantAccess(orgId, grant as never) as Promise<IamGrant>,

  revokeAccess: (orgId: string, grantId: string): Promise<{ grantId: string; revoked: boolean; consistencyToken?: string }> =>
    grantServiceRevokeAccess(orgId, grantId, {}).then((reply) => ({
      grantId,
      revoked: true,
      consistencyToken: reply.consistencyToken,
    })),

  listGrants: (orgId: string, params?: { resourceType?: string; resourceId?: string; subjectType?: string; subjectId?: string }): Promise<{ grants: IamGrant[] }> =>
    grantServiceListGrants(orgId, params as never) as Promise<{ grants: IamGrant[] }>,

  explainAccess: (orgId: string, params: { resource: { type: string; id: string }; permission: string; subject: { type: string; id: string } }): Promise<{ allowed: boolean; steps: unknown[] }> =>
    grantServiceExplainAccess(orgId, {
      resource: params.resource,
      permission: params.permission,
      subject: params.subject,
    }).then((reply) => ({
      allowed: reply.allowed || false,
      steps: reply.steps || [],
    })),
};
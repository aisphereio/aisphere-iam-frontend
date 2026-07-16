import {
  accessQueryServiceListResourceAccess,
  accessQueryServiceListSubjectEntitlements,
  accessQueryServicePreviewGrant,
} from '../generated/access-query-service/access-query-service';
import type {
  IamListResourceAccessReply,
  IamListSubjectEntitlementsReply,
  IamPreviewGrantReply,
} from '../types';

// ─── AccessQuery API ────────────────────────────────────────────────────

export const iamAccessQueryApi = {
  /** List all effective permissions for a subject */
  listSubjectEntitlements: (orgId: string, params: {
    subject: { type: string; id: string };
    resourceType?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<IamListSubjectEntitlementsReply> =>
    accessQueryServiceListSubjectEntitlements(orgId, {
      subject: params.subject,
      resourceType: params.resourceType,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
    }) as Promise<IamListSubjectEntitlementsReply>,

  /** List all subjects with effective access to a resource */
  listResourceAccess: (orgId: string, params: {
    resource: { type: string; id: string };
    subjectType?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<IamListResourceAccessReply> =>
    accessQueryServiceListResourceAccess(orgId, {
      resource: params.resource,
      subjectType: params.subjectType,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
    }) as Promise<IamListResourceAccessReply>,

  /** Preview what permissions a subject would receive */
  previewGrant: (orgId: string, params: {
    resource: { type: string; id: string };
    roleKey: string;
    subject: { type: string; id: string };
  }): Promise<IamPreviewGrantReply> =>
    accessQueryServicePreviewGrant(orgId, {
      resource: params.resource,
      roleKey: params.roleKey,
      subject: params.subject,
    }) as Promise<IamPreviewGrantReply>,
};
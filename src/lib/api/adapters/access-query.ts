import {
  accessQueryServiceListResourceAccess,
  accessQueryServiceListSubjectEntitlements,
  accessQueryServicePreviewGrant,
} from '../generated/access-query-service/access-query-service';
import type {
  IamEntitlement,
  IamListResourceAccessReply,
  IamListSubjectEntitlementsReply,
  IamPreviewGrantReply,
} from '../types';

/**
 * Normalize a single entitlement from snake_case (backend protobuf JSON)
 * to camelCase (frontend TypeScript types).
 */
function normalizeEntitlement(raw: Record<string, unknown>): IamEntitlement {
  return {
    id: (raw.id || raw.Id || '') as string,
    subject: raw.subject as IamEntitlement['subject'] || raw.Subject as IamEntitlement['subject'],
    resource: raw.resource as IamEntitlement['resource'] || raw.Resource as IamEntitlement['resource'],
    roleKey: (raw.roleKey || raw.role_key || raw.RoleKey || '') as string | undefined,
    permissions: (raw.permissions || raw.Permissions || []) as string[] | undefined,
    sourceType: (raw.sourceType || raw.source_type || raw.SourceType) as IamEntitlement['sourceType'],
    sourceSubject: (raw.sourceSubject || raw.source_subject || raw.SourceSubject) as IamEntitlement['sourceSubject'],
    sourceResource: (raw.sourceResource || raw.source_resource || raw.SourceResource) as IamEntitlement['sourceResource'],
    grantId: (raw.grantId || raw.grant_id || raw.GrantId || '') as string | undefined,
    revocableHere: (raw.revocableHere ?? raw.revocable_here ?? raw.RevocableHere ?? false) as boolean | undefined,
    expiresAt: (raw.expiresAt || raw.expires_at || raw.ExpiresAt) as string | undefined,
    consistencyToken: (raw.consistencyToken || raw.consistency_token || raw.ConsistencyToken) as string | undefined,
  };
}

function normalizeEntitlements(raw: Record<string, unknown>[]): IamEntitlement[] {
  return (raw || []).map(normalizeEntitlement);
}

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
    }).then((raw) => ({
      entitlements: normalizeEntitlements((raw as Record<string, unknown>).entitlements as Record<string, unknown>[] || []),
      nextPageToken: (raw as Record<string, unknown>).nextPageToken as string | undefined,
      totalSize: Number((raw as Record<string, unknown>).totalSize || 0),
    })),

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
    }).then((raw) => ({
      entitlements: normalizeEntitlements((raw as Record<string, unknown>).entitlements as Record<string, unknown>[] || []),
      nextPageToken: (raw as Record<string, unknown>).nextPageToken as string | undefined,
      totalSize: Number((raw as Record<string, unknown>).totalSize || 0),
    })),

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
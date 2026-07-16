import {
  iAMPermissionServiceCheckPermission,
  iAMPermissionServiceDeleteRelationships,
  iAMPermissionServiceWriteRelationships,
} from '../generated/iampermission-service/iampermission-service';
import type { IamCheckPermissionRequest, IamCheckPermissionResponse, IamRelationship } from '../types';

/** IAM Permission Service */
export const iamPermissionApi = {
  check: (req: IamCheckPermissionRequest): Promise<IamCheckPermissionResponse> =>
    iAMPermissionServiceCheckPermission({
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

  writeRelationship: (relationship: IamRelationship): Promise<{ consistencyToken?: string }> =>
    iAMPermissionServiceWriteRelationships({
      relationships: [{
        resource: { type: relationship.resource.type, id: relationship.resource.id },
        relation: relationship.relation,
        subject: { type: relationship.subject.type, id: relationship.subject.id, relation: relationship.subject.relation },
      }],
    }).then((reply) => ({ consistencyToken: reply.consistencyToken })),

  deleteRelationship: (relationship: IamRelationship): Promise<{ consistencyToken?: string }> =>
    iAMPermissionServiceDeleteRelationships({
      filter: {
        resourceType: relationship.resource.type,
        resourceId: relationship.resource.id,
        relation: relationship.relation,
        subjectType: relationship.subject.type,
        subjectId: relationship.subject.id,
        subjectRelation: relationship.subject.relation,
      },
    }).then((reply) => ({ consistencyToken: reply.consistencyToken })),
};
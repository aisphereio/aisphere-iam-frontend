import {
  resourceServiceGetResource,
  resourceServiceGetResourceType,
  resourceServiceListResourceBindings,
  resourceServiceListResources,
  resourceServiceListResourceTypes,
  resourceServiceRegisterResourceType,
} from '../generated/resource-service/resource-service';
import { normalizeIamResourceType, normalizeIamResourceTypesResponse } from '../mappers/authorization';
import type { IamResource, IamResourceBinding, IamResourceType } from '../types';

/** IAM Resource Service */
export const iamResourceService = {
  registerResourceType: (rt: { type: string; displayName?: string; description?: string }): Promise<IamResourceType> =>
    resourceServiceRegisterResourceType({
      resourceType: {
        type: rt.type,
        displayName: rt.displayName,
        description: rt.description,
      },
    }).then((r) => normalizeIamResourceType(r as unknown as Record<string, unknown>)),

  getResourceType: (type: string): Promise<IamResourceType> =>
    resourceServiceGetResourceType(type).then((r) => normalizeIamResourceType(r as unknown as Record<string, unknown>)),

  listResourceTypes: (): Promise<{ resourceTypes: IamResourceType[] }> =>
    resourceServiceListResourceTypes().then((reply) => normalizeIamResourceTypesResponse(reply as unknown as Record<string, unknown>)),

  listResources: (orgId: string, params?: { type?: string; projectId?: string }): Promise<{ resources: IamResource[] }> =>
    resourceServiceListResources(orgId, params as never) as Promise<{ resources: IamResource[] }>,

  getResource: (orgId: string, resourceType: string, resourceId: string): Promise<IamResource> =>
    resourceServiceGetResource(orgId, resourceType, resourceId) as Promise<IamResource>,

  listResourceBindings: (orgId: string, params?: { resourceType?: string; resourceId?: string }): Promise<{ bindings: IamResourceBinding[] }> =>
    resourceServiceListResourceBindings(orgId, params as never) as Promise<{ bindings: IamResourceBinding[] }>,
};
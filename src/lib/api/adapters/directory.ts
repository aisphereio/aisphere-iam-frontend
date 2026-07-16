import {
  iAMDirectoryServiceGetOrganization,
  iAMDirectoryServiceGetUser,
  iAMDirectoryServiceListGroups,
  iAMDirectoryServiceListUsers,
} from '../generated/iamdirectory-service/iamdirectory-service';
import {
  iAMGroupAdminServiceAssignUserToGroup,
  iAMGroupAdminServiceCreateGroup,
  iAMGroupAdminServiceDeleteGroup,
  iAMGroupAdminServiceRemoveUserFromGroup,
  iAMGroupAdminServiceUpdateGroup,
} from '../generated/iamgroup-admin-service/iamgroup-admin-service';
import type { V1Group } from '../generated/model';
import { normalizeIamGroup, normalizeIamGroupsReply } from '../mappers/group';
import { normalizeIamUser, normalizeIamUsersReply } from '../mappers/user';
import type { IamGroup, IamOrganization, IamUser } from '../types';

/** IAM Directory Service */
export const iamDirectoryApi = {
  getUser: (orgId: string, userId: string): Promise<IamUser> =>
    iAMDirectoryServiceGetUser(orgId, userId).then((u) => normalizeIamUser(u as unknown as Record<string, unknown>)),

  listUsers: (
    orgId: string,
    params?: { query?: string; groupId?: string; role?: string; pageSize?: number; pageToken?: string },
  ): Promise<{ users: IamUser[]; nextPageToken?: string; next_page_token?: string }> => {
    return iAMDirectoryServiceListUsers(orgId, {
      query: params?.query,
      groupId: params?.groupId,
      role: params?.role,
      pageSize: params?.pageSize,
      pageToken: params?.pageToken,
    }).then((reply) => normalizeIamUsersReply(reply as unknown as Record<string, unknown>));
  },

  getOrganization: (orgId: string): Promise<IamOrganization> =>
    iAMDirectoryServiceGetOrganization(orgId).then((org) => ({
      id: org.id || '',
      externalId: org.externalId,
      name: org.name || '',
      displayName: org.displayName,
      ownerId: org.ownerId,
      parentId: org.parentId,
      tags: org.tags,
      enabled: org.enabled,
    })),

  listGroups: (orgId: string, params?: { parentId?: string; type?: string; userId?: string }): Promise<{ groups: IamGroup[] }> => {
    return iAMDirectoryServiceListGroups(orgId, {
      parentId: params?.parentId,
      type: params?.type,
      userId: params?.userId,
    }).then((reply) => normalizeIamGroupsReply(reply as unknown as Record<string, unknown>));
  },

  createGroup: (
    orgId: string,
    group: Required<Pick<V1Group, 'name'>> & Pick<V1Group, 'parentId' | 'displayName' | 'type'>,
  ): Promise<IamGroup> => iAMGroupAdminServiceCreateGroup(orgId, {
    group: {
      name: group.name,
      displayName: group.displayName || group.name,
      ...(group.parentId !== undefined ? { parentId: group.parentId } : {}),
      ...(group.type !== undefined ? { type: group.type } : {}),
    },
  }).then((g) => normalizeIamGroup(g as unknown as Record<string, unknown>)),

  updateGroup: (
    orgId: string,
    groupId: string,
    group: Pick<V1Group, 'parentId' | 'name' | 'displayName' | 'type'>,
  ): Promise<IamGroup> => {
    const { parentId } = group;
    const groupBody: Record<string, unknown> = {
      ...(group.name !== undefined ? { name: group.name } : {}),
      ...(group.displayName !== undefined ? { displayName: group.displayName } : {}),
      ...(group.type !== undefined ? { type: group.type } : {}),
    };
    // parentId must be sent as snake_case "parent_id" inside the group object
    // because the backend protobuf JSON encoder uses snake_case field names
    // (json:"parent_id,omitempty") and the PATCH body: "*" binding maps the
    // entire body to UpdateGroupRequest which nests Group fields.
    // When parentId is undefined (user cleared the field to make it top-level),
    // we must send parent_id: "" to tell the backend to clear the parent.
    groupBody.parent_id = parentId ?? '';
    return iAMGroupAdminServiceUpdateGroup(orgId, groupId, { group: groupBody as V1Group }).then((g) => normalizeIamGroup(g as unknown as Record<string, unknown>));
  },

  deleteGroup: (orgId: string, groupId: string, recursive = false): Promise<{ success: boolean }> =>
    iAMGroupAdminServiceDeleteGroup(orgId, groupId, recursive ? { recursive: true } : undefined).then(() => ({ success: true })),

  assignUserToGroup: (orgId: string, groupId: string, userId: string): Promise<Record<string, never>> =>
    iAMGroupAdminServiceAssignUserToGroup(orgId, groupId, userId).then(() => ({})),

  removeUserFromGroup: (orgId: string, groupId: string, userId: string): Promise<Record<string, never>> =>
    iAMGroupAdminServiceRemoveUserFromGroup(orgId, groupId, userId).then(() => ({})),
};
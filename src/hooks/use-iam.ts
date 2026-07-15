'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  iamDirectoryApi,
  iamProjectApi,
  iamResourceService,
  iamGrantService,
} from '@/lib/api';

// ─── Directory Users (Casdoor External User Directory) ─────────────────

export function useIamDirectoryUsers(orgId: string) {
  return useQuery({
    queryKey: ['iam', 'directory-users', orgId],
    queryFn: () => iamDirectoryApi.listUsers(orgId),
    enabled: Boolean(orgId),
  });
}

/** Alias for useIamDirectoryUsers with pagination support. */
export function useIamExternalUsers(
  orgId: string,
  params?: { query?: string; groupId?: string; role?: string; pageSize?: number; pageToken?: string },
) {
  return useQuery({
    queryKey: ['iam', 'external-users', orgId, params],
    queryFn: () => iamDirectoryApi.listUsers(orgId, params),
    enabled: Boolean(orgId),
  });
}

export function useIamDirectoryOrganization(orgId: string) {
  return useQuery({
    queryKey: ['iam', 'directory-org', orgId],
    queryFn: () => iamDirectoryApi.getOrganization(orgId),
    enabled: Boolean(orgId),
  });
}

export function useIamDirectoryGroups(orgId: string, params?: { parentId?: string; type?: string; userId?: string }) {
  return useQuery({
    queryKey: ['iam', 'directory-groups', orgId, params],
    queryFn: () => iamDirectoryApi.listGroups(orgId, params),
    enabled: Boolean(orgId),
  });
}

export function useIamCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orgId: string; parentId?: string; name: string; displayName?: string; type?: string }) =>
      iamDirectoryApi.createGroup(params.orgId, params),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['iam', 'directory-groups', vars.orgId] }),
  });
}

export function useIamUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orgId: string; groupId: string; parentId?: string; name?: string; displayName?: string; type?: string }) =>
      iamDirectoryApi.updateGroup(params.orgId, params.groupId, params),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['iam', 'directory-groups', vars.orgId] }),
  });
}

export function useIamDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orgId: string; groupId: string; recursive?: boolean }) =>
      iamDirectoryApi.deleteGroup(params.orgId, params.groupId, Boolean(params.recursive)),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['iam', 'directory-groups', vars.orgId] }),
  });
}

type GroupMembershipParams = { orgId: string; groupId: string; userId: string };

export function useIamAssignUserToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: GroupMembershipParams) =>
      iamDirectoryApi.assignUserToGroup(params.orgId, params.groupId, params.userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['iam', 'directory-groups', vars.orgId] });
      qc.invalidateQueries({ queryKey: ['iam', 'external-users', vars.orgId] });
    },
  });
}

export function useIamRemoveUserFromGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: GroupMembershipParams) =>
      iamDirectoryApi.removeUserFromGroup(params.orgId, params.groupId, params.userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['iam', 'directory-groups', vars.orgId] });
      qc.invalidateQueries({ queryKey: ['iam', 'external-users', vars.orgId] });
    },
  });
}

// ─── Control Plane Projects ────────────────────────────────────────────

export function useIamProjects(orgId?: string) {
  return useQuery({
    queryKey: ['iam', 'projects', orgId],
    queryFn: () => iamProjectApi.listProjects(orgId || ''),
    enabled: Boolean(orgId),
  });
}

export function useIamProject(orgId: string, projectId: string) {
  return useQuery({
    queryKey: ['iam', 'project', orgId, projectId],
    queryFn: () => iamProjectApi.getProject(orgId, projectId),
    enabled: Boolean(orgId) && Boolean(projectId),
  });
}

export function useIamCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orgId: string; slug: string; displayName?: string; description?: string }) =>
      iamProjectApi.createProject(params.orgId, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'projects'] }),
  });
}

// ─── Capabilities ──────────────────────────────────────────────────────

export function useIamCapabilities() {
  return useQuery({
    queryKey: ['iam', 'capabilities'],
    queryFn: () => iamProjectApi.listCapabilities(),
  });
}

export function useIamProjectCapabilities(orgId: string, projectId: string) {
  return useQuery({
    queryKey: ['iam', 'project-capabilities', orgId, projectId],
    queryFn: () => iamProjectApi.listProjectCapabilities(orgId, projectId),
    enabled: Boolean(orgId) && Boolean(projectId),
  });
}

// ─── Resource Types & Resources ────────────────────────────────────────

export function useIamResourceTypes() {
  return useQuery({
    queryKey: ['iam', 'resource-types'],
    queryFn: () => iamResourceService.listResourceTypes(),
  });
}

export function useIamResources(orgId?: string, params?: { type?: string; projectId?: string }) {
  return useQuery({
    queryKey: ['iam', 'resources', orgId, params],
    queryFn: () => iamResourceService.listResources(orgId || '', params),
    enabled: Boolean(orgId),
  });
}

export function useIamResourceBindings(orgId?: string, params?: { resourceType?: string; resourceId?: string }) {
  return useQuery({
    queryKey: ['iam', 'resource-bindings', orgId, params],
    queryFn: () => iamResourceService.listResourceBindings(orgId || '', params),
    enabled: Boolean(orgId),
  });
}

// ─── Role Templates & Grants ───────────────────────────────────────────

export function useIamRoleTemplates() {
  return useQuery({
    queryKey: ['iam', 'role-templates'],
    queryFn: () => iamGrantService.listRoleTemplates(),
  });
}

export function useIamGrants(orgId?: string, params?: {
  resourceType?: string;
  resourceId?: string;
  subjectType?: string;
  subjectId?: string;
}) {
  return useQuery({
    queryKey: ['iam', 'grants', orgId, params],
    queryFn: () => iamGrantService.listGrants(orgId || '', params),
    enabled: Boolean(orgId),
  });
}

export function useIamGrantAccess(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grant: {
      resource?: { type: string; id: string };
      role_key?: string;
      subject?: { type: string; id: string; relation?: string };
      source?: string;
      reason?: string;
      expires_at?: string;
    }) => iamGrantService.grantAccess(orgId || '', grant),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'grants', orgId] }),
  });
}

export function useIamRevokeAccess(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => iamGrantService.revokeAccess(orgId || '', grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'grants', orgId] }),
  });
}

export function useIamRegisterRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rt: { resourceType: string; roleKey: string; displayName?: string; description?: string; permissions?: string[] }) =>
      iamGrantService.registerRoleTemplate(rt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'role-templates'] }),
  });
}

export function useIamUpdateRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; displayName?: string; description?: string; permissions: string[]; expectedVersion: number }) =>
      iamGrantService.updateRoleTemplate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'role-templates'] }),
  });
}

export function useIamDisableRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; expectedVersion: number; confirmActiveGrants: boolean }) =>
      iamGrantService.disableRoleTemplate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'role-templates'] }),
  });
}

export function useIamPreviewRoleTemplateImpact() {
  return useMutation({
    mutationFn: (input: { id: string; permissions: string[] }) => iamGrantService.previewRoleTemplateImpact(input),
  });
}

export function useIamExplainAccess(orgId?: string) {
  return useMutation({
    mutationFn: (params: { resource: { type: string; id: string }; permission: string; subject: { type: string; id: string } }) =>
      iamGrantService.explainAccess(orgId || '', params),
  });
}

// ─── AccessQuery Hooks ──────────────────────────────────────────────────

import { iamAccessQueryApi } from '@/lib/api';
import type {
  IamListSubjectEntitlementsReply,
  IamListResourceAccessReply,
  IamPreviewGrantReply,
} from '@/lib/api/types';

/** Query all effective permissions for a subject */
export function useIamSubjectEntitlements(
  orgId: string,
  subject: { type: string; id: string } | null,
  resourceType?: string,
) {
  return useQuery({
    queryKey: ['iam', 'subject-entitlements', orgId, subject, resourceType],
    queryFn: () =>
      iamAccessQueryApi.listSubjectEntitlements(orgId, {
        subject: subject!,
        resourceType,
      }),
    enabled: Boolean(orgId) && Boolean(subject?.type && subject?.id),
  });
}

/** Query all subjects with effective access to a resource */
export function useIamResourceAccess(
  orgId: string,
  resource: { type: string; id: string } | null,
  subjectType?: string,
) {
  return useQuery({
    queryKey: ['iam', 'resource-access', orgId, resource, subjectType],
    queryFn: () =>
      iamAccessQueryApi.listResourceAccess(orgId, {
        resource: resource!,
        subjectType,
      }),
    enabled: Boolean(orgId) && Boolean(resource?.type && resource?.id),
  });
}

/** Preview grant mutation */
export function useIamPreviewGrant(orgId?: string) {
  return useMutation({
    mutationFn: (params: {
      resource: { type: string; id: string };
      roleKey: string;
      subject: { type: string; id: string };
    }) => iamAccessQueryApi.previewGrant(orgId || '', params),
  });
}

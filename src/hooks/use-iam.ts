'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  iamDirectoryApi,
  iamProjectApi,
  iamResourceService,
  iamGrantService,
  localUserApi,
} from '@/lib/api';
import type { LocalUser } from '@/lib/api/types';

// ─── Local Users ───────────────────────────────────────────────────────

export function useIamUsers() {
  return useQuery({
    queryKey: ['iam', 'local-users'],
    queryFn: () => localUserApi.list(),
  });
}

export function useIamSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (u: LocalUser) => localUserApi.save(u),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'local-users'] }),
  });
}

export function useIamDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => localUserApi.delete(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'local-users'] }),
  });
}

// ─── Directory ─────────────────────────────────────────────────────────

export function useIamDirectoryUsers(orgId: string) {
  return useQuery({
    queryKey: ['iam', 'directory-users', orgId],
    queryFn: () => iamDirectoryApi.listUsers(orgId),
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

export function useIamDirectoryGroups(orgId: string) {
  return useQuery({
    queryKey: ['iam', 'directory-groups', orgId],
    queryFn: () => iamDirectoryApi.listGroups(orgId),
    enabled: Boolean(orgId),
  });
}

// ─── Control Plane Organizations ───────────────────────────────────────

export function useIamOrganizations() {
  return useQuery({
    queryKey: ['iam', 'organizations'],
    queryFn: () => iamProjectApi.listOrganizations(),
  });
}

export function useIamOrganization(orgId: string) {
  return useQuery({
    queryKey: ['iam', 'organization', orgId],
    queryFn: () => iamProjectApi.getOrganization(orgId),
    enabled: Boolean(orgId),
  });
}

export function useIamCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (org: { slug: string; displayName?: string; casdoorOrg?: string }) =>
      iamProjectApi.createOrganization(org),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'organizations'] }),
  });
}

export function useIamUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, org }: { orgId: string; org: Partial<IamCpOrganization> }) =>
      iamProjectApi.updateOrganization(orgId, org),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'organizations'] }),
  });
}

export function useIamArchiveOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => iamProjectApi.archiveOrganization(orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'organizations'] }),
  });
}

// ─── Control Plane Projects ────────────────────────────────────────────

export function useIamProjects() {
  return useQuery({
    queryKey: ['iam', 'projects'],
    queryFn: () => iamProjectApi.listProjects(),
  });
}

export function useIamProject(projectId: string) {
  return useQuery({
    queryKey: ['iam', 'project', projectId],
    queryFn: () => iamProjectApi.getProject(projectId),
    enabled: Boolean(projectId),
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

export function useIamProjectCapabilities(projectId: string) {
  return useQuery({
    queryKey: ['iam', 'project-capabilities', projectId],
    queryFn: () => iamProjectApi.listProjectCapabilities(projectId),
    enabled: Boolean(projectId),
  });
}

// ─── Resource Types & Resources ────────────────────────────────────────

export function useIamResourceTypes() {
  return useQuery({
    queryKey: ['iam', 'resource-types'],
    queryFn: () => iamResourceService.listResourceTypes(),
  });
}

export function useIamResources(params?: { type?: string; orgId?: string; projectId?: string }) {
  return useQuery({
    queryKey: ['iam', 'resources', params],
    queryFn: () => iamResourceService.listResources(params),
  });
}

export function useIamResourceBindings(params?: { resourceType?: string; resourceId?: string }) {
  return useQuery({
    queryKey: ['iam', 'resource-bindings', params],
    queryFn: () => iamResourceService.listResourceBindings(params),
  });
}

// ─── Role Templates & Grants ───────────────────────────────────────────

export function useIamRoleTemplates() {
  return useQuery({
    queryKey: ['iam', 'role-templates'],
    queryFn: () => iamGrantService.listRoleTemplates(),
  });
}

export function useIamGrants(params?: {
  resourceType?: string;
  resourceId?: string;
  subjectType?: string;
  subjectId?: string;
}) {
  return useQuery({
    queryKey: ['iam', 'grants', params],
    queryFn: () => iamGrantService.listGrants(params),
  });
}

export function useIamGrantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grant: {
      resource?: { type: string; id: string };
      roleKey?: string;
      subject?: { type: string; id: string };
      reason?: string;
    }) => iamGrantService.grantAccess(grant),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'grants'] }),
  });
}

export function useIamRevokeAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => iamGrantService.revokeAccess(grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'grants'] }),
  });
}
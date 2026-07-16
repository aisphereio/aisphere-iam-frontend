'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { iamAuthzAdminApi, iamGrantService, iamResourceService } from '@/lib/api';
import type { IamCheckPermissionRequest, IamRelationship } from '@/lib/api/types';

export function useIamAuthzSchema() {
  return useQuery({
    queryKey: ['iam', 'authz', 'schema'],
    queryFn: () => iamAuthzAdminApi.getSchema(),
  });
}

export function useIamAuthzCatalog() {
  return useQuery({
    queryKey: ['iam', 'authz', 'catalog'],
    queryFn: async () => {
      const [resourceTypes, roleTemplates] = await Promise.all([
        iamResourceService.listResourceTypes(),
        iamGrantService.listRoleTemplates(),
      ]);
      return {
        resourceTypes: resourceTypes.resourceTypes || [],
        roleTemplates: roleTemplates.roleTemplates || [],
      };
    },
    retry: 1,
  });
}

export function useIamValidateAuthzSchema() {
  return useMutation({
    mutationFn: (text: string) => iamAuthzAdminApi.validateSchema(text),
  });
}

export function useIamPublishAuthzSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => iamAuthzAdminApi.publishSchema(text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'authz', 'schema'] }),
  });
}

export function useIamAuthzRelationships(params?: {
  resourceType?: string;
  resourceId?: string;
  relation?: string;
  subjectType?: string;
  subjectId?: string;
  subjectRelation?: string;
}, enabled?: boolean) {
  return useQuery({
    queryKey: ['iam', 'authz', 'relationships', params],
    queryFn: () => iamAuthzAdminApi.listRelationships(params),
    enabled: enabled !== false && Boolean(params),
  });
}

export function useIamWriteAuthzRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationship: IamRelationship) => iamAuthzAdminApi.writeRelationship(relationship),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'authz', 'relationships'] }),
  });
}

export function useIamDeleteAuthzRelationships() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filter: {
      resourceType?: string;
      resourceId?: string;
      relation?: string;
      subjectType?: string;
      subjectId?: string;
      subjectRelation?: string;
    }) => iamAuthzAdminApi.deleteRelationships(filter),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'authz', 'relationships'] }),
  });
}

export function useIamCheckAuthzPermission() {
  return useMutation({
    mutationFn: (req: IamCheckPermissionRequest) => iamAuthzAdminApi.checkPermission(req),
  });
}

export function useIamExplainAuthzPermission() {
  return useMutation({
    mutationFn: (req: IamCheckPermissionRequest) => iamAuthzAdminApi.explainPermission(req),
  });
}

export function useIamEffectivePermissions() {
  return useMutation({
    mutationFn: (params: {
      subjectType: string;
      subjectId: string;
      subjectRelation?: string;
      resourceType: string;
      resourceId: string;
      permissions?: string[];
    }) => iamAuthzAdminApi.effectivePermissions(params),
  });
}

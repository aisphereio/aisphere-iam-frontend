'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { iamAuthzAdminApi, iamGrantService, iamResourceService } from '@/lib/api';

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
}) {
  return useQuery({
    queryKey: ['iam', 'authz', 'relationships', params],
    queryFn: () => iamAuthzAdminApi.listRelationships(params),
  });
}

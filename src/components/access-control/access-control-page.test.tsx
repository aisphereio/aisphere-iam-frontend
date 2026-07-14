import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccessControlPage } from './access-control-page';

vi.mock('@/hooks/use-iam', () => ({
  useIamRoleTemplates: () => ({ data: { roleTemplates: [
    { id: 'zone:admin', resourceType: 'zone', roleKey: 'zone_admin', displayName: '组织管理员', relation: 'admin', builtIn: true, enabled: true, version: 1 },
    { id: 'skill:reviewer', resourceType: 'skill', roleKey: 'reviewer', displayName: 'Skill 审核员', relation: 'custom_binding', permissions: ['view', 'review'], builtIn: false, enabled: true, version: 1 },
  ] }, isLoading: false }),
  useIamResourceTypes: () => ({ data: { resourceTypes: [
    { type: 'zone', displayName: '组织', grantable: true, permissions: ['view_zone', 'manage_users', 'manage_groups'] },
    { type: 'skill', displayName: 'Skill', grantable: true, permissions: ['view', 'edit', 'review', 'publish', 'manage'] },
  ] }, isLoading: false }),
  useIamRegisterRoleTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamUpdateRoleTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamDisableRoleTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamPreviewRoleTemplateImpact: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamGrants: () => ({ data: { grants: [] }, isLoading: false }),
  useIamGrantAccess: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamRevokeAccess: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamResources: () => ({ data: { resources: [] }, isLoading: false }),
  useIamExternalUsers: () => ({ data: { users: [] }, isLoading: false }),
  useIamDirectoryGroups: () => ({ data: { groups: [] }, isLoading: false }),
  useIamExplainAccess: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('AccessControlPage', () => {
  it('opens with the role library and explains direct versus inherited scope', () => {
    render(<AccessControlPage identityOrg="org-a" />);

    expect(screen.getByRole('heading', { name: '访问控制' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '角色库' })).toBeInTheDocument();
    expect(screen.getByText('组织管理员')).toBeInTheDocument();
    expect(screen.getByText('Skill 审核员')).toBeInTheDocument();
    expect(screen.getByText(/不会复制成每个用户组的直属管理员/)).toBeInTheDocument();
  });

  it('switches from roles to access assignments', () => {
    render(<AccessControlPage identityOrg="org-a" />);

    fireEvent.click(screen.getByRole('button', { name: /访问分配/ }));
    expect(screen.getByRole('heading', { name: '访问分配' })).toBeInTheDocument();
    expect(screen.getByText(/选择资源、人员或用户组/)).toBeInTheDocument();
  });
});

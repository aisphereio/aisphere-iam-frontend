import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoleLibrary } from './role-library';

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

describe('RoleLibrary', () => {
  it('renders role cards', () => {
    render(<RoleLibrary onAssign={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '角色模板' })).toBeInTheDocument();
    expect(screen.getByText('组织管理员')).toBeInTheDocument();
    expect(screen.getByText('Skill 审核员')).toBeInTheDocument();
  });

  it('opens a role detail sheet when a card is clicked', () => {
    render(<RoleLibrary onAssign={vi.fn()} />);

    expect(screen.queryByText('reviewer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Skill 审核员'));
    expect(screen.getByText('reviewer')).toBeInTheDocument();
    expect(screen.getByText(/包含能力/)).toBeInTheDocument();
  });

  it('calls onAssign with roleKey and resourceType when assign button is clicked', () => {
    const onAssign = vi.fn();
    render(<RoleLibrary onAssign={onAssign} />);

    const assignButtons = screen.getAllByText('分配');
    fireEvent.click(assignButtons[0]);

    expect(onAssign).toHaveBeenCalledWith('zone_admin', 'zone');
  });
});
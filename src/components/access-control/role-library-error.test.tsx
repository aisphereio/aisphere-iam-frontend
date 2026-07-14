import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoleLibrary } from './role-library';

vi.mock('@/hooks/use-iam', () => ({
  useIamRoleTemplates: () => ({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error('503 Service Unavailable'),
  }),
  useIamResourceTypes: () => ({ data: { resourceTypes: [] }, isLoading: false }),
  useIamDisableRoleTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamRegisterRoleTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamUpdateRoleTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIamPreviewRoleTemplateImpact: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('RoleLibrary error state', () => {
  it('shows an API error instead of presenting an empty role library', () => {
    render(<RoleLibrary onAssign={vi.fn()} />);

    expect(screen.getByText('角色加载失败')).toBeInTheDocument();
    expect(screen.getByText(/503 Service Unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('没有匹配的角色。')).not.toBeInTheDocument();
  });
});

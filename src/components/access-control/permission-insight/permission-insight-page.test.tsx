import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionInsightPage } from './permission-insight-page';

vi.mock('@/hooks/use-iam', () => ({
  useIamExternalUsers: () => ({ data: { users: [] }, isLoading: false }),
  useIamDirectoryGroups: () => ({ data: { groups: [] }, isLoading: false }),
  useIamResources: () => ({ data: { resources: [] }, isLoading: false }),
}));

describe('PermissionInsightPage', () => {
  it('renders the unified permission view shell', () => {
    render(<PermissionInsightPage identityOrg="aisphere" />);
    expect(screen.getByRole('heading', { name: '权限视图' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索人员、组织或资源')).toBeInTheDocument();
  });
});
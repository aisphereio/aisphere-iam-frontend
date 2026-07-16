import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EntitlementList } from './entitlement-list';
import type { IamEntitlement } from '@/lib/api/types';

const base: IamEntitlement = {
  id: 'e1',
  subject: { type: 'user', id: 'alice' },
  resource: { type: 'project', id: 'project-a' },
  roleKey: 'owner',
  permissions: ['view', 'manage'],
  sourceType: 'GROUP_GRANT',
  sourceSubject: { type: 'group', id: 'platform' },
};

describe('EntitlementList', () => {
  it('shows group source path without raw SpiceDB syntax by default', () => {
    render(<EntitlementList entitlements={[base]} emptyText="empty" />);
    expect(screen.getByText('project-a')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('通过组织 platform')).toBeInTheDocument();
    expect(screen.queryByText(/group:platform#member/)).not.toBeInTheDocument();
  });

  it('shows direct grant source text', () => {
    const direct: IamEntitlement = {
      ...base,
      sourceType: 'DIRECT_GRANT',
      sourceSubject: undefined,
    };
    render(<EntitlementList entitlements={[direct]} emptyText="empty" />);
    expect(screen.getByText('直接授权')).toBeInTheDocument();
  });

  it('shows empty text when no entitlements', () => {
    render(<EntitlementList entitlements={[]} emptyText="当前没有权限" />);
    expect(screen.getByText('当前没有权限')).toBeInTheDocument();
  });
});
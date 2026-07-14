import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrganizationPathItem } from './organization-workbench-model';
import { OrganizationWorkbenchShell } from './organization-workbench-shell';

const path: OrganizationPathItem[] = [
  { kind: 'root', id: 'aisphere', label: 'Aisphere' },
  { kind: 'group', id: 'engineering', label: '工程中心', group: { id: 'engineering', name: 'engineering' } },
  { kind: 'group', id: 'platform', label: '平台研发', group: { id: 'platform', name: 'platform' } },
];

describe('OrganizationWorkbenchShell', () => {
  it('keeps hierarchy navigation and the selected scope in one workbench', () => {
    const onSelectPath = vi.fn();

    render(
      <OrganizationWorkbenchShell
        path={path}
        organizationCount={8}
        memberCount={21}
        onSelectPath={onSelectPath}
        onCreate={vi.fn()}
        onRefresh={vi.fn()}
        navigator={<div>组织树</div>}
      >
        <div>平台研发详情</div>
      </OrganizationWorkbenchShell>,
    );

    expect(screen.getByRole('heading', { name: '组织工作台' })).toBeInTheDocument();
    expect(screen.getByText('组织树')).toBeInTheDocument();
    expect(screen.getByText('平台研发详情')).toBeInTheDocument();
    expect(screen.getByText('8 个组织')).toBeInTheDocument();
    expect(screen.getByText('21 名成员')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aisphere' }));
    expect(onSelectPath).toHaveBeenCalledWith(path[0]);
  });

  it('exposes the primary creation action from every selected scope', () => {
    const onCreate = vi.fn();
    render(
      <OrganizationWorkbenchShell
        path={path.slice(0, 1)}
        organizationCount={0}
        memberCount={0}
        onSelectPath={vi.fn()}
        onCreate={onCreate}
        onRefresh={vi.fn()}
        navigator={<div />}
      >
        <div />
      </OrganizationWorkbenchShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: '新建组织' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

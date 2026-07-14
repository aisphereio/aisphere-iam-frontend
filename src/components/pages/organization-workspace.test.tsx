import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrganizationWorkspaceTabs } from './organization-workspace';

describe('OrganizationWorkspaceTabs', () => {
  it('separates structure, members, and settings into focused tasks', () => {
    render(
      <OrganizationWorkspaceTabs
        overview={<div>下级组织结构</div>}
        members={<div>成员管理区域</div>}
        settings={<div>组织设置表单</div>}
        memberCount={12}
        childCount={3}
      />,
    );

    expect(screen.getByText('下级组织结构')).toBeVisible();
    expect(screen.queryByText('成员管理区域')).not.toBeInTheDocument();

    const membersTab = screen.getByRole('tab', { name: /成员/ });
    fireEvent.mouseDown(membersTab, { button: 0, ctrlKey: false });
    fireEvent.click(membersTab);
    expect(screen.getByText('成员管理区域')).toBeVisible();

    const settingsTab = screen.getByRole('tab', { name: '组织设置' });
    fireEvent.mouseDown(settingsTab, { button: 0, ctrlKey: false });
    fireEvent.click(settingsTab);
    expect(screen.getByText('组织设置表单')).toBeVisible();
  });
});

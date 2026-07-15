import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('renders title and description when open', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="撤销访问分配"
        description="权限将立即失效。"
        confirmLabel="撤销"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('撤销访问分配')).toBeInTheDocument();
    expect(screen.getByText('权限将立即失效。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '撤销' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="停用角色"
        description="继续吗？"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="不应出现"
        description="不应出现"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByText('不应出现')).not.toBeInTheDocument();
  });
});

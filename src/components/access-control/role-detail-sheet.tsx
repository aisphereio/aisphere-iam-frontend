'use client';

import { Copy, KeyRound, Pencil, Shield, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { IamRoleTemplate } from '@/lib/api/types';
import { permissionLabel, resourceLabel } from '@/lib/authz/schema-summary';
import { CAPABILITY_ORDER, permissionCategoryOf, roleScopeDescription } from '@/lib/authz/role-capabilities';

const CATEGORY_LABELS: Record<string, string> = {
  read: '查看与查询',
  operate: '运行与操作',
  manage: '创建与管理',
};

const CATEGORY_ORDER = ['read', 'operate', 'manage'] as const;

export interface RoleDetailSheetProps {
  role: IamRoleTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: () => void;
  onEdit: (role: IamRoleTemplate) => void;
  onCopy: (role: IamRoleTemplate) => void;
  onDisable: (role: IamRoleTemplate) => void;
}

export function RoleDetailSheet({ role, open, onOpenChange, onAssign, onEdit, onCopy, onDisable }: RoleDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        {role && <RoleDetailBody role={role} onAssign={onAssign} onEdit={onEdit} onCopy={onCopy} onDisable={onDisable} />}
      </SheetContent>
    </Sheet>
  );
}

function RoleDetailBody({ role, onAssign, onEdit, onCopy, onDisable }: {
  role: IamRoleTemplate;
  onAssign: () => void;
  onEdit: (role: IamRoleTemplate) => void;
  onCopy: (role: IamRoleTemplate) => void;
  onDisable: (role: IamRoleTemplate) => void;
}) {
  const permissions = role.permissions || [];
  const grouped = groupPermissions(permissions);

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            {role.builtIn ? <Shield className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-lg">{role.displayName || role.roleKey}</SheetTitle>
            <SheetDescription className="mt-0.5 font-mono text-xs">{role.roleKey}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={role.builtIn ? 'secondary' : 'outline'}>{role.builtIn ? '内置' : '自定义'}</Badge>
          {role.enabled === false && <Badge variant="destructive">已停用</Badge>}
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <OverviewItem label="生效资源" value={resourceLabel(role.resourceType || '')} />
          <OverviewItem label="有效分配" value={`${role.activeGrantCount || 0} 个`} />
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">作用域</div>
            <p className="mt-1 text-sm leading-5">{roleScopeDescription(role.roleKey, role.resourceType)}</p>
          </div>
          {role.description && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">用途说明</div>
              <p className="mt-1 text-sm leading-5">{role.description}</p>
            </div>
          )}
          <OverviewItem label="版本" value={`v${role.version || 1}`} />
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-semibold">包含能力</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">共 {permissions.length} 项，按类型分组。</p>
          <div className="mt-3 space-y-4">
            {grouped.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">该角色未声明能力。</div>
            ) : grouped.map(({ category, items }) => (
              <div key={category} className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">{CATEGORY_LABELS[category] || category}</div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((key) => <Badge key={key} variant="outline" className="font-normal">{permissionLabel(key)}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-semibold">权限影响范围</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">该角色在对应资源类型上的继承效果。</p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">直接作用</div>
              <p className="mt-0.5 text-muted-foreground">
                直接分配该角色的资源上生效。
              </p>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">默认继承</div>
              <p className="mt-0.5 text-muted-foreground">
                该角色权限会继承到下级资源（如项目下的 Skill、Git 仓库等）。
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">不包含</div>
              <p className="mt-0.5 text-muted-foreground">
                不包含管理成员、修改权限、删除资源等管理类操作（除非角色明确包含）。
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-2 border-t px-5 py-4">
        <Button size="sm" onClick={onAssign} disabled={role.enabled === false}><UserPlus className="mr-1.5 h-3.5 w-3.5" />分配</Button>
        {role.builtIn
          ? <Button size="sm" variant="outline" onClick={() => onCopy(role)}><Copy className="mr-1.5 h-3.5 w-3.5" />复制创建</Button>
          : <Button size="sm" variant="outline" onClick={() => onEdit(role)}><Pencil className="mr-1.5 h-3.5 w-3.5" />编辑</Button>}
        {!role.builtIn && role.enabled !== false && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDisable(role)}>停用</Button>}
      </div>
    </>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function groupPermissions(permissions: string[]): { category: string; items: string[] }[] {
  const buckets = new Map<string, string[]>();
  for (const key of permissions) {
    const category = permissionCategoryOf(key);
    const list = buckets.get(category) || [];
    list.push(key);
    buckets.set(category, list);
  }
  return CATEGORY_ORDER
    .filter((category) => buckets.has(category))
    .map((category) => ({
      category,
      items: (buckets.get(category) || []).sort((a, b) => capabilityIndex(a) - capabilityIndex(b)),
    }));
}

function capabilityIndex(key: string): number {
  const index = CAPABILITY_ORDER.indexOf(key);
  return index === -1 ? CAPABILITY_ORDER.length : index;
}

'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Copy, KeyRound, Pencil, Plus, RefreshCw, Search, Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIamDisableRoleTemplate, useIamResourceTypes, useIamRoleTemplates } from '@/hooks/use-iam';
import type { IamRoleTemplate } from '@/lib/api/types';
import { permissionLabel, resourceLabel } from '@/lib/authz/schema-summary';
import { roleScopeDescription } from '@/lib/authz/role-capabilities';
import { RoleEditorDialog } from './role-editor-dialog';

export function RoleLibrary({ onAssign }: { onAssign: () => void }) {
  const rolesQuery = useIamRoleTemplates();
  const resourceTypesQuery = useIamResourceTypes();
  const disableRole = useIamDisableRoleTemplate();
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<IamRoleTemplate | null>(null);
  const [copyRole, setCopyRole] = useState<IamRoleTemplate | null>(null);
  const roles = useMemo(() => rolesQuery.data?.roleTemplates || [], [rolesQuery.data?.roleTemplates]);
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roles
      .filter((role) => !normalized || `${role.displayName} ${role.roleKey} ${role.resourceType}`.toLowerCase().includes(normalized))
      .sort((left, right) => Number(right.builtIn) - Number(left.builtIn) || (left.displayName || left.roleKey).localeCompare(right.displayName || right.roleKey));
  }, [query, roles]);
  const adminRoles = filtered.filter((role) => role.resourceType === 'zone' || role.roleKey.startsWith('platform_') || role.roleKey.startsWith('zone_'));
  const resourceRoles = filtered.filter((role) => !adminRoles.includes(role));

  const openCreate = () => {
    setEditingRole(null);
    setCopyRole(null);
    setEditorOpen(true);
  };

  const disable = async (role: IamRoleTemplate) => {
    const count = role.activeGrantCount || 0;
    if (!window.confirm(count > 0 ? `这个角色仍有 ${count} 个有效分配。停用后只会阻止新增分配，已有访问继续生效。继续吗？` : '停用这个自定义角色？')) return;
    try {
      await disableRole.mutateAsync({ id: role.id, expectedVersion: role.version || 1, confirmActiveGrants: count > 0 });
      toast.success('角色已停用');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '停用角色失败');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">角色库</h2>
          <p className="text-sm text-muted-foreground">角色回答“能做什么”，分配时再决定“在哪个范围、给谁”。</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />创建自定义角色</Button>
      </div>

      <Card className="gap-4 py-4">
        <CardContent className="space-y-4 px-4 sm:px-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索角色、资源类型或 role key" className="pl-9" />
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm">
            <div className="font-medium text-violet-700 dark:text-violet-300">组织管理员通过继承管理用户组</div>
            <div className="mt-1 text-xs text-muted-foreground">只在组织上分配一次，不会复制成每个用户组的直属管理员；用户组页面应标记为“继承获得”。</div>
          </div>
        </CardContent>
      </Card>

      {rolesQuery.isError && (
        <Card role="alert" className="border-destructive/35 bg-destructive/[0.04]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h3 className="font-medium">角色加载失败</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rolesQuery.error instanceof Error ? rolesQuery.error.message : '无法读取角色库，请稍后重试。'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => rolesQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />重试
            </Button>
          </CardContent>
        </Card>
      )}

      {!rolesQuery.isError && (
        <>
          <RoleSection title="管理作用域角色" description="平台、组织和用户组级管理员角色。平台角色必须显式分配。" roles={adminRoles} onAssign={onAssign} onEdit={(role) => { setEditingRole(role); setCopyRole(null); setEditorOpen(true); }} onCopy={(role) => { setCopyRole(role); setEditingRole(null); setEditorOpen(true); }} onDisable={disable} />
          <RoleSection title="业务资源角色" description="用于项目、Skill、Agent、仓库、运行环境等具体资源。" roles={resourceRoles} onAssign={onAssign} onEdit={(role) => { setEditingRole(role); setCopyRole(null); setEditorOpen(true); }} onCopy={(role) => { setCopyRole(role); setEditingRole(null); setEditorOpen(true); }} onDisable={disable} />
        </>
      )}

      <RoleEditorDialog open={editorOpen} onOpenChange={setEditorOpen} role={editingRole} copyFrom={copyRole} resourceTypes={resourceTypes} />
    </section>
  );
}

function RoleSection({ title, description, roles, onAssign, onEdit, onCopy, onDisable }: {
  title: string;
  description: string;
  roles: IamRoleTemplate[];
  onAssign: () => void;
  onEdit: (role: IamRoleTemplate) => void;
  onCopy: (role: IamRoleTemplate) => void;
  onDisable: (role: IamRoleTemplate) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">没有匹配的角色。</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {roles.map((role) => <RoleCard key={role.id} role={role} onAssign={onAssign} onEdit={() => onEdit(role)} onCopy={() => onCopy(role)} onDisable={() => onDisable(role)} />)}
        </div>
      )}
    </div>
  );
}

function RoleCard({ role, onAssign, onEdit, onCopy, onDisable }: { role: IamRoleTemplate; onAssign: () => void; onEdit: () => void; onCopy: () => void; onDisable: () => void }) {
  const permissions = role.permissions || [];
  return (
    <Card className="gap-4 py-5 transition-colors hover:border-violet-500/35">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">{role.builtIn ? <Shield className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{role.displayName || role.roleKey}</CardTitle>
              <CardDescription className="mt-1 font-mono text-[11px]">{role.roleKey}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            <Badge variant={role.builtIn ? 'secondary' : 'outline'}>{role.builtIn ? '内置' : '自定义'}</Badge>
            {role.enabled === false && <Badge variant="destructive">已停用</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">生效资源</span><span className="font-medium">{resourceLabel(role.resourceType || '')}</span></div>
        <p className="min-h-9 text-xs leading-5 text-muted-foreground">{roleScopeDescription(role.roleKey)}</p>
        <div className="flex min-h-7 flex-wrap gap-1.5">
          {(permissions.length ? permissions : role.relation ? [role.relation] : []).slice(0, 5).map((permission) => <Badge key={permission} variant="outline" className="font-normal">{permissionLabel(permission)}</Badge>)}
          {permissions.length > 5 && <Badge variant="outline">+{permissions.length - 5}</Badge>}
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground"><span>{role.activeGrantCount || 0} 个有效分配</span><span>v{role.version || 1}</span></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onAssign} disabled={role.enabled === false}><UserPlus className="mr-1.5 h-3.5 w-3.5" />分配</Button>
          {role.builtIn ? <Button size="sm" variant="outline" onClick={onCopy}><Copy className="mr-1.5 h-3.5 w-3.5" />复制创建</Button> : <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" />编辑</Button>}
          {!role.builtIn && role.enabled !== false && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onDisable}>停用</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

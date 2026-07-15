'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, KeyRound, Plus, RefreshCw, Search, Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { useIamDisableRoleTemplate, useIamResourceTypes, useIamRoleTemplates } from '@/hooks/use-iam';
import type { IamRoleTemplate } from '@/lib/api/types';
import { resourceLabel } from '@/lib/authz/schema-summary';
import { roleScopeDescription } from '@/lib/authz/role-capabilities';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { RoleDetailSheet } from './role-detail-sheet';
import { RoleEditorDialog } from './role-editor-dialog';

export function RoleLibrary({ onAssign }: { onAssign: () => void }) {
  const rolesQuery = useIamRoleTemplates();
  const resourceTypesQuery = useIamResourceTypes();
  const disableRole = useIamDisableRoleTemplate();
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<IamRoleTemplate | null>(null);
  const [copyRole, setCopyRole] = useState<IamRoleTemplate | null>(null);
  const [detailRole, setDetailRole] = useState<IamRoleTemplate | null>(null);
  const [disableTarget, setDisableTarget] = useState<IamRoleTemplate | null>(null);
  const roles = useMemo(() => rolesQuery.data?.roleTemplates || [], [rolesQuery.data?.roleTemplates]);
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return roles
      .filter((role) => !normalized || `${role.displayName} ${role.roleKey} ${role.resourceType}`.toLowerCase().includes(normalized))
      .sort((left, right) => Number(right.builtIn) - Number(left.builtIn) || (left.displayName || left.roleKey).localeCompare(right.displayName || right.roleKey));
  }, [query, roles]);

  // Group roles by resource type, ordered by the resource hierarchy.
  const grouped = useMemo(() => {
    const map = new Map<string, IamRoleTemplate[]>();
    for (const role of filtered) {
      const key = role.resourceType || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(role);
    }
    const order = ['zone', 'group', 'iam_authz', 'iam', 'organization', 'project',
      'skill_space', 'skill', 'git_namespace', 'git_repository',
      'agent_space', 'agent', 'tool_space', 'tool',
      'sandbox_space', 'sandbox', 'runtime_environment', 'deployment'];
    return [...map.entries()]
      .sort((a, b) => {
        const ai = order.indexOf(a[0]), bi = order.indexOf(b[0]);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([type, groupRoles]) => ({
        type,
        label: resourceLabel(type),
        roles: groupRoles.sort((l, r) => Number(r.builtIn) - Number(l.builtIn) || (l.displayName || l.roleKey).localeCompare(r.displayName || r.roleKey)),
      }));
  }, [filtered]);

  const openCreate = () => {
    setEditingRole(null);
    setCopyRole(null);
    setEditorOpen(true);
  };

  const disable = (role: IamRoleTemplate) => setDisableTarget(role);

  const confirmDisable = async () => {
    const role = disableTarget;
    if (!role) return;
    const count = role.activeGrantCount || 0;
    try {
      await disableRole.mutateAsync({ id: role.id, expectedVersion: role.version || 1, confirmActiveGrants: count > 0 });
      toast.success('角色已停用');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '停用角色失败');
    } finally {
      setDisableTarget(null);
    }
  };

  const editFromDetail = (role: IamRoleTemplate) => {
    setDetailRole(null);
    setEditingRole(role);
    setCopyRole(null);
    setEditorOpen(true);
  };

  const copyFromDetail = (role: IamRoleTemplate) => {
    setDetailRole(null);
    setCopyRole(role);
    setEditingRole(null);
    setEditorOpen(true);
  };

  const assignFromDetail = () => {
    setDetailRole(null);
    onAssign();
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
        <CardContent className="px-4 sm:px-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索角色、资源类型或 role key" className="pl-9" />
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
        <div className="space-y-2">
          {grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">没有匹配的角色。</div>
          ) : grouped.map(({ type, label, roles: groupRoles }) => (
            <Collapsible key={type} defaultOpen className="rounded-xl border bg-card/60">
              <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/30 [&[data-state=open]>svg:last-child]:rotate-180">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Shield className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 font-semibold">{label}</span>
                <Badge variant="secondary" className="shrink-0">{groupRoles.length}</Badge>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t px-4 py-3">
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {groupRoles.map((role) => <RoleCard key={role.id} role={role} onAssign={onAssign} onDetail={() => setDetailRole(role)} />)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <RoleEditorDialog open={editorOpen} onOpenChange={setEditorOpen} role={editingRole} copyFrom={copyRole} resourceTypes={resourceTypes} />

      <RoleDetailSheet
        role={detailRole}
        open={Boolean(detailRole)}
        onOpenChange={(open) => { if (!open) setDetailRole(null); }}
        onAssign={assignFromDetail}
        onEdit={editFromDetail}
        onCopy={copyFromDetail}
        onDisable={(role) => { setDetailRole(null); setDisableTarget(role); }}
      />

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onOpenChange={(open) => { if (!open) setDisableTarget(null); }}
        title="停用自定义角色"
        description={disableTarget && (disableTarget.activeGrantCount || 0) > 0
          ? `这个角色仍有 ${disableTarget.activeGrantCount} 个有效分配。停用后只会阻止新增分配，已有访问继续生效。继续吗？`
          : '停用这个自定义角色？'}
        confirmLabel="停用"
        variant="destructive"
        onConfirm={confirmDisable}
      />
    </section>
  );
}

function RoleCard({ role, onAssign, onDetail }: { role: IamRoleTemplate; onAssign: () => void; onDetail: () => void }) {
  return (
    <Card className="gap-0 py-0 transition-colors hover:border-violet-500/35">
      <button type="button" onClick={onDetail} className="flex w-full flex-1 items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">{role.builtIn ? <Shield className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</span>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{role.displayName || role.roleKey}</CardTitle>
          <p className="mt-1 truncate text-xs text-muted-foreground">{roleScopeDescription(role.roleKey)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={role.builtIn ? 'secondary' : 'outline'}>{role.builtIn ? '内置' : '自定义'}</Badge>
            {role.enabled === false && <Badge variant="destructive">已停用</Badge>}
            <span className="text-xs text-muted-foreground">{role.activeGrantCount || 0} 个分配</span>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60" />
      </button>
      <CardContent className="border-t px-4 py-2.5">
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onAssign} disabled={role.enabled === false}><UserPlus className="mr-1.5 h-3.5 w-3.5" />分配</Button>
      </CardContent>
    </Card>
  );
}

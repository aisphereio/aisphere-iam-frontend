'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2, GitBranch, Plus, RefreshCw, Save, Trash2, X,
  ChevronDown, ChevronRight, Folder, FolderOpen,
  UserMinus, UserPlus, CornerDownRight, Network, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMe } from '@/hooks/use-auth';
import {
  useIamAssignUserToGroup, useIamCreateGroup, useIamDeleteGroup,
  useIamDirectoryGroups, useIamDirectoryOrganization,
  useIamExternalUsers, useIamRemoveUserFromGroup, useIamUpdateGroup,
} from '@/hooks/use-iam';
import type { IamGroup, IamPrincipal, IamUser } from '@/lib/api/types';

type OrganizationForm = {
  name: string;
  displayName: string;
  type: string;
};

const emptyForm: OrganizationForm = { name: '', displayName: '', type: 'Physical' };

function defaultZoneFromPrincipal(principal?: IamPrincipal): string {
  const candidates = [
    process.env.NEXT_PUBLIC_CASDOOR_ORG,
    process.env.NEXT_PUBLIC_DEFAULT_ORG_ID,
    principal?.orgId,
    principal?.tenantId,
    'aisphere',
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return 'aisphere';
}

function groupID(group?: IamGroup | null): string {
  return group?.id || group?.externalId || group?.name || '';
}

function userID(user?: IamUser | null): string {
  return user?.id || user?.externalId || user?.username || '';
}

function userLabel(user?: IamUser | null): string {
  if (!user) return '';
  const name = user.displayName || user.username || user.email || user.id || user.externalId;
  const suffix = user.email && user.email !== name ? ` · ${user.email}` : '';
  return `${name}${suffix}`;
}

function groupLabel(group?: IamGroup | null): string {
  if (!group) return '';
  return group.displayName || group.name || group.id || '';
}

function parentKey(group: IamGroup, userSourceId: string): string {
  const parent = group.parentId?.trim();
  return (!parent || parent === userSourceId) ? '' : parent;
}

function isTopLevelOrganization(group: IamGroup, userSourceId: string): boolean {
  return parentKey(group, userSourceId) === '';
}

function buildChildrenMap(groups: IamGroup[], userSourceId: string): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  for (const group of groups) {
    const parent = parentKey(group, userSourceId);
    const bucket = map.get(parent) || [];
    bucket.push(group);
    map.set(parent, bucket);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
  }
  return map;
}

function buildGroupMap(groups: IamGroup[]): Map<string, IamGroup> {
  const map = new Map<string, IamGroup>();
  for (const group of groups) {
    const id = groupID(group);
    if (id) map.set(id, group);
  }
  return map;
}

function buildGroupPath(group: IamGroup | null, groupMap: Map<string, IamGroup>, rootLabel: string): string[] {
  if (!group) return [rootLabel];
  const path: string[] = [];
  const seen = new Set<string>();
  let current: IamGroup | undefined = group;
  while (current) {
    const id = groupID(current);
    if (!id || seen.has(id)) break;
    seen.add(id);
    path.unshift(groupLabel(current));
    current = current.parentId ? groupMap.get(current.parentId) : undefined;
  }
  return [rootLabel, ...path];
}

/** Collect all descendants of the given group id (DFS, includes no descendants of the root id itself). */
function collectDescendants(
  groupId: string,
  childrenMap: Map<string, IamGroup[]>,
): Array<{ group: IamGroup; depth: number }> {
  const out: Array<{ group: IamGroup; depth: number }> = [];
  const stack: Array<{ id: string; depth: number }> = [{ id: groupId, depth: 0 }];
  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      out.push({ group: child, depth: depth + 1 });
      stack.push({ id: groupID(child), depth: depth + 1 });
    }
  }
  return out;
}

// ─── Tree row with explicit connector lines ─────────────────────────────
function GroupTreeRows({
  parentId,
  depth,
  childrenMap,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string, IamGroup[]>;
  selectedId: string;
  onSelect: (group: IamGroup) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const rows = childrenMap.get(parentId) || [];
  return (
    <>
      {rows.map((group, idx) => {
        const id = groupID(group);
        const active = selectedId === id;
        const childCount = childrenMap.get(id)?.length || 0;
        const isExpanded = expandedIds.has(id);
        const isLast = idx === rows.length - 1;
        return (
          <div key={id} className="relative">
            <button
              className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                active
                  ? 'bg-accent text-foreground shadow-sm ring-1 ring-violet-500/30'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
              style={{ paddingLeft: 8 + depth * 22 }}
              onClick={() => onSelect(group)}
            >
              {childCount > 0 ? (
                <span
                  className="h-4 w-4 flex items-center justify-center shrink-0 cursor-pointer rounded hover:bg-accent"
                  onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3 transition-transform" />
                    : <ChevronRight className="h-3 w-3 transition-transform" />}
                </span>
              ) : (
                <span className="w-4 shrink-0 flex items-center justify-center">
                  <CornerDownRight className="h-3 w-3 text-muted-foreground/50" />
                </span>
              )}
              {childCount > 0 ? (
                isExpanded
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              )}
              <span className="truncate font-medium">{groupLabel(group)}</span>
              {group.type ? <Badge variant="outline" className="text-[9px] ml-1">{group.type}</Badge> : null}
              {childCount > 0 ? (
                <Badge variant="secondary" className="ml-auto text-[9px] tabular-nums">{childCount}</Badge>
              ) : null}
            </button>
            {isExpanded && childCount > 0 ? (
              <GroupTreeRows
                parentId={id}
                depth={depth + 1}
                childrenMap={childrenMap}
                selectedId={selectedId}
                onSelect={onSelect}
                expandedIds={expandedIds}
                onToggle={onToggle}
              />
            ) : null}
            {/* Vertical connector line for siblings below */}
            {!isLast && depth > 0 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-muted/40"
                style={{ marginLeft: 8 + (depth - 1) * 22 + 11 }}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

// ─── Nested card visualization for "下级组织" ────────────────────────────
function NestedChildCards({
  parentId,
  depth,
  childrenMap,
  groupMap,
  selectedId,
  onSelect,
  rootLabel,
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string, IamGroup[]>;
  groupMap: Map<string, IamGroup>;
  selectedId: string;
  onSelect: (group: IamGroup) => void;
  rootLabel: string;
}) {
  const children = childrenMap.get(parentId) || [];
  if (children.length === 0) {
    return depth === 0 ? (
      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        当前节点下暂无子组织。点击上方"新建子组织"开始构建层级。
      </div>
    ) : null;
  }
  return (
    <div className={depth === 0 ? 'space-y-2' : 'mt-2 space-y-2'}>
      {children.map((group) => {
        const id = groupID(group);
        const active = selectedId === id;
        const grandKids = childrenMap.get(id)?.length || 0;
        const path = buildGroupPath(group, groupMap, rootLabel).join(' / ');
        return (
          <div
            key={id}
            className={`rounded-md border transition-colors ${
              active ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20' : 'border-border bg-card/40'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(group)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60 text-[10px] font-mono text-muted-foreground shrink-0"
                style={{ marginLeft: Math.min(depth, 4) * 6 }}
              >
                L{depth + 1}
              </span>
              {grandKids > 0 ? (
                <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{groupLabel(group)}</div>
                <div className="text-[10px] text-muted-foreground truncate">{path}</div>
              </div>
              {group.type ? <Badge variant="outline" className="text-[9px]">{group.type}</Badge> : null}
              {grandKids > 0 ? (
                <Badge variant="secondary" className="text-[9px] tabular-nums">{grandKids} 子</Badge>
              ) : null}
              {group.users?.length ? (
                <Badge variant="outline" className="text-[9px] tabular-nums">{group.users.length} 人</Badge>
              ) : null}
            </button>
            {grandKids > 0 ? (
              <div className="border-t border-dashed border-border/60 px-3 pb-2">
                <NestedChildCards
                  parentId={id}
                  depth={depth + 1}
                  childrenMap={childrenMap}
                  groupMap={groupMap}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  rootLabel={rootLabel}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function GroupsPage({ identityOrg: identityOrgProp }: { identityOrg?: string }) {
  const { data: me } = useMe();
  const [selectedGroup, setSelectedGroup] = useState<IamGroup | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [form, setForm] = useState<OrganizationForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree');

  const zoneId = identityOrgProp?.trim() || defaultZoneFromPrincipal(me);
  const { data: zone } = useIamDirectoryOrganization(zoneId);
  const { data, isLoading, isFetching, error, refetch } = useIamDirectoryGroups(zoneId);
  const selectedId = groupID(selectedGroup);
  const { data: allUsersData } = useIamExternalUsers(zoneId, { pageSize: 500 });
  const { data: selectedGroupUsersData, refetch: refetchSelectedGroupUsers } = useIamExternalUsers(
    zoneId,
    selectedId ? { groupId: selectedId, pageSize: 500 } : { pageSize: 0 },
  );
  const createGroup = useIamCreateGroup();
  const updateGroup = useIamUpdateGroup();
  const deleteGroup = useIamDeleteGroup();
  const assignUser = useIamAssignUserToGroup();
  const removeUser = useIamRemoveUserFromGroup();

  const groups = data?.groups || [];
  const childrenMap = useMemo(() => buildChildrenMap(groups, zoneId), [groups, zoneId]);
  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);
  const rootGroups = childrenMap.get('') || [];
  const childGroups = selectedId ? (childrenMap.get(selectedId) || []) : rootGroups;
  const rootLabel = zone?.displayName || zone?.name || zoneId;
  const selectedPath = buildGroupPath(selectedGroup, groupMap, rootLabel);
  const topLevelOrganizationCount = groups.filter((group) => isTopLevelOrganization(group, zoneId)).length;
  const childOrganizationCount = groups.length - topLevelOrganizationCount;
  const allUsers = allUsersData?.users || [];
  const selectedGroupUsers = selectedGroup ? (selectedGroupUsersData?.users || []) : [];
  const selectedGroupUserIds = new Set(selectedGroupUsers.map(userID).filter(Boolean));
  const assignableUsers = allUsers.filter((user) => !selectedGroupUserIds.has(userID(user)));

  // Auto-expand root-level groups on first load so the hierarchy is visible.
  useEffect(() => {
    if (rootGroups.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set(rootGroups.map(groupID).filter(Boolean)));
    }
  }, [rootGroups, expandedIds.size]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    for (const group of groups) {
      const id = groupID(group);
      if (id && childrenMap.has(id)) all.add(id);
    }
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const handleSelectRoot = () => {
    setSelectedGroup(null);
    setSelectedUserId('');
    resetForm();
  };

  const handleSelect = (group: IamGroup) => {
    setSelectedGroup(group);
    setSelectedUserId('');
    setForm({ name: group.name || '', displayName: group.displayName || '', type: group.type || 'Physical' });
    setEditing(false);
    // Auto-expand the selected group so its children are visible.
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(groupID(group));
      return next;
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('组织名称不能为空');
      return;
    }
    try {
      await createGroup.mutateAsync({
        orgId: zoneId,
        parentId: selectedGroup ? groupID(selectedGroup) : undefined,
        name: form.name.trim(),
        displayName: form.displayName.trim() || undefined,
        type: form.type.trim() || 'Physical',
      });
      toast.success(selectedGroup ? '子组织已创建' : '顶级组织已创建');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建组织失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!form.name.trim()) {
      toast.error('组织名称不能为空');
      return;
    }
    try {
      await updateGroup.mutateAsync({
        orgId: zoneId,
        groupId: groupID(selectedGroup),
        parentId: selectedGroup.parentId || undefined,
        name: form.name.trim(),
        displayName: form.displayName.trim() || undefined,
        type: form.type.trim() || selectedGroup.type || 'Physical',
      });
      toast.success('组织已更新');
      setEditing(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新组织失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteGroup.mutateAsync({ orgId: zoneId, groupId: groupID(selectedGroup), recursive: false });
      toast.success('组织已删除');
      setSelectedGroup(null);
      setSelectedUserId('');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除组织失败');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedGroup || !selectedUserId) return;
    try {
      await assignUser.mutateAsync({ orgId: zoneId, groupId: selectedId, userId: selectedUserId });
      toast.success('用户已加入当前组织');
      setSelectedUserId('');
      await refetch();
      await refetchSelectedGroupUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加入组织失败');
    }
  };

  const handleRemoveUser = async (user: IamUser) => {
    if (!selectedGroup) return;
    const id = userID(user);
    if (!id) return;
    try {
      await removeUser.mutateAsync({ orgId: zoneId, groupId: selectedId, userId: id });
      toast.success('用户已移出当前组织');
      await refetch();
      await refetchSelectedGroupUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移出组织失败');
    }
  };

  // Build the flattened descendants table for the "下级组织（含子级）" view
  const descendantRows = useMemo(() => {
    if (!selectedId) {
      return rootGroups.map((g) => ({ group: g, depth: 0 }));
    }
    return collectDescendants(selectedId, childrenMap);
  }, [selectedId, rootGroups, childrenMap]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4" />
              组织结构
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              用户源作为根节点，下方是多层级的组织树。
              <span className="text-foreground/70"> 父子关系通过 Casdoor 多级 group 承载。</span>
              点击节点查看详情，点击三角展开/折叠子组织。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="顶级组织" value={topLevelOrganizationCount} />
              <Metric label="子组织" value={childOrganizationCount} />
              <Metric label="总组织" value={groups.length} />
            </div>

            <div className="rounded-md border bg-muted/20 p-2">
              {/* Root node (user source) */}
              <button
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium ${
                  !selectedGroup
                    ? 'bg-accent text-foreground shadow-sm ring-1 ring-violet-500/30'
                    : 'bg-muted hover:bg-accent/60'
                }`}
                onClick={handleSelectRoot}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="truncate">{rootLabel}</span>
                <Badge variant="outline" className="ml-auto text-[9px]">用户源 / Zone</Badge>
              </button>
              {groups.length > 0 ? (
                <div className="flex items-center gap-1 mb-1 px-1">
                  <button onClick={expandAll} className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent/60">展开全部</button>
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <button onClick={collapseAll} className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent/60">折叠全部</button>
                  <span className="ml-auto text-[10px] text-muted-foreground/70">{expandedIds.size} 已展开</span>
                </div>
              ) : null}
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : groups.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无组织</div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  <GroupTreeRows
                    parentId=""
                    depth={0}
                    childrenMap={childrenMap}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    expandedIds={expandedIds}
                    onToggle={toggleExpand}
                  />
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                加载组织结构失败：{error instanceof Error ? error.message : 'unknown error'}
              </div>
            ) : null}

            <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              刷新组织结构
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                {selectedGroup ? '组织管理' : '用户源根节点'}
              </span>
              <Badge variant="secondary">{groups.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              <span className="text-foreground/70">当前路径：</span>
              <span className="font-mono text-[11px]">
                {selectedPath.map((p, i) => (
                  <span key={i}>
                    {i > 0 ? <span className="text-muted-foreground/60"> › </span> : null}
                    {p}
                  </span>
                ))}
              </span>
              <br />
              未选中组织时，新建的是无父组织的顶级组织；选中组织后，新建的是它的子组织。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">组织名称 *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" placeholder="platform" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">显示名</label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-8 text-xs" placeholder="平台组织" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">组织类型</label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-8 text-xs" placeholder="Physical" />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button size="sm" className="h-8" onClick={handleCreate} disabled={createGroup.isPending}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {selectedGroup ? '新建子组织' : '新建顶级组织'}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleUpdate} disabled={!selectedGroup || updateGroup.isPending}>
                <Save className="mr-1 h-3.5 w-3.5" />
                更新选中组织
              </Button>
              <Button size="sm" variant="destructive" className="h-8" onClick={handleDelete} disabled={!selectedGroup || deleteGroup.isPending}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除选中组织
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={handleSelectRoot}>
                <X className="mr-1 h-3.5 w-3.5" />
                回到用户源根节点
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>成员管理</span>
              {selectedGroup ? (
                <Badge variant="outline" className="text-[10px]">{selectedGroupUsers.length} 人</Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedGroup
                ? `把用户加入 ${groupLabel(selectedGroup)}，或从该组织移除。`
                : '先在左侧选择一个组织，再管理成员。'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={!selectedGroup || assignableUsers.length === 0}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder={selectedGroup ? '选择要加入的用户' : '请选择组织'} />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((user) => {
                    const id = userID(user);
                    return id ? <SelectItem key={id} value={id}>{userLabel(user)}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" disabled={!selectedGroup || !selectedUserId || assignUser.isPending} onClick={handleAssignUser}>
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                加入当前组织
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">用户名</TableHead>
                  <TableHead className="text-xs">显示名</TableHead>
                  <TableHead className="text-xs">邮箱</TableHead>
                  <TableHead className="text-xs">外部 ID</TableHead>
                  <TableHead className="text-xs">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedGroup ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">请选择组织</TableCell></TableRow>
                ) : selectedGroupUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">当前组织暂无成员</TableCell></TableRow>
                ) : selectedGroupUsers.map((user) => {
                  const id = userID(user);
                  return (
                    <TableRow key={id || user.username}>
                      <TableCell className="text-xs font-medium">{user.username || '-'}</TableCell>
                      <TableCell className="text-xs">{user.displayName || '-'}</TableCell>
                      <TableCell className="text-xs">{user.email || '-'}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">{user.externalId || user.id || '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!id || removeUser.isPending} onClick={() => handleRemoveUser(user)}>
                          <UserMinus className="mr-1 h-3.5 w-3.5" />
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                {selectedGroup ? `${groupLabel(selectedGroup)} 的下级组织` : '用户源下的顶级组织'}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={viewMode === 'tree' ? 'default' : 'outline'}
                  className="h-6 text-[10px] px-2"
                  onClick={() => setViewMode('tree')}
                >
                  树状视图
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  className="h-6 text-[10px] px-2"
                  onClick={() => setViewMode('cards')}
                >
                  嵌套卡片
                </Button>
              </div>
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedGroup
                ? `显示 ${groupLabel(selectedGroup)} 下所有层级的子孙组织（共 ${descendantRows.length} 个）。`
                : `显示当前用户源下所有层级的组织（共 ${descendantRows.length} 个）。`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === 'cards' ? (
              <NestedChildCards
                parentId={selectedId}
                depth={0}
                childrenMap={childrenMap}
                groupMap={groupMap}
                selectedId={selectedId}
                onSelect={handleSelect}
                rootLabel={rootLabel}
              />
            ) : descendantRows.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                暂无下级组织。点击上方"新建子组织"开始构建层级。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">层级</TableHead>
                    <TableHead className="text-xs">名称</TableHead>
                    <TableHead className="text-xs">显示名</TableHead>
                    <TableHead className="text-xs">层级路径</TableHead>
                    <TableHead className="text-xs">类型</TableHead>
                    <TableHead className="text-xs">成员数</TableHead>
                    <TableHead className="text-xs">子组织数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descendantRows.map(({ group, depth }) => {
                    const id = groupID(group);
                    const path = buildGroupPath(group, groupMap, rootLabel).join(' / ');
                    return (
                      <TableRow
                        key={id}
                        className={`cursor-pointer ${selectedId === id ? 'bg-accent/40' : ''}`}
                        onClick={() => handleSelect(group)}
                      >
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[9px] font-mono">L{depth + 1}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <span style={{ paddingLeft: depth * 12 }} className="inline-flex items-center gap-1">
                            {depth > 0 ? <CornerDownRight className="h-3 w-3 text-muted-foreground/60" /> : null}
                            {group.name || group.id}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{group.displayName || '-'}</TableCell>
                        <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground">{path}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{group.type || '-'}</Badge></TableCell>
                        <TableCell className="text-xs">{group.users?.length || 0}</TableCell>
                        <TableCell className="text-xs">{childrenMap.get(id)?.length || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card/50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Building2, GitBranch, Plus, RefreshCw, Save, Trash2, X, ChevronDown, Folder, FolderOpen, UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMe } from '@/hooks/use-auth';
import { useIamAssignUserToGroup, useIamCreateGroup, useIamDeleteGroup, useIamDirectoryGroups, useIamDirectoryOrganization, useIamExternalUsers, useIamRemoveUserFromGroup, useIamUpdateGroup } from '@/hooks/use-iam';
import type { IamGroup, IamPrincipal, IamUser } from '@/lib/api/types';

type GroupForm = {
  name: string;
  displayName: string;
  type: string;
};

const emptyForm: GroupForm = { name: '', displayName: '', type: 'Virtual' };

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
  return group.displayName || group.name || group.id;
}

function buildChildrenMap(groups: IamGroup[], orgId: string): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  for (const group of groups) {
    const parent = (!group.parentId || group.parentId === orgId) ? '' : group.parentId;
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
      {rows.map((group) => {
        const id = groupID(group);
        const active = selectedId === id;
        const childCount = childrenMap.get(id)?.length || 0;
        const isExpanded = expandedIds.has(id);
        return (
          <div key={id}>
            <button
              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                active
                  ? 'bg-accent text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => onSelect(group)}
            >
              {childCount > 0 ? (
                <span
                  className="h-4 w-4 flex items-center justify-center shrink-0 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </span>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              {childCount > 0 ? (
                isExpanded ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{groupLabel(group)}</span>
              {childCount > 0 ? <Badge variant="secondary" className="ml-auto text-[9px]">{childCount}</Badge> : null}
              {group.type ? <Badge variant="outline" className="text-[9px]">{group.type}</Badge> : null}
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
          </div>
        );
      })}
    </>
  );
}

export function GroupsPage({ identityOrg: identityOrgProp }: { identityOrg?: string }) {
  const { data: me } = useMe();
  const [selectedGroup, setSelectedGroup] = useState<IamGroup | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const zoneId = identityOrgProp?.trim() || defaultZoneFromPrincipal(me);
  const { data: zone } = useIamDirectoryOrganization(zoneId);
  const { data, isLoading, isFetching, error, refetch } = useIamDirectoryGroups(zoneId);
  const selectedId = groupID(selectedGroup);
  const { data: allUsersData } = useIamExternalUsers(zoneId, { pageSize: 500 });
  const { data: selectedGroupUsersData, refetch: refetchSelectedGroupUsers } = useIamExternalUsers(zoneId, selectedId ? { groupId: selectedId, pageSize: 500 } : { pageSize: 0 });
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
  const nestedGroupCount = groups.filter((group) => group.parentId && group.parentId !== zoneId).length;
  const allUsers = allUsersData?.users || [];
  const selectedGroupUsers = selectedGroup ? (selectedGroupUsersData?.users || []) : [];
  const selectedGroupUserIds = new Set(selectedGroupUsers.map(userID).filter(Boolean));
  const assignableUsers = allUsers.filter((user) => !selectedGroupUserIds.has(userID(user)));

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
    setForm({ name: group.name || '', displayName: group.displayName || '', type: group.type || 'Virtual' });
    setEditing(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('组织/用户组名称不能为空');
      return;
    }
    try {
      await createGroup.mutateAsync({
        orgId: zoneId,
        parentId: selectedGroup ? groupID(selectedGroup) : undefined,
        name: form.name.trim(),
        displayName: form.displayName.trim() || undefined,
        type: form.type.trim() || 'Virtual',
      });
      toast.success(selectedGroup ? '子组织/用户组已创建' : '一级组织/用户组已创建');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建组织/用户组失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!form.name.trim()) {
      toast.error('组织/用户组名称不能为空');
      return;
    }
    try {
      await updateGroup.mutateAsync({
        orgId: zoneId,
        groupId: groupID(selectedGroup),
        parentId: selectedGroup.parentId || undefined,
        name: form.name.trim(),
        displayName: form.displayName.trim() || undefined,
        type: form.type.trim() || selectedGroup.type || 'Virtual',
      });
      toast.success('组织/用户组已更新');
      setEditing(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新组织/用户组失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteGroup.mutateAsync({ orgId: zoneId, groupId: groupID(selectedGroup), recursive: false });
      toast.success('组织/用户组已删除');
      setSelectedGroup(null);
      setSelectedUserId('');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除组织/用户组失败');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedGroup || !selectedUserId) return;
    try {
      await assignUser.mutateAsync({ orgId: zoneId, groupId: selectedId, userId: selectedUserId });
      toast.success('用户已加入当前组织/用户组');
      setSelectedUserId('');
      await refetch();
      await refetchSelectedGroupUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加入组织/用户组失败');
    }
  };

  const handleRemoveUser = async (user: IamUser) => {
    if (!selectedGroup) return;
    const id = userID(user);
    if (!id) return;
    try {
      await removeUser.mutateAsync({ orgId: zoneId, groupId: selectedId, userId: id });
      toast.success('用户已移出当前组织/用户组');
      await refetch();
      await refetchSelectedGroupUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移出组织/用户组失败');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              组织结构
            </CardTitle>
            <CardDescription className="text-xs">
              IAM 组织结构基于用户源的多级 group 表达；根节点是用户源，子节点是平台组织/部门/用户组。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="一级节点" value={rootGroups.length} />
              <Metric label="子级节点" value={nestedGroupCount} />
              <Metric label="总节点" value={groups.length} />
            </div>

            <div className="rounded-md border p-2">
              <button
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium ${!selectedGroup ? 'bg-accent text-foreground shadow-sm' : 'bg-muted hover:bg-accent/60'}`}
                onClick={handleSelectRoot}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{rootLabel}</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">用户源</Badge>
              </button>
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : groups.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无组织/用户组节点</div>
              ) : (
                <GroupTreeRows
                  parentId=""
                  depth={0}
                  childrenMap={childrenMap}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                />
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
              <span>{selectedGroup ? '组织/用户组管理' : '用户源根节点'}</span>
              <Badge variant="secondary">{groups.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              当前路径：{selectedPath.join(' / ')}。未选中节点时，新建的是用户源下的一级组织/用户组；选中节点后，新建的是它的子节点。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">节点名称 *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" placeholder="platform" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">显示名</label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-8 text-xs" placeholder="平台组织" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">类型</label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-8 text-xs" placeholder="Virtual" />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button size="sm" className="h-8" onClick={handleCreate} disabled={createGroup.isPending}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {selectedGroup ? '新建子节点' : '新建一级节点'}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleUpdate} disabled={!selectedGroup || updateGroup.isPending}>
                <Save className="mr-1 h-3.5 w-3.5" />
                更新选中节点
              </Button>
              <Button size="sm" variant="destructive" className="h-8" onClick={handleDelete} disabled={!selectedGroup || deleteGroup.isPending}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除选中节点
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
            <CardTitle className="text-sm">成员管理</CardTitle>
            <CardDescription className="text-xs">
              {selectedGroup ? `把用户加入 ${groupLabel(selectedGroup)}，或从该节点移除。` : '先在左侧选择一个组织/用户组节点，再管理成员。'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={!selectedGroup || assignableUsers.length === 0}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder={selectedGroup ? '选择要加入的用户' : '请选择组织/用户组节点'} />
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
                加入当前节点
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
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">请选择组织/用户组节点</TableCell></TableRow>
                ) : selectedGroupUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">当前节点暂无成员</TableCell></TableRow>
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
            <CardTitle className="text-sm">下级组织/用户组</CardTitle>
            <CardDescription className="text-xs">
              {selectedGroup ? `显示 ${groupLabel(selectedGroup)} 下的直接子节点` : '显示当前用户源下的一级节点'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">名称</TableHead>
                  <TableHead className="text-xs">显示名</TableHead>
                  <TableHead className="text-xs">层级路径</TableHead>
                  <TableHead className="text-xs">类型</TableHead>
                  <TableHead className="text-xs">成员数</TableHead>
                  <TableHead className="text-xs">子节点数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">暂无下级节点</TableCell>
                  </TableRow>
                ) : childGroups.map((group) => {
                  const id = groupID(group);
                  const path = buildGroupPath(group, groupMap, rootLabel).join(' / ');
                  return (
                    <TableRow key={id} className="cursor-pointer" onClick={() => handleSelect(group)}>
                      <TableCell className="text-xs font-medium">{group.name || group.id}</TableCell>
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

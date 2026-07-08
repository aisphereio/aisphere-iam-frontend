'use client';

import { useMemo, useState } from 'react';
import { Building2, GitBranch, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMe } from '@/hooks/use-auth';
import { useIamCreateGroup, useIamDeleteGroup, useIamDirectoryGroups, useIamDirectoryOrganization, useIamUpdateGroup } from '@/hooks/use-iam';
import type { IamGroup, IamPrincipal } from '@/lib/api/types';

// Casdoor Organization is displayed as the root of the directory tree.
// Casdoor Groups are displayed as children below that root. This keeps the UI
// aligned with how non-technical admins think about org -> department -> team.

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

function groupLabel(group?: IamGroup | null): string {
  if (!group) return '';
  return group.displayName || group.name || group.id;
}

function buildChildrenMap(groups: IamGroup[]): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  for (const group of groups) {
    const parent = group.parentId || '';
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
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string, IamGroup[]>;
  selectedId: string;
  onSelect: (group: IamGroup) => void;
}) {
  const rows = childrenMap.get(parentId) || [];
  return (
    <>
      {rows.map((group) => {
        const id = groupID(group);
        const active = selectedId === id;
        const childCount = childrenMap.get(id)?.length || 0;
        return (
          <div key={id}>
            <button
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${active ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => onSelect(group)}
            >
              <GitBranch className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{groupLabel(group)}</span>
              {childCount > 0 ? <Badge variant="secondary" className="ml-auto text-[9px]">{childCount}</Badge> : null}
              {group.type ? <Badge variant="outline" className="text-[9px]">{group.type}</Badge> : null}
            </button>
            <GroupTreeRows parentId={id} depth={depth + 1} childrenMap={childrenMap} selectedId={selectedId} onSelect={onSelect} />
          </div>
        );
      })}
    </>
  );
}

export function GroupsPage() {
  const { data: me } = useMe();
  const [zoneInput, setZoneInput] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<IamGroup | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const zoneId = zoneInput.trim() || defaultZoneFromPrincipal(me);
  const { data: zone } = useIamDirectoryOrganization(zoneId);
  const { data, isLoading, isFetching, error, refetch } = useIamDirectoryGroups(zoneId);
  const createGroup = useIamCreateGroup();
  const updateGroup = useIamUpdateGroup();
  const deleteGroup = useIamDeleteGroup();

  const groups = data?.groups || [];
  const childrenMap = useMemo(() => buildChildrenMap(groups), [groups]);
  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);
  const selectedId = groupID(selectedGroup);
  const rootGroups = childrenMap.get('') || [];
  const childGroups = selectedId ? (childrenMap.get(selectedId) || []) : rootGroups;
  const rootLabel = zone?.displayName || zone?.name || zoneId;
  const selectedPath = buildGroupPath(selectedGroup, groupMap, rootLabel);
  const selectedParentLabel = selectedGroup ? groupLabel(selectedGroup) : `组织根节点：${rootLabel}`;
  const nestedGroupCount = groups.filter((group) => group.parentId).length;

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const handleSelectRoot = () => {
    setSelectedGroup(null);
    resetForm();
  };

  const handleSelect = (group: IamGroup) => {
    setSelectedGroup(group);
    setForm({ name: group.name || '', displayName: group.displayName || '', type: group.type || 'Virtual' });
    setEditing(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('用户组名称不能为空');
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
      toast.success(selectedGroup ? '子用户组已创建' : '一级用户组已创建');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建用户组失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!form.name.trim()) {
      toast.error('用户组名称不能为空');
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
      toast.success('用户组已更新');
      setEditing(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新用户组失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteGroup.mutateAsync({ orgId: zoneId, groupId: groupID(selectedGroup), recursive: false });
      toast.success('用户组已删除');
      setSelectedGroup(null);
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除用户组失败');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              组织与用户组
            </CardTitle>
            <CardDescription className="text-xs">
              组织作为顶级根节点，一级用户组挂在组织下，子用户组继续向下展开。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">当前组织</label>
              <Input
                value={zoneInput}
                onChange={(e) => {
                  setZoneInput(e.target.value);
                  setSelectedGroup(null);
                  resetForm();
                }}
                placeholder={zoneId}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">对应 Casdoor Organization / IAM zone。组织本身只读，授权和用户组在此组织下维护。</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="一级组" value={rootGroups.length} />
              <Metric label="子级组" value={nestedGroupCount} />
              <Metric label="总组数" value={groups.length} />
            </div>

            <div className="rounded-md border p-2">
              <button
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium ${!selectedGroup ? 'bg-accent text-foreground shadow-sm' : 'bg-muted hover:bg-accent/60'}`}
                onClick={handleSelectRoot}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{rootLabel}</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">组织</Badge>
              </button>
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : groups.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无用户组</div>
              ) : (
                <GroupTreeRows parentId="" depth={0} childrenMap={childrenMap} selectedId={selectedId} onSelect={handleSelect} />
              )}
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                加载组织/用户组失败：{error instanceof Error ? error.message : 'unknown error'}
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
              <span>{selectedGroup ? '用户组管理' : '组织根节点'}</span>
              <Badge variant="secondary">{groups.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              当前路径：{selectedPath.join(' / ')}。未选中用户组时，新建的是组织下的一级用户组；选中用户组后，新建的是它的子用户组。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">用户组名称 *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" placeholder="platform" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">显示名</label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-8 text-xs" placeholder="平台组" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">类型</label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-8 text-xs" placeholder="Virtual" />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button size="sm" className="h-8" onClick={handleCreate} disabled={createGroup.isPending}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {selectedGroup ? '新建子用户组' : '新建一级用户组'}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleUpdate} disabled={!selectedGroup || updateGroup.isPending}>
                <Save className="mr-1 h-3.5 w-3.5" />
                更新选中用户组
              </Button>
              <Button size="sm" variant="destructive" className="h-8" onClick={handleDelete} disabled={!selectedGroup || deleteGroup.isPending}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除选中用户组
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={handleSelectRoot}>
                <X className="mr-1 h-3.5 w-3.5" />
                回到组织根节点
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">下级用户组</CardTitle>
            <CardDescription className="text-xs">
              {selectedGroup ? `显示 ${groupLabel(selectedGroup)} 下的直接子用户组` : '显示当前组织下的一级用户组'}
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
                  <TableHead className="text-xs">子组数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">暂无下级用户组</TableCell>
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

'use client';

import { useMemo, useState } from 'react';
import { GitBranch, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
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
        return (
          <div key={id}>
            <button
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => onSelect(group)}
            >
              <GitBranch className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{groupLabel(group)}</span>
              {group.type ? <Badge variant="outline" className="ml-auto text-[9px]">{group.type}</Badge> : null}
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
  const selectedId = groupID(selectedGroup);
  const childGroups = selectedId ? (childrenMap.get(selectedId) || []) : (childrenMap.get('') || []);
  const selectedParentLabel = selectedGroup ? groupLabel(selectedGroup) : `可用区根节点：${zone?.displayName || zone?.name || zoneId}`;

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const handleSelect = (group: IamGroup) => {
    setSelectedGroup(group);
    setForm({ name: group.name || '', displayName: group.displayName || '', type: group.type || 'Virtual' });
    setEditing(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('组名称不能为空');
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
      toast.success('组已创建');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建组失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!form.name.trim()) {
      toast.error('组名称不能为空');
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
      toast.success('组已更新');
      setEditing(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新组失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteGroup.mutateAsync({ orgId: zoneId, groupId: groupID(selectedGroup), recursive: false });
      toast.success('组已删除');
      setSelectedGroup(null);
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除组失败');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4" />
              可用区 / 组树
            </CardTitle>
            <CardDescription className="text-xs">
              Casdoor Organization 映射为可用区。可用区是只读顶级资源，不能在前端选择为组，也不能新建。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">当前可用区</label>
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
              <p className="text-[10px] text-muted-foreground">只用于切换查看的 Casdoor org。不可在这里新增可用区。</p>
            </div>

            <div className="rounded-md border p-2">
              <div className="mb-1 flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="truncate">{zone?.displayName || zone?.name || zoneId}</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">可用区</Badge>
              </div>
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : groups.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无下级组</div>
              ) : (
                <GroupTreeRows parentId="" depth={0} childrenMap={childrenMap} selectedId={selectedId} onSelect={handleSelect} />
              )}
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                加载组失败：{error instanceof Error ? error.message : 'unknown error'}
              </div>
            ) : null}

            <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>组管理</span>
              <Badge variant="secondary">{groups.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              当前父级：{selectedParentLabel}。未选中组时，新建的是可用区下的一级组；选中组后，新建的是它的子组。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">组名称 *</label>
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
                {selectedGroup ? '新建子组' : '新建一级组'}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleUpdate} disabled={!selectedGroup || updateGroup.isPending}>
                <Save className="mr-1 h-3.5 w-3.5" />
                更新选中组
              </Button>
              <Button size="sm" variant="destructive" className="h-8" onClick={handleDelete} disabled={!selectedGroup || deleteGroup.isPending}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除选中组
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setSelectedGroup(null); resetForm(); }}>
                <X className="mr-1 h-3.5 w-3.5" />
                清空选择
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">下级组</CardTitle>
            <CardDescription className="text-xs">
              {selectedGroup ? `显示 ${groupLabel(selectedGroup)} 下的子组` : '显示当前可用区下的一级组'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">名称</TableHead>
                  <TableHead className="text-xs">显示名</TableHead>
                  <TableHead className="text-xs">类型</TableHead>
                  <TableHead className="text-xs">父级</TableHead>
                  <TableHead className="text-xs">成员数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">暂无下级组</TableCell>
                  </TableRow>
                ) : childGroups.map((group) => (
                  <TableRow key={groupID(group)} className="cursor-pointer" onClick={() => handleSelect(group)}>
                    <TableCell className="text-xs font-medium">{group.name || group.id}</TableCell>
                    <TableCell className="text-xs">{group.displayName || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{group.type || '-'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{group.parentId || '可用区根节点'}</TableCell>
                    <TableCell className="text-xs">{group.users?.length || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

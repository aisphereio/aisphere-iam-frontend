'use client';

import { useMemo, useState } from 'react';
import {
  Route, Search, UserRound, User, Shield, Users, ArrowUpRight, Ban, Info,
  ChevronDown, ChevronRight, Clock, Plus, Link, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  useIamExternalUsers,
  useIamSubjectEntitlements,
  useIamRevokeAccess,
  useIamDirectoryGroups,
  useIamResourceTypes,
  useIamRoleTemplates,
  useIamResources,
  useIamGrantAccess,
} from '@/hooks/use-iam';
import { resourceLabel, permissionLabel } from '@/lib/authz/schema-summary';
import type { IamEntitlement, IamEntitlementSourceType } from '@/lib/api/types';

// ─── Shared helpers ──────────────────────────────────────────────────────

/** Human-readable label for source type */
function sourceLabel(source?: IamEntitlementSourceType): string {
  switch (source) {
    case 'DIRECT_GRANT': return '直接分配';
    case 'GROUP_GRANT': return '通过用户组';
    case 'PARENT_INHERITANCE': return '父资源继承';
    case 'ORG_INHERITANCE': return '组织级权限';
    case 'PLATFORM_INHERITANCE': return '平台级权限';
    default: return '未知来源';
  }
}

/** Icon for source type */
function SourceIcon({ source }: { source?: IamEntitlementSourceType }) {
  switch (source) {
    case 'DIRECT_GRANT': return <Shield className="h-3.5 w-3.5 text-green-600" />;
    case 'GROUP_GRANT': return <Users className="h-3.5 w-3.5 text-blue-600" />;
    case 'PARENT_INHERITANCE': return <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />;
    case 'ORG_INHERITANCE': return <Route className="h-3.5 w-3.5 text-purple-600" />;
    case 'PLATFORM_INHERITANCE': return <Shield className="h-3.5 w-3.5 text-slate-600" />;
    default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

/** Format a date string for display */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

// ─── Main component ──────────────────────────────────────────────────────

export function UserPermissions({ identityOrg }: { identityOrg: string }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // ── Grant form state ──
  const [grantResourceType, setGrantResourceType] = useState('');
  const [grantResourceId, setGrantResourceId] = useState('');
  const [grantRoleKey, setGrantRoleKey] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');

  // ── Revoke state ──
  const [revokeTarget, setRevokeTarget] = useState<{ grantId: string; label: string } | null>(null);

  // ── Expanded entitlements ──
  const [expandedEnts, setExpandedEnts] = useState<Set<string>>(new Set());

  // ── Queries ──
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const entitlementsQuery = useIamSubjectEntitlements(
    identityOrg,
    selectedUserId ? { type: 'user', id: selectedUserId } : null,
  );
  const groupsQuery = useIamDirectoryGroups(
    identityOrg,
    selectedUserId ? { userId: selectedUserId } : undefined,
  );
  const resourceTypesQuery = useIamResourceTypes();
  const rolesQuery = useIamRoleTemplates();
  const resourcesQuery = useIamResources(identityOrg, { type: grantResourceType || undefined });
  const revokeAccess = useIamRevokeAccess(identityOrg);
  const grantAccess = useIamGrantAccess(identityOrg);

  // ── Derived data ──
  const users = usersQuery.data?.users || [];
  const entitlements = entitlementsQuery.data?.entitlements || [];
  const groups = groupsQuery.data?.groups || [];
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const roles = useMemo(
    () => (rolesQuery.data?.roleTemplates || []).filter(
      (r) => r.enabled !== false && (!grantResourceType || r.resourceType === grantResourceType),
    ),
    [grantResourceType, rolesQuery.data?.roleTemplates],
  );
  const resources = resourcesQuery.data?.resources || [];

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Filtered user list
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  // Entitlements grouped by resource type
  const groupedEntitlements = useMemo(() => {
    const map = new Map<string, IamEntitlement[]>();
    for (const e of entitlements) {
      const type = e.resource?.type || 'unknown';
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entitlements]);

  // Direct grants (for the grants tab)
  const directEntitlements = useMemo(
    () => entitlements.filter((e) => e.sourceType === 'DIRECT_GRANT'),
    [entitlements],
  );

  // ── Handlers ──
  const handleRevoke = async (grantId: string) => {
    try {
      await revokeAccess.mutateAsync(grantId);
      toast.success('授权已撤销');
      entitlementsQuery.refetch();
    } catch {
      // handled by the mutation
    }
  };

  const handleGrantAccess = async () => {
    if (!grantResourceType || !grantResourceId || !grantRoleKey) {
      toast.error('请填写资源类型、资源标识和角色');
      return;
    }
    try {
      await grantAccess.mutateAsync({
        resource: { type: grantResourceType, id: grantResourceId },
        role_key: grantRoleKey,
        subject: { type: 'user', id: selectedUserId },
        reason: grantReason || undefined,
        expires_at: grantExpiresAt || undefined,
      });
      toast.success('授权已分配');
      setGrantResourceType('');
      setGrantResourceId('');
      setGrantRoleKey('');
      setGrantReason('');
      setGrantExpiresAt('');
      entitlementsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '授权分配失败');
    }
  };

  const toggleExpandEnt = (id: string) => {
    setExpandedEnts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Resource display name map
  const resourceDisplayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resources) {
      map.set(r.ref.id, r.displayName || r.slug || r.ref.id);
    }
    return map;
  }, [resources]);

  // Role display name map
  const roleDisplayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rolesQuery.data?.roleTemplates || []) {
      map.set(r.roleKey, r.displayName || r.roleKey);
    }
    return map;
  }, [rolesQuery.data?.roleTemplates]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">人员权限</h2>
        <p className="text-sm text-muted-foreground">选择人员，查看和管理其在所有资源上的权限。</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,1.6fr)]">
        {/* ── Left: User Selector ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-violet-600" />
              选择人员
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索人员..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
            <div className="px-3 pb-3 space-y-0.5">
              {filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">没有找到人员。</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => { setSelectedUserId(user.id); setActiveTab('overview'); }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-violet-600 text-white'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{user.displayName || user.username}</span>
                    <span className="text-[10px] opacity-60 truncate">{user.email}</span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Right: Detail Panel ── */}
        <div className="space-y-4">
          {selectedUser ? (
            <>
              {/* User Header */}
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/10 text-violet-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{selectedUser.displayName || selectedUser.username}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.email && <span>{selectedUser.email} · </span>}
                      @{selectedUser.username}
                      <span className="ml-2 text-[10px] opacity-60">
                        {entitlements.length} 个有效权限
                        {directEntitlements.length > 0 && (
                          <>（{directEntitlements.length} 个直接授权）</>
                        )}
                      </span>
                    </p>
                  </div>
                  <Badge variant={selectedUser.enabled !== false ? 'default' : 'destructive'} className="text-[10px]">
                    {selectedUser.enabled !== false ? '已启用' : '已禁用'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">概览</TabsTrigger>
                  <TabsTrigger value="permissions">有效权限</TabsTrigger>
                  <TabsTrigger value="grants">授权管理</TabsTrigger>
                </TabsList>

                {/* ═══ Tab: 概览 ═══ */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  {/* 基本信息 */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4 text-violet-600" />
                        基本信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">用户名</span>
                          <p className="font-mono mt-0.5">{selectedUser.username}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">邮箱</span>
                          <p className="mt-0.5">{selectedUser.email || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">用户源</span>
                          <p className="mt-0.5">{selectedUser.provider || '本地'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">外部 ID</span>
                          <p className="font-mono mt-0.5">{selectedUser.externalId || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">状态</span>
                          <p className="mt-0.5">
                            <Badge variant={selectedUser.enabled !== false ? 'outline' : 'destructive'} className="text-[10px]">
                              {selectedUser.enabled !== false ? '启用' : '禁用'}
                            </Badge>
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">电话</span>
                          <p className="mt-0.5">{selectedUser.phone || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 所属组织 */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        所属组织
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupsQuery.isLoading ? (
                        <div className="text-xs text-muted-foreground">加载中...</div>
                      ) : groups.length === 0 ? (
                        <div className="text-xs text-muted-foreground">该人员不属于任何组织。</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {groups.map((g) => (
                            <Badge key={g.id} variant="secondary" className="text-[10px]">
                              {g.displayName || g.name || g.id}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 角色 */}
                  {selectedUser.roles && selectedUser.roles.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-blue-600" />
                          角色
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedUser.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-[10px]">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ═══ Tab: 有效权限 ═══ */}
                <TabsContent value="permissions" className="mt-4 space-y-4">
                  {entitlementsQuery.isLoading && (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-muted-foreground">加载中...</CardContent>
                    </Card>
                  )}

                  {entitlementsQuery.isError && (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-red-500">
                        加载失败：{entitlementsQuery.error?.message}
                      </CardContent>
                    </Card>
                  )}

                  {!entitlementsQuery.isLoading && !entitlementsQuery.isError && groupedEntitlements.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        该人员暂无任何有效权限。
                      </CardContent>
                    </Card>
                  )}

                  {groupedEntitlements.map(([type, typeEntitlements]) => (
                    <Card key={type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Route className="h-4 w-4 text-violet-600" />
                          {resourceLabel(type)}
                        </CardTitle>
                        <CardDescription>{typeEntitlements.length} 个有效权限</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {typeEntitlements.map((ent) => {
                            const isExpanded = expandedEnts.has(ent.id);
                            return (
                              <div key={ent.id} className="rounded-lg border">
                                {/* Main row */}
                                <div className="flex items-center justify-between p-2.5">
                                  <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandEnt(ent.id)}
                                      className="shrink-0 text-muted-foreground hover:text-foreground"
                                    >
                                      {isExpanded
                                        ? <ChevronDown className="h-3.5 w-3.5" />
                                        : <ChevronRight className="h-3.5 w-3.5" />}
                                    </button>
                                    <span className="font-medium truncate">{ent.resource?.id}</span>
                                    <span className="text-muted-foreground shrink-0">→</span>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                      {ent.roleKey}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 flex items-center gap-1"
                                    >
                                      <SourceIcon source={ent.sourceType} />
                                      {sourceLabel(ent.sourceType)}
                                    </Badge>
                                    {ent.sourceSubject && ent.sourceType === 'GROUP_GRANT' && (
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        (组: {ent.sourceSubject.id})
                                      </span>
                                    )}
                                    {ent.sourceResource && ent.sourceType === 'PARENT_INHERITANCE' && (
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        (父: {ent.sourceResource.id})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {ent.permissions && ent.permissions.length > 0 && (
                                      <span className="text-[10px] text-muted-foreground hidden md:inline">
                                        {ent.permissions.length} 个权限
                                      </span>
                                    )}
                                    {ent.revocableHere && ent.grantId && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-700"
                                        onClick={() => handleRevoke(ent.grantId!)}
                                        title="撤销授权"
                                        disabled={revokeAccess.isPending}
                                      >
                                        <Ban className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {/* Expanded permissions detail */}
                                {isExpanded && ent.permissions && ent.permissions.length > 0 && (
                                  <div className="border-t px-2.5 py-2 space-y-1 bg-muted/20">
                                    <div className="text-[10px] font-medium text-muted-foreground mb-1">具体权限：</div>
                                    <div className="flex flex-wrap gap-1">
                                      {ent.permissions.map((perm) => (
                                        <Badge key={perm} variant="outline" className="text-[9px] bg-background">
                                          {permissionLabel(perm)}
                                        </Badge>
                                      ))}
                                    </div>
                                    {ent.expiresAt && (
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        过期时间：{formatDate(ent.expiresAt)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* ═══ Tab: 授权管理 ═══ */}
                <TabsContent value="grants" className="mt-4 space-y-4">
                  {/* New Grant Form */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Plus className="h-4 w-4 text-green-600" />
                        新建授权
                      </CardTitle>
                      <CardDescription>
                        为 {selectedUser.displayName || selectedUser.username} 分配新的资源权限。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Resource Type */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">资源类型</label>
                          <Select value={grantResourceType} onValueChange={(v) => { setGrantResourceType(v); setGrantResourceId(''); }}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="选择资源类型" />
                            </SelectTrigger>
                            <SelectContent>
                              {resourceTypes
                                .filter((rt) => rt.grantable !== false)
                                .map((rt) => (
                                  <SelectItem key={rt.type} value={rt.type} className="text-xs">
                                    {resourceLabel(rt.type, rt.displayName)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Resource ID */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">资源标识</label>
                          {resources.length > 0 ? (
                            <Select value={grantResourceId} onValueChange={setGrantResourceId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="选择资源" />
                              </SelectTrigger>
                              <SelectContent>
                                {resources.map((r) => (
                                  <SelectItem key={r.ref.id} value={r.ref.id} className="text-xs">
                                    {r.displayName || r.slug || r.ref.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={grantResourceId}
                              onChange={(e) => setGrantResourceId(e.target.value)}
                              placeholder="输入资源 ID（如 project-xxx）"
                              className="h-8 text-xs"
                            />
                          )}
                        </div>

                        {/* Role */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">角色</label>
                          <Select value={grantRoleKey} onValueChange={setGrantRoleKey}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="选择角色" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.roleKey} value={role.roleKey} className="text-xs">
                                  {role.displayName || role.roleKey}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Expiration */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            过期时间（可选）
                          </label>
                          <Input
                            type="datetime-local"
                            value={grantExpiresAt}
                            onChange={(e) => setGrantExpiresAt(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Reason */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">原因（可选）</label>
                          <Textarea
                            value={grantReason}
                            onChange={(e) => setGrantReason(e.target.value)}
                            placeholder="分配权限的原因..."
                            className="text-xs min-h-[60px]"
                          />
                        </div>

                        <Button
                          className="w-full h-8 text-xs"
                          onClick={handleGrantAccess}
                          disabled={!grantResourceType || !grantResourceId || !grantRoleKey || grantAccess.isPending}
                        >
                          {grantAccess.isPending ? '分配中...' : '确认分配'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Direct Grants List */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Link className="h-4 w-4 text-violet-600" />
                        直接授权
                      </CardTitle>
                      <CardDescription>
                        {directEntitlements.length > 0
                          ? `该人员有 ${directEntitlements.length} 个直接授权。`
                          : '该人员暂无直接授权。'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {directEntitlements.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                          暂无直接授权。使用上方表单分配新权限。
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {directEntitlements.map((ent) => (
                            <div key={ent.id} className="flex items-center justify-between rounded-lg border p-2.5">
                              <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
                                <Shield className="h-4 w-4 text-green-600 shrink-0" />
                                <span className="font-medium truncate">
                                  {resourceDisplayMap.get(ent.resource?.id || '') || ent.resource?.id}
                                </span>
                                <span className="text-muted-foreground shrink-0">→</span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {roleDisplayMap.get(ent.roleKey || '') || ent.roleKey}
                                </Badge>
                                {ent.permissions && ent.permissions.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground hidden md:inline">
                                    {ent.permissions.length} 个权限
                                  </span>
                                )}
                                {ent.expiresAt && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(ent.expiresAt)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {ent.revocableHere && ent.grantId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                    onClick={() => setRevokeTarget({ grantId: ent.grantId!, label: `${ent.resource?.id || ''} → ${ent.roleKey || ''}` })}
                                    title="撤销授权"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <User className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-base font-medium">选择一个人</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  从左侧列表中选择人员，查看其所有资源上的有效权限并进行管理。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}
        title="撤销授权"
        description={`确定撤销「${revokeTarget?.label || ''}」的授权？权限将立即失效。`}
        confirmLabel="撤销"
        variant="destructive"
        onConfirm={async () => {
          if (!revokeTarget) return;
          await handleRevoke(revokeTarget.grantId);
          setRevokeTarget(null);
        }}
      />
    </section>
  );
}
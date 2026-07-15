'use client';

import { useMemo, useState } from 'react';
import { Route, Search, UserRound, Shield, Users, ArrowUpRight, Ban, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIamExternalUsers, useIamSubjectEntitlements, useIamRevokeAccess } from '@/hooks/use-iam';
import { resourceLabel } from '@/lib/authz/schema-summary';
import type { IamEntitlement, IamEntitlementSourceType } from '@/lib/api/types';

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

export function UserPermissions({ identityOrg }: { identityOrg: string }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirectOnly, setShowDirectOnly] = useState(false);

  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const entitlementsQuery = useIamSubjectEntitlements(
    identityOrg,
    selectedUserId ? { type: 'user', id: selectedUserId } : null,
  );
  const revokeAccess = useIamRevokeAccess(identityOrg);

  const users = usersQuery.data?.users || [];
  const entitlements = entitlementsQuery.data?.entitlements || [];

  const selectedUser = users.find((u) => u.id === selectedUserId);

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

  // Filter entitlements
  const displayEntitlements = useMemo(() => {
    if (showDirectOnly) {
      return entitlements.filter((e) => e.sourceType === 'DIRECT_GRANT');
    }
    return entitlements;
  }, [entitlements, showDirectOnly]);

  // Group by resource type
  const groupedEntitlements = useMemo(() => {
    const map = new Map<string, IamEntitlement[]>();
    for (const e of displayEntitlements) {
      const type = e.resource?.type || 'unknown';
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [displayEntitlements]);

  const handleRevoke = async (grantId: string) => {
    try {
      await revokeAccess.mutateAsync(grantId);
      entitlementsQuery.refetch();
    } catch {
      // handled by the mutation
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">人员权限</h2>
          <p className="text-sm text-muted-foreground">选择人员，查看其在所有资源上的有效权限（含继承）。</p>
        </div>
        {selectedUser && (
          <div className="flex items-center gap-2">
            <Button
              variant={showDirectOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowDirectOnly(!showDirectOnly)}
            >
              <Shield className="mr-1 h-3.5 w-3.5" />
              {showDirectOnly ? '显示全部' : '仅直接授权'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,1.6fr)]">
        {/* Left: User Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-violet-600" />
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
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-violet-600 text-white'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{user.displayName || user.username}</span>
                    <span className="text-[10px] opacity-60 truncate">{user.email}</span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Entitlements */}
        <div className="space-y-4">
          {selectedUser ? (
            <>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/10 text-violet-600">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedUser.displayName || selectedUser.username}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.email && <span>{selectedUser.email} · </span>}
                      @{selectedUser.username}
                      <span className="ml-2 text-[10px] opacity-60">
                        {entitlements.length} 个有效权限
                        {entitlements.filter((e) => e.sourceType === 'DIRECT_GRANT').length > 0 && (
                          <>（{entitlements.filter((e) => e.sourceType === 'DIRECT_GRANT').length} 个直接授权）</>
                        )}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

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
                      {typeEntitlements.map((ent) => (
                        <div key={ent.id} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <span className="font-medium truncate">{ent.resource?.id}</span>
                            <span className="text-muted-foreground shrink-0">→</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {ent.roleKey || ent.roleKey}
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
                          <div className="flex items-center gap-1 shrink-0">
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
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <UserRound className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-base font-medium">选择一个人</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  从左侧列表中选择人员，查看其所有资源上的有效权限。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
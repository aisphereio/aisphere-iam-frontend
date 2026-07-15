'use client';

import { useMemo, useState } from 'react';
import { Route, Search, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIamExternalUsers, useIamGrants, useIamResourceTypes, useIamRoleTemplates } from '@/hooks/use-iam';
import { resourceLabel } from '@/lib/authz/schema-summary';

export function UserPermissions({ identityOrg }: { identityOrg: string }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const grantsQuery = useIamGrants(selectedUserId ? { subjectType: 'user', subjectId: selectedUserId } : undefined);
  const resourceTypesQuery = useIamResourceTypes();
  const rolesQuery = useIamRoleTemplates();

  const users = usersQuery.data?.users || [];
  const grants = grantsQuery.data?.grants || [];
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const roles = rolesQuery.data?.roleTemplates || [];

  const roleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) map.set(r.roleKey, r.displayName || r.roleKey);
    return map;
  }, [roles]);

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

  // Group grants by resource type
  const groupedGrants = useMemo(() => {
    const map = new Map<string, typeof grants>();
    for (const g of grants) {
      const type = g.resource?.type || 'unknown';
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(g);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [grants]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">人员权限</h2>
        <p className="text-sm text-muted-foreground">选择人员，查看其在所有资源上的权限。</p>
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

        {/* Right: Permissions */}
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
                    </p>
                  </div>
                </CardContent>
              </Card>

              {groupedGrants.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    该人员暂无任何权限分配。
                  </CardContent>
                </Card>
              ) : (
                groupedGrants.map(([type, typeGrants]) => (
                  <Card key={type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Route className="h-4 w-4 text-violet-600" />
                        {resourceLabel(type)}
                      </CardTitle>
                      <CardDescription>{typeGrants.length} 个分配</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {typeGrants.map((grant) => (
                          <div key={grant.id} className="flex items-center justify-between rounded-lg border p-2.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{grant.resource?.id}</span>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {roleMap.get(grant.roleKey || '') || grant.roleKey || grant.relation}
                              </Badge>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {grant.subject?.relation === 'member' ? '通过用户组' : '直接分配'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <UserRound className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-base font-medium">选择一个人</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  从左侧列表中选择人员，查看其所有资源上的权限。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
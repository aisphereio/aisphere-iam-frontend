'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Search, Users, Mail, Phone, Fingerprint, Shield, FolderTree, Tag, ExternalLink, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useMe } from '@/hooks/use-auth';
import { useIamExternalUsers } from '@/hooks/use-iam';
import type { IamPrincipal, IamUser } from '@/lib/api/types';

function defaultOrgFromPrincipal(principal?: IamPrincipal): string {
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

function userSearchText(user: IamUser): string {
  return [
    user.id,
    user.externalId,
    user.provider,
    user.orgId,
    user.username,
    user.displayName,
    user.email,
    user.phone,
    ...(user.roles || []),
    ...(user.groups || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function UserDetailDialog({ user, open, onOpenChange }: { user: IamUser | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!user) return null;

  const detailItems = [
    { label: '用户名', value: user.username, icon: Tag },
    { label: '显示名', value: user.displayName, icon: Tag },
    { label: '邮箱', value: user.email, icon: Mail },
    { label: '电话', value: user.phone, icon: Phone },
    { label: '用户 ID', value: user.id, icon: Fingerprint },
    { label: '外部 ID', value: user.externalId, icon: ExternalLink },
    { label: '用户源', value: user.orgId, icon: MapPin },
    { label: '身份提供方', value: user.provider, icon: Tag },
  ].filter((item) => item.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {user.displayName || user.username || '用户详情'}
          </DialogTitle>
          <DialogDescription>
            Casdoor 外部用户信息，只读展示。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detailItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </div>
                  <div className="text-xs font-medium truncate" title={item.value}>
                    {item.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 状态 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">状态</span>
            {user.enabled === false ? (
              <Badge variant="destructive" className="text-[10px]">禁用</Badge>
            ) : (
              <Badge className="bg-green-500 text-[10px]">启用</Badge>
            )}
          </div>

          {/* 角色 */}
          {user.roles && user.roles.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Shield className="h-3 w-3" />
                角色
              </div>
              <div className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-[10px]">{role}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* 组 */}
          {user.groups && user.groups.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FolderTree className="h-3 w-3" />
                所属组
              </div>
              <div className="flex flex-wrap gap-1">
                {user.groups.map((group) => (
                  <Badge key={group} variant="outline" className="text-[10px]">{group}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExternalUsersPage({ identityOrg: identityOrgProp }: { identityOrg?: string }) {
  const { data: me } = useMe();
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<IamUser | null>(null);

  const effectiveOrgId = identityOrgProp?.trim() || defaultOrgFromPrincipal(me);
  const { data, isLoading, isFetching, error, refetch } = useIamExternalUsers(effectiveOrgId, {
    pageSize: 200,
  });

  const users = data?.users || [];
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => userSearchText(user).includes(q));
  }, [query, users]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                用户管理
                <Badge variant="secondary">{filteredUsers.length}</Badge>
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                点击用户行查看详情。用户创建、禁用、密码和 MFA 等能力继续在 Casdoor 管理。
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-8" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">搜索</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="按用户名、显示名、邮箱、角色或组搜索"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              用户列表加载失败：{error instanceof Error ? error.message : 'unknown error'}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">用户名</TableHead>
                <TableHead className="text-xs">显示名</TableHead>
                <TableHead className="text-xs">邮箱</TableHead>
                <TableHead className="text-xs">外部 ID</TableHead>
                <TableHead className="text-xs">用户源</TableHead>
                <TableHead className="text-xs">组</TableHead>
                <TableHead className="text-xs">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              )) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    没有找到用户
                  </TableCell>
                </TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow
                  key={user.id || user.externalId || user.username}
                  className="cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell className="text-xs font-medium">{user.username || '-'}</TableCell>
                  <TableCell className="text-xs">{user.displayName || '-'}</TableCell>
                  <TableCell className="text-xs">{user.email || '-'}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs" title={user.externalId || user.id}>
                    {user.externalId || user.id || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{user.orgId || effectiveOrgId}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(user.groups || []).length === 0 ? <span className="text-xs text-muted-foreground">-</span> : user.groups?.map((group) => (
                        <Badge key={group} variant="outline" className="text-[10px]">{group}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.enabled === false ? (
                      <Badge variant="destructive" className="text-[10px]">禁用</Badge>
                    ) : (
                      <Badge className="bg-green-500 text-[10px]">启用</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDetailDialog user={selectedUser} open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }} />
    </div>
  );
}
'use client';

import { useMemo, useState } from 'react';
import { ArrowDownToLine, Clock3, Link2, UserRound, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormField } from './form-field';
import {
  useIamDirectoryGroups,
  useIamExternalUsers,
  useIamGrantAccess,
  useIamGrants,
  useIamResources,
  useIamResourceTypes,
  useIamRevokeAccess,
  useIamRoleTemplates,
} from '@/hooks/use-iam';
import type { IamGrant, IamGroup, IamResource, IamUser } from '@/lib/api/types';
import { resourceLabel } from '@/lib/authz/schema-summary';

export function AccessAssignments({ identityOrg }: { identityOrg: string }) {
  const [resourceType, setResourceType] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user');
  const [subjectId, setSubjectId] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<IamGrant | null>(null);

  const resourceTypesQuery = useIamResourceTypes();
  const rolesQuery = useIamRoleTemplates();
  const resourcesQuery = useIamResources({ type: resourceType || undefined, orgId: identityOrg || undefined });
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const groupsQuery = useIamDirectoryGroups(identityOrg);
  const grantsQuery = useIamGrants();
  const grantAccess = useIamGrantAccess();
  const revokeAccess = useIamRevokeAccess();

  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const roles = useMemo(
    () => (rolesQuery.data?.roleTemplates || []).filter((role) => role.enabled !== false && (!resourceType || role.resourceType === resourceType)),
    [resourceType, rolesQuery.data?.roleTemplates],
  );
  const resources = resourcesQuery.data?.resources || [];
  const users = usersQuery.data?.users || [];
  const groups = groupsQuery.data?.groups || [];
  const grants = grantsQuery.data?.grants || [];

  const changeResourceType = (value: string) => {
    setResourceType(value);
    setResourceId('');
    setRoleKey('');
  };

  const submit = async () => {
    if (!resourceType || !resourceId || !subjectId || !roleKey) {
      toast.error('请选择资源、授权对象和角色');
      return;
    }
    try {
      await grantAccess.mutateAsync({
        resource: { type: resourceType, id: resourceId },
        roleKey,
        subject: { type: subjectType, id: subjectId, relation: subjectType === 'group' ? 'member' : undefined },
        source: 'iam_console',
        reason: reason.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      toast.success('访问权限已分配');
      setReason('');
      setExpiresAt('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '分配失败');
    }
  };

  const revoke = (grant: IamGrant) => setRevokeTarget(grant);

  const confirmRevoke = async () => {
    const grant = revokeTarget;
    if (!grant) return;
    try {
      await revokeAccess.mutateAsync(grant.id);
      toast.success('访问分配已撤销');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '撤销失败');
    } finally {
      setRevokeTarget(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">访问分配</h2>
        <p className="text-sm text-muted-foreground">选择资源、人员或用户组，再分配一个角色。用户组成员会通过 member 关系继承权限。</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ArrowDownToLine className="h-4 w-4 text-violet-600" />新建分配</CardTitle>
            <CardDescription>先确定生效范围，再选对象和角色。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="资源类型">
                <Select value={resourceType} onValueChange={changeResourceType}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="选择资源类型" /></SelectTrigger>
                  <SelectContent>
                    {resourceTypes.filter((item) => item.grantable !== false).map((item) => <SelectItem key={item.type} value={item.type}>{item.displayName || resourceLabel(item.type)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="具体资源">
                {resources.length > 0 ? (
                  <Select value={resourceId} onValueChange={setResourceId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="选择资源" /></SelectTrigger>
                    <SelectContent>{resources.map((item) => <SelectItem key={item.ref.id} value={item.ref.id}>{resourceName(item)}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Input value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder="输入资源 ID" />}
              </FormField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="授权对象类型">
                <Select value={subjectType} onValueChange={(value: 'user' | 'group') => { setSubjectType(value); setSubjectId(''); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="user">人员</SelectItem><SelectItem value="group">用户组</SelectItem></SelectContent>
                </Select>
              </FormField>
              <FormField label={subjectType === 'user' ? '人员' : '用户组'}>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={`选择${subjectType === 'user' ? '人员' : '用户组'}`} /></SelectTrigger>
                  <SelectContent>
                    {(subjectType === 'user' ? users : groups).map((item) => <SelectItem key={item.id} value={item.id}>{subjectName(item)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="角色">
              <Select value={roleKey} onValueChange={setRoleKey}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择角色" /></SelectTrigger>
                <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.roleKey}>{role.displayName || role.roleKey}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>

            <FormField label="到期时间（可选）"><Input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></FormField>
            <FormField label="分配原因（可选）"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：负责本季度 Skill 内容审核" /></FormField>

            <div className="rounded-lg border bg-muted/45 p-3 text-xs leading-5 text-muted-foreground">
              {subjectType === 'group'
                ? '你正在给用户组授权。组内成员通过 group#member 获得访问；成员退出组后会自动失去这部分权限。'
                : '你正在给人员直接授权。若这是团队职责，优先给用户组授权，后续维护成本更低。'}
            </div>
            <Button className="w-full" onClick={submit} disabled={grantAccess.isPending}>确认分配</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div><CardTitle className="text-base">当前有效分配</CardTitle><CardDescription>角色定义不会复制；这里保存“谁在什么资源上使用哪个角色”。</CardDescription></div>
              <Badge variant="secondary">{grants.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {grants.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">还没有有效访问分配。</div>
            ) : (
              <div className="space-y-2">
                {grants.map((grant) => (
                  <div key={grant.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {grant.subject?.type === 'group' ? <UsersRound className="h-4 w-4 text-cyan-600" /> : <UserRound className="h-4 w-4 text-violet-600" />}
                        <span>{grant.subject?.id || '未知对象'}</span>
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{grant.roleKey || grant.relation}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{resourceLabel(grant.resource?.type || '')}:{grant.resource?.id}</span>
                        <span>{grant.subject?.relation === 'member' ? '用户组成员继承' : '直接分配'}</span>
                        {grant.expiresAt && <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(grant.expiresAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="self-end text-muted-foreground sm:self-auto" onClick={() => revoke(grant)}><X className="mr-1 h-3.5 w-3.5" />撤销</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}
        title="撤销访问分配"
        description="撤销这条访问分配？权限将立即失效。"
        confirmLabel="撤销"
        variant="destructive"
        onConfirm={confirmRevoke}
      />
    </section>
  );
}

function resourceName(resource: IamResource): string {
  return `${resource.displayName || resource.slug || resource.ref.id} · ${resource.ref.id}`;
}

function subjectName(subject: IamUser | IamGroup): string {
  if ('username' in subject) return `${subject.displayName || subject.username} · ${subject.username}`;
  return `${subject.displayName || subject.name} · ${subject.name}`;
}

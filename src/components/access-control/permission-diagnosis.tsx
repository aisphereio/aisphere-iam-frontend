'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Route, SearchCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from './form-field';
import {
  useIamDirectoryGroups,
  useIamExplainAccess,
  useIamExternalUsers,
  useIamResources,
  useIamResourceTypes,
} from '@/hooks/use-iam';
import { permissionLabel, resourceLabel } from '@/lib/authz/schema-summary';

type ExplainResult = { allowed: boolean; steps?: unknown[] };

export function PermissionDiagnosis({ identityOrg, scopeRail }: { identityOrg: string; scopeRail?: React.ReactNode }) {
  const [resourceType, setResourceType] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user');
  const [subjectId, setSubjectId] = useState('');
  const [permission, setPermission] = useState('');
  const [result, setResult] = useState<ExplainResult | null>(null);

  const resourceTypesQuery = useIamResourceTypes();
  const resourcesQuery = useIamResources({ type: resourceType || undefined, orgId: identityOrg || undefined });
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const groupsQuery = useIamDirectoryGroups(identityOrg);
  const explain = useIamExplainAccess();
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const selectedType = resourceTypes.find((item) => item.type === resourceType);
  const permissions = selectedType?.permissions || [];
  const resources = resourcesQuery.data?.resources || [];
  const subjects = useMemo(
    () => subjectType === 'user' ? usersQuery.data?.users || [] : groupsQuery.data?.groups || [],
    [groupsQuery.data?.groups, subjectType, usersQuery.data?.users],
  );

  const run = async () => {
    if (!resourceType || !resourceId || !subjectId || !permission) {
      toast.error('请完整选择人员、资源和要检查的能力');
      return;
    }
    try {
      const reply = await explain.mutateAsync({
        resource: { type: resourceType, id: resourceId },
        permission,
        subject: { type: subjectType, id: subjectId },
      });
      setResult(reply);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '权限排查失败');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">权限排查</h2>
        <p className="text-sm text-muted-foreground">回答“这个人为什么能或不能访问”，把直接分配、用户组成员关系和上级继承放在同一条路径里解释。</p>
      </div>
      {scopeRail}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><SearchCheck className="h-4 w-4 text-violet-600" />检查一次访问</CardTitle><CardDescription>从业务对象出发，无需手写 relation 或 tuple。</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="对象类型">
                <Select value={subjectType} onValueChange={(value: 'user' | 'group') => { setSubjectType(value); setSubjectId(''); setResult(null); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="user">人员</SelectItem><SelectItem value="group">用户组</SelectItem></SelectContent>
                </Select>
              </FormField>
              <FormField label={subjectType === 'user' ? '人员' : '用户组'}>
                <Select value={subjectId} onValueChange={(value) => { setSubjectId(value); setResult(null); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="选择对象" /></SelectTrigger>
                  <SelectContent>{subjects.map((item) => <SelectItem key={item.id} value={item.id}>{'username' in item ? item.displayName || item.username : item.displayName || item.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="资源类型">
                <Select value={resourceType} onValueChange={(value) => { setResourceType(value); setResourceId(''); setPermission(''); setResult(null); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="选择资源类型" /></SelectTrigger>
                  <SelectContent>{resourceTypes.map((item) => <SelectItem key={item.type} value={item.type}>{item.displayName || resourceLabel(item.type)}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="具体资源">
                {resources.length > 0 ? (
                  <Select value={resourceId} onValueChange={(value) => { setResourceId(value); setResult(null); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="选择资源" /></SelectTrigger>
                    <SelectContent>{resources.map((item) => <SelectItem key={item.ref.id} value={item.ref.id}>{item.displayName || item.slug || item.ref.id}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Input value={resourceId} onChange={(event) => { setResourceId(event.target.value); setResult(null); }} placeholder="输入资源 ID" />}
              </FormField>
            </div>
            <FormField label="要检查的能力">
              <Select value={permission} onValueChange={(value) => { setPermission(value); setResult(null); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择能力" /></SelectTrigger>
                <SelectContent>{permissions.map((item) => <SelectItem key={item} value={item}>{permissionLabel(item)}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <Button className="w-full" onClick={run} disabled={explain.isPending}>开始排查</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Route className="h-4 w-4 text-cyan-600" />生效路径</CardTitle><CardDescription>优先展示用户能理解的授权来源，再保留技术步骤用于定位问题。</CardDescription></CardHeader>
          <CardContent>
            {!result ? (
              <div className="grid min-h-72 place-items-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">完成左侧选择后，这里会显示允许/拒绝结论和继承路径。</div>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 rounded-xl border p-4 ${result.allowed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                  {result.allowed ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" /> : <XCircle className="h-6 w-6 text-rose-600 shrink-0" />}
                  <div className="min-w-0"><div className="font-semibold">{result.allowed ? '允许访问' : '拒绝访问'}</div><div className="text-xs text-muted-foreground break-all">{subjectId} · {permissionLabel(permission)} · {resourceType}:{resourceId}</div></div>
                  <Badge className="ml-auto" variant={result.allowed ? 'default' : 'destructive'}>{result.allowed ? 'ALLOW' : 'DENY'}</Badge>
                </div>
                <div className="space-y-2">
                  {(result.steps || []).length === 0 ? <div className="rounded-lg border p-4 text-sm text-muted-foreground">后端未返回详细路径。可在高级治理中查看原始关系。</div> : (result.steps || []).map((step, index) => (
                    <div key={index} className="flex gap-3 rounded-lg border p-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-500/10 font-mono text-xs text-violet-600">{index + 1}</span><code className="break-all text-xs leading-6">{formatStep(step)}</code></div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function formatStep(step: unknown): string {
  if (typeof step === 'string') return step;
  try { return JSON.stringify(step); } catch { return String(step); }
}

'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Info, Route, SearchCheck, Shield, Users, ArrowUpRight, XCircle } from 'lucide-react';
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
  useIamRoleTemplates,
} from '@/hooks/use-iam';
import { permissionLabel, resourceLabel } from '@/lib/authz/schema-summary';
import { cn } from '@/lib/utils';

interface ExplainStep {
  source?: string;
  relation?: string;
  resource?: { type: string; id: string };
  subject?: { type: string; id: string; relation?: string };
  reason?: string;
}

interface ExplainResult {
  allowed: boolean;
  effect?: string;
  reason?: string;
  consistencyToken?: string;
  steps?: ExplainStep[];
}

/** Human-readable label for source type */
function sourceLabel(source?: string): string {
  switch (source) {
    case 'DIRECT': return '直接授权';
    case 'GROUP_GRANT': return '通过用户组';
    case 'PARENT_INHERITANCE': return '父资源继承';
    case 'ORG_INHERITANCE': return '组织级权限';
    case 'PLATFORM_INHERITANCE': return '平台级权限';
    default: return source || '未知来源';
  }
}

/** Icon for source type */
function SourceIcon({ source }: { source?: string }) {
  switch (source) {
    case 'DIRECT': return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    case 'GROUP_GRANT': return <Users className="h-3.5 w-3.5 text-blue-600" />;
    case 'PARENT_INHERITANCE': return <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />;
    case 'ORG_INHERITANCE': return <Route className="h-3.5 w-3.5 text-purple-600" />;
    case 'PLATFORM_INHERITANCE': return <Shield className="h-3.5 w-3.5 text-slate-600" />;
    default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function PermissionDiagnosis({ identityOrg, scopeRail }: { identityOrg: string; scopeRail?: React.ReactNode }) {
  const [resourceType, setResourceType] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user');
  const [subjectId, setSubjectId] = useState('');
  const [permission, setPermission] = useState('');
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  const resourceTypesQuery = useIamResourceTypes();
  const resourcesQuery = useIamResources(identityOrg, { type: resourceType || undefined });
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const groupsQuery = useIamDirectoryGroups(identityOrg);
  const rolesQuery = useIamRoleTemplates();
  const explain = useIamExplainAccess(identityOrg);
  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const selectedType = resourceTypes.find((item) => item.type === resourceType);
  const permissions = selectedType?.permissions || [];
  const resources = resourcesQuery.data?.resources || [];
  const subjects = useMemo(
    () => subjectType === 'user' ? usersQuery.data?.users || [] : groupsQuery.data?.groups || [],
    [groupsQuery.data?.groups, subjectType, usersQuery.data?.users],
  );

  // Build lookup maps for friendly names
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of usersQuery.data?.users || []) map.set(u.id, u.displayName || u.username || u.id);
    return map;
  }, [usersQuery.data?.users]);

  const groupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groupsQuery.data?.groups || []) map.set(g.id, g.displayName || g.name || g.id);
    return map;
  }, [groupsQuery.data?.groups]);

  const roleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rolesQuery.data?.roleTemplates || []) map.set(r.roleKey, r.displayName || r.roleKey);
    return map;
  }, [rolesQuery.data?.roleTemplates]);

  const subjectName = (id: string): string => {
    return userMap.get(id) || groupMap.get(id) || id;
  };

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
      setResult(reply as ExplainResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '权限排查失败');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">权限排查</h2>
        <p className="text-sm text-muted-foreground">回答"这个人为什么能或不能访问"，展示后端返回的真实授权路径。</p>
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
                <Select value={resourceType} onValueChange={(val) => { setResourceType(val); setResourceId(''); setPermission(''); setResult(null); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="选择资源类型" /></SelectTrigger>
                  <SelectContent>{resourceTypes.map((item) => <SelectItem key={item.type} value={item.type}>{item.displayName || resourceLabel(item.type)}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="具体资源">
                {resources.length > 0 ? (
                  <Select value={resourceId} onValueChange={(val) => { setResourceId(val); setResult(null); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="选择资源" /></SelectTrigger>
                    <SelectContent>{resources.map((item) => <SelectItem key={item.ref.id} value={item.ref.id}>{item.displayName || item.slug || item.ref.id}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Input value={resourceId} onChange={(event) => { setResourceId(event.target.value); setResult(null); }} placeholder="输入资源 ID" />}
              </FormField>
            </div>
            <FormField label="要检查的能力">
              <Select value={permission} onValueChange={(val) => { setPermission(val); setResult(null); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择能力" /></SelectTrigger>
                <SelectContent>{permissions.map((item) => <SelectItem key={item} value={item}>{permissionLabel(item)}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <Button className="w-full" onClick={run} disabled={explain.isPending}>开始排查</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Route className="h-4 w-4 text-cyan-600" />生效路径</CardTitle><CardDescription>后端返回的真实授权推导路径。</CardDescription></CardHeader>
          <CardContent>
            {!result ? (
              <div className="grid min-h-72 place-items-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">完成左侧选择后，这里会显示允许/拒绝结论和继承路径。</div>
            ) : (
              <div className="space-y-4">
                {/* Conclusion Banner */}
                <div className={`flex items-center gap-3 rounded-xl border p-4 ${result.allowed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                  {result.allowed ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" /> : <XCircle className="h-6 w-6 text-rose-600 shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {result.allowed ? '允许访问' : '拒绝访问'}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {subjectName(subjectId)} 对 {resourceLabel(resourceType)} · {resourceId} 的 {permissionLabel(permission)}
                      </span>
                    </div>
                    {result.reason && (
                      <div className="mt-1 text-xs text-muted-foreground">{result.reason}</div>
                    )}
                  </div>
                  <Badge className="ml-auto shrink-0" variant={result.allowed ? 'default' : 'destructive'}>{result.allowed ? 'ALLOW' : 'DENY'}</Badge>
                </div>

                {/* Steps from backend */}
                {result.steps && result.steps.length > 0 && (
                  <div className="space-y-0">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">授权来源路径</h4>
                    <div className="relative pl-6 border-l-2 border-violet-500/30 space-y-4">
                      {result.steps.map((step, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full border-2 border-violet-500 bg-violet-100 dark:bg-violet-900" />
                          <div className="rounded-lg border bg-card/50 p-3">
                            <div className="flex items-start gap-2 text-xs">
                              <SourceIcon source={step.source} />
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {sourceLabel(step.source)}
                                  {step.relation && <span className="text-muted-foreground"> · {step.relation}</span>}
                                </div>
                                {step.resource && (
                                  <div className="text-muted-foreground">
                                    资源: {step.resource.type}:{step.resource.id}
                                  </div>
                                )}
                                {step.subject && (
                                  <div className="text-muted-foreground">
                                    主体: {subjectName(step.subject.id)}
                                    {step.subject.relation && ` (${step.subject.relation})`}
                                  </div>
                                )}
                                {step.reason && (
                                  <div className="text-xs text-muted-foreground">{step.reason}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Final arrow to permission */}
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-900" />
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            最终获得 {permissionLabel(permission)} 能力
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No steps fallback */}
                {(!result.steps || result.steps.length === 0) && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    {result.allowed
                      ? '后端未返回详细授权路径。'
                      : '拒绝原因：该人员没有直接角色，所属用户组没有角色，父级资源没有可继承的权限。'}
                  </div>
                )}

                {/* Technical Details (collapsible) */}
                {result.steps && result.steps.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowTechDetails(!showTechDetails)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn('h-3 w-3 transition-transform', showTechDetails && 'rotate-180')} />
                      原始数据
                    </button>
                    {showTechDetails && (
                      <div className="space-y-2">
                        {result.steps.map((step, index) => (
                          <div key={index} className="flex gap-3 rounded-lg border p-3 text-sm">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-500/10 font-mono text-xs text-violet-600">{index + 1}</span>
                            <code className="break-all text-xs leading-6 font-mono">{JSON.stringify(step, null, 2)}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fix suggestions for denied */}
                {!result.allowed && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                    <div className="font-medium text-amber-600 dark:text-amber-400">建议修复方式</div>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li>• 将 {permissionLabel(permission)} 对应的角色分配给 {subjectName(subjectId)}</li>
                      <li>• 或将角色分配给 {subjectName(subjectId)} 所属的用户组</li>
                      <li>• 或检查父级资源是否已授予相应权限</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
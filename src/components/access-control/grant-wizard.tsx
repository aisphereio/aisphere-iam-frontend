'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Route, Search, Shield, UserRound, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIamDirectoryGroups, useIamExternalUsers, useIamGrantAccess, useIamResources, useIamResourceTypes, useIamRoleTemplates } from '@/hooks/use-iam';
import type { IamGroup, IamRoleTemplate, IamUser } from '@/lib/api/types';
import { permissionLabel, resourceLabel } from '@/lib/authz/schema-summary';
import { capabilitiesForResourceType, permissionCategoryOf } from '@/lib/authz/role-capabilities';
import { cn } from '@/lib/utils';

type WizardStep = 'subject' | 'role' | 'confirm';

interface GrantWizardProps {
  identityOrg: string;
  /** Optional pre-selected resource context */
  resourceType?: string;
  resourceId?: string;
  /** Optional pre-selected role */
  roleKey?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function GrantWizard({ identityOrg, resourceType: presetResourceType, resourceId: presetResourceId, roleKey: presetRoleKey, onComplete, onCancel }: GrantWizardProps) {
  const [step, setStep] = useState<WizardStep>('subject');
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user');
  const [subjectId, setSubjectId] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState(presetRoleKey || '');
  const [selectedResourceType, setSelectedResourceType] = useState(presetResourceType || '');
  const [selectedResourceId, setSelectedResourceId] = useState(presetResourceId || '');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const resourceTypesQuery = useIamResourceTypes();
  const rolesQuery = useIamRoleTemplates();
  const resourcesQuery = useIamResources(identityOrg, { type: selectedResourceType || undefined });
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const groupsQuery = useIamDirectoryGroups(identityOrg);
  const grantAccess = useIamGrantAccess(identityOrg);

  const resourceTypes = resourceTypesQuery.data?.resourceTypes || [];
  const allRoles = rolesQuery.data?.roleTemplates || [];
  const resources = resourcesQuery.data?.resources || [];
  const users = usersQuery.data?.users || [];
  const groups = groupsQuery.data?.groups || [];

  // Filter roles by selected resource type
  const availableRoles = useMemo(
    () => allRoles.filter((r) => r.enabled !== false && (!selectedResourceType || r.resourceType === selectedResourceType)),
    [selectedResourceType, allRoles],
  );

  // Group roles by risk level
  const { riskRoles, operateRoles, manageRoles } = useMemo(() => {
    const read: IamRoleTemplate[] = [];
    const operate: IamRoleTemplate[] = [];
    const manage: IamRoleTemplate[] = [];
    for (const r of availableRoles) {
      const perms = r.permissions || [];
      const hasManage = perms.some((p) => permissionCategoryOf(p) === 'manage');
      const hasOperate = perms.some((p) => permissionCategoryOf(p) === 'operate');
      if (hasManage) manage.push(r);
      else if (hasOperate) operate.push(r);
      else read.push(r);
    }
    return { riskRoles: read, operateRoles: operate, manageRoles: manage };
  }, [availableRoles]);

  const filteredSubjects = useMemo(() => {
    const list = subjectType === 'user' ? users : groups;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((item) => {
      if ('username' in item) {
        const u = item as IamUser;
        return (u.displayName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      }
      const g = item as IamGroup;
      return (g.displayName || '').toLowerCase().includes(q) || (g.name || '').toLowerCase().includes(q);
    });
  }, [subjectType, users, groups, searchQuery]);

  const selectedRole = allRoles.find((r) => r.roleKey === selectedRoleKey);
  const selectedSubject = subjectType === 'user'
    ? users.find((u) => u.id === subjectId)
    : groups.find((g) => g.id === subjectId);

  const canProceedToRole = selectedResourceType && selectedResourceId;
  const canProceedToConfirm = canProceedToRole && subjectId && selectedRoleKey;

  const handleSubmit = async () => {
    if (!selectedResourceType || !selectedResourceId || !subjectId || !selectedRoleKey) return;
    try {
      await grantAccess.mutateAsync({
        resource: { type: selectedResourceType, id: selectedResourceId },
        roleKey: selectedRoleKey,
        subject: { type: subjectType, id: subjectId, relation: subjectType === 'group' ? 'member' : undefined },
        source: 'iam_console',
        reason: reason.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      toast.success('访问权限已分配');
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '分配失败');
    }
  };

  const subjectLabel = (item: IamUser | IamGroup): string => {
    if ('username' in item) return `${item.displayName || item.username} · ${item.email || item.username}`;
    return `${item.displayName || item.name} · ${(item as IamGroup).users?.length || 0} 名成员`;
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className={cn('flex items-center gap-1.5', step === 'subject' ? 'text-violet-600 font-medium' : 'text-muted-foreground')}>
          <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs', step === 'subject' ? 'bg-violet-600 text-white' : 'bg-muted')}>1</span>
          选择对象
        </div>
        <Separator className="w-8" />
        <div className={cn('flex items-center gap-1.5', step === 'role' ? 'text-violet-600 font-medium' : 'text-muted-foreground')}>
          <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs', step === 'role' ? 'bg-violet-600 text-white' : step === 'confirm' ? 'bg-emerald-500 text-white' : 'bg-muted')}>
            {step === 'confirm' ? <Check className="h-3 w-3" /> : '2'}
          </span>
          选择角色
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <div className={cn('flex items-center gap-1.5', step === 'confirm' ? 'text-violet-600 font-medium' : 'text-muted-foreground')}>
          <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs', step === 'confirm' ? 'bg-violet-600 text-white' : 'bg-muted')}>3</span>
          确认
        </div>
      </div>

      {/* Step 1: Select Subject */}
      {step === 'subject' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">选择资源</CardTitle>
              <CardDescription>先确定生效的资源范围。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">资源类型</label>
                  <select
                    value={selectedResourceType}
                    onChange={(e) => { setSelectedResourceType(e.target.value); setSelectedResourceId(''); }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="">选择资源类型</option>
                    {resourceTypes.filter((rt) => rt.grantable !== false).map((rt) => (
                      <option key={rt.type} value={rt.type}>{rt.displayName || resourceLabel(rt.type)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">具体资源</label>
                  {resources.length > 0 ? (
                    <select
                      value={selectedResourceId}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs"
                    >
                      <option value="">选择资源</option>
                      {resources.map((r) => (
                        <option key={r.ref.id} value={r.ref.id}>{r.displayName || r.slug || r.ref.id}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={selectedResourceId}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      placeholder="输入资源 ID"
                      className="h-9 text-xs"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">选择人员或用户组</CardTitle>
              <CardDescription>选择要授权的对象。</CardDescription>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant={subjectType === 'user' ? 'default' : 'outline'}
                  onClick={() => { setSubjectType('user'); setSubjectId(''); }}
                >
                  <UserRound className="mr-1.5 h-3.5 w-3.5" />人员
                </Button>
                <Button
                  size="sm"
                  variant={subjectType === 'group' ? 'default' : 'outline'}
                  onClick={() => { setSubjectType('group'); setSubjectId(''); }}
                >
                  <UsersRound className="mr-1.5 h-3.5 w-3.5" />用户组
                </Button>
              </div>
              <div className="relative mt-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`搜索${subjectType === 'user' ? '人员' : '用户组'}...`}
                  className="h-8 pl-8 text-xs"
                />
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-60 overflow-y-auto">
              <div className="px-3 pb-3 space-y-0.5">
                {filteredSubjects.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">没有找到匹配的{subjectType === 'user' ? '人员' : '用户组'}。</div>
                ) : filteredSubjects.map((item) => {
                  const isSelected = item.id === subjectId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSubjectId(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                        isSelected ? 'bg-violet-600 text-white' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {subjectType === 'user' ? <UserRound className="h-3.5 w-3.5 shrink-0" /> : <UsersRound className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate flex-1">{subjectName(item)}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {onCancel && <Button variant="outline" onClick={onCancel}>取消</Button>}
            <Button onClick={() => setStep('role')} disabled={!canProceedToRole}>
              下一步：选择角色 <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Role */}
      {step === 'role' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">选择角色</CardTitle>
              <CardDescription>
                为 {subjectType === 'user' ? '人员' : '用户组'} {subjectName(selectedSubject)} 选择在 {resourceLabel(selectedResourceType)} 上的角色。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {manageRoles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400">管理类</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {manageRoles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        selected={selectedRoleKey === role.roleKey}
                        onSelect={() => setSelectedRoleKey(role.roleKey)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {operateRoles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400">操作类</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {operateRoles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        selected={selectedRoleKey === role.roleKey}
                        onSelect={() => setSelectedRoleKey(role.roleKey)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {riskRoles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">查看类</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {riskRoles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        selected={selectedRoleKey === role.roleKey}
                        onSelect={() => setSelectedRoleKey(role.roleKey)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {availableRoles.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">该资源类型下没有可用角色。</div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('subject')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> 返回
            </Button>
            <Button onClick={() => setStep('confirm')} disabled={!selectedRoleKey}>
              下一步：确认 <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">确认授权</CardTitle>
              <CardDescription>请确认以下授权信息。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">你将把</span>
                  <Badge variant="secondary" className="font-medium">{selectedRole?.displayName || selectedRoleKey}</Badge>
                  <span className="text-muted-foreground">角色</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">授予</span>
                  <Badge variant="secondary" className="font-medium">
                    {subjectType === 'user' ? <UserRound className="mr-1 h-3 w-3 inline" /> : <UsersRound className="mr-1 h-3 w-3 inline" />}
                    {subjectName(selectedSubject)}
                  </Badge>
                  {subjectType === 'group' && <span className="text-xs text-muted-foreground">的所有成员</span>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">生效资源为</span>
                  <Badge variant="secondary" className="font-medium">{resourceLabel(selectedResourceType)} · {selectedResourceId}</Badge>
                </div>
              </div>

              {selectedRole && (selectedRole.permissions || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">该角色包含以下能力</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedRole.permissions || []).map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px]">{permissionLabel(p)}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {manageRoles.some((r) => r.roleKey === selectedRoleKey) && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <Shield className="h-3.5 w-3.5 inline mr-1" />
                  该角色可以修改权限或管理其他成员，请谨慎分配。
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">到期时间（可选）</label>
                  <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">分配原因（可选）</label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例如：负责本季度 Skill 内容审核" className="h-9 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('role')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> 返回
            </Button>
            <Button onClick={handleSubmit} disabled={grantAccess.isPending}>
              {grantAccess.isPending ? '分配中...' : '确认分配'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({ role, selected, onSelect }: { role: IamRoleTemplate; selected: boolean; onSelect: () => void }) {
  const perms = role.permissions || [];
  const categories = [...new Set(perms.map((p) => permissionCategoryOf(p)))];
  const categoryLabel = (c: string) => ({ read: '查看', operate: '操作', manage: '管理' }[c] || c);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500' : 'hover:border-muted-foreground/30',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{role.displayName || role.roleKey}</span>
        {selected && <Check className="h-4 w-4 text-violet-600" />}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{role.description || `${role.roleKey} 角色`}</p>
      <div className="flex flex-wrap gap-1">
        {categories.map((c) => (
          <Badge key={c} variant="outline" className="text-[9px]">{categoryLabel(c)}</Badge>
        ))}
      </div>
    </button>
  );
}

function subjectName(subject: IamUser | IamGroup | undefined): string {
  if (!subject) return '';
  if ('username' in subject) return subject.displayName || subject.username || subject.id;
  return subject.displayName || subject.name || subject.id;
}
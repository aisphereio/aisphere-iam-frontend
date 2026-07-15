'use client';

import { useState } from 'react';
import {
  Building2, Folder, KeyRound, ShieldCheck, Database,
  Search, Plus, Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useIamProjects,
  useIamCreateProject,
  useIamCapabilities,
  useIamProjectCapabilities,
  useIamResourceTypes,
  useIamResources,
  useIamRoleTemplates,
  useIamGrants,
  useIamGrantAccess,
  useIamRevokeAccess,
} from '@/hooks/use-iam';
import { useMe } from '@/hooks/use-auth';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { ExternalUsersPage } from './users-page';
import type { IamPrincipal, Tab } from '@/lib/api/types';

// ─── Main IAM Page ─────────────────────────────────────────────────────
// Content is driven by the sidebar navigation — no horizontal tab bar.

export function IamPage({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'users':
      return <ExternalUsersPage />;
    case 'projects':
      return <ProjectsTab />;
    case 'grants':
      return <GrantsTab />;
    case 'resources':
      return <ResourcesTab />;
    default:
      return <ExternalUsersPage />;
  }
}

// ─── Projects Tab ──────────────────────────────────────────────────────

function ProjectsTab() {
  const t = useT();
  const { data: me } = useMe();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ slug: '', displayName: '', description: '' });
  const orgId = me?.orgId || '';

  const { data, isLoading, refetch } = useIamProjects(orgId);
  const createMutation = useIamCreateProject();
  const projects = data?.projects || [];

  const handleCreate = async () => {
    if (!form.slug) { toast.error(t('common.slugRequired')); return; }
    try {
      await createMutation.mutateAsync({ orgId, slug: form.slug, displayName: form.displayName, description: form.description });
      toast.success(t('common.projectCreated'));
      setForm({ slug: '', displayName: '', description: '' });
      setShowCreate(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.createFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t('projects.search')} className="h-8 w-64 text-xs" />
        </div>
        <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('projects.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('projects.slug')}</TableHead>
                <TableHead className="text-xs">{t('projects.displayName')}</TableHead>
                <TableHead className="text-xs">{t('projects.org')}</TableHead>
                <TableHead className="text-xs">{t('projects.status')}</TableHead>
                <TableHead className="text-xs">{t('projects.visibility')}</TableHead>
                <TableHead className="text-xs">{t('projects.resources')}</TableHead>
                <TableHead className="text-xs">{t('projects.created')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
              )) : projects.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">{t('common.noProjects')}</TableCell></TableRow>
              ) : projects.map((proj) => (
                <TableRow key={proj.id}>
                  <TableCell className="font-medium text-xs">{proj.slug}</TableCell>
                  <TableCell className="text-xs">{proj.displayName || '-'}</TableCell>
                  <TableCell className="text-xs font-mono">{proj.orgId?.slice(0, 12)}...</TableCell>
                  <TableCell><Badge variant={proj.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{proj.status}</Badge></TableCell>
                  <TableCell className="text-xs">{proj.visibility}</TableCell>
                  <TableCell className="text-xs">{proj.stats?.countResources ?? '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('projects.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('projects.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('projects.slug')} *</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={t('projects.slugPlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('projects.displayName')}</label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder={t('projects.displayNamePlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('projects.description')}</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>{t('projects.cancel')}</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>{t('projects.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Grants & Roles Tab ────────────────────────────────────────────────

function GrantsTab() {
  const t = useT();
  const { data: me } = useMe();
  const orgId = me?.orgId || '';
  const [showGrant, setShowGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({
    resourceType: '', resourceId: '',
    subjectType: 'user', subjectId: '',
    roleKey: 'viewer', relation: 'viewer',
    reason: '',
  });

  const { data: rolesData, isLoading: rolesLoading } = useIamRoleTemplates();
  const { data: grantsData, isLoading: grantsLoading, refetch: refetchGrants } = useIamGrants(orgId);
  const grantMutation = useIamGrantAccess(orgId);
  const revokeMutation = useIamRevokeAccess(orgId);

  const roleTemplates = rolesData?.roleTemplates || [];
  const grants = grantsData?.grants || [];

  const handleGrant = async () => {
    if (!grantForm.resourceType || !grantForm.resourceId || !grantForm.subjectId) {
      toast.error(t('common.resourceAndSubjectRequired'));
      return;
    }
    try {
      await grantMutation.mutateAsync({
        resource: { type: grantForm.resourceType, id: grantForm.resourceId },
        roleKey: grantForm.roleKey,
        subject: { type: grantForm.subjectId.includes(':') ? grantForm.subjectId.split(':')[0] : grantForm.subjectType, id: grantForm.subjectId.includes(':') ? grantForm.subjectId.split(':').slice(1).join(':') : grantForm.subjectId },
        reason: grantForm.reason,
      });
      toast.success(t('common.accessGranted'));
      setGrantForm({ resourceType: '', resourceId: '', roleKey: 'viewer', relation: 'viewer', subjectType: 'user', subjectId: '', reason: '' });
      setShowGrant(false);
      refetchGrants();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.grantFailed'));
    }
  };

  const handleRevoke = async (grantId: string) => {
    try {
      await revokeMutation.mutateAsync(grantId);
      toast.success(t('common.accessRevoked'));
      refetchGrants();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.revokeFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {/* 概念解释卡：理清 Role Template / Grant / Relationship 的关系 */}
      <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
        <div className="flex items-start gap-2">
          <KeyRound className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
          <div className="space-y-1 text-xs">
            <div className="font-medium text-foreground/80">授权三件套：角色模板 → 授权 → 关系</div>
            <div className="text-muted-foreground leading-relaxed">
              <span className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">Role Template</span> 是可复用的角色定义（例如 "skill:editor"）；
              <span className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">Grant</span> 是把某个角色分配给主体（用户/组）的一次操作；
              <span className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">Relationship</span> 是底层 SpiceDB tuple，最终决定权限是否放行。
              下方"角色模板"列出可分配角色；"活跃授权"列出当前已分配的记录。需要查看更细粒度的权限模型请前往
              <span className="font-medium text-foreground/80">「权限治理 → 权限控制台」</span>。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{t('grants.title')}</span>
                <Badge variant="secondary">{roleTemplates.length}</Badge>
              </CardTitle>
            </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('grants.roleKey')}</TableHead>
                  <TableHead className="text-xs">{t('grants.displayName')}</TableHead>
                  <TableHead className="text-xs">{t('grants.resourceType')}</TableHead>
                  <TableHead className="text-xs">{t('grants.relation')}</TableHead>
                  <TableHead className="text-xs">{t('grants.builtIn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesLoading ? (
                  <TableRow><TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : roleTemplates.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">{t('common.noRoleTemplates')}</TableCell></TableRow>
                ) : roleTemplates.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium text-xs">{rt.roleKey}</TableCell>
                    <TableCell className="text-xs">{rt.displayName || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{rt.resourceType || '-'}</TableCell>
                    <TableCell className="text-xs">{rt.relation || '-'}</TableCell>
                    <TableCell>{rt.builtIn ? <Badge className="text-[10px] bg-green-500">{t('common.yes')}</Badge> : <Badge variant="secondary" className="text-[10px]">{t('common.no')}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('grants.activeGrants')}</span>
              <Badge variant="secondary">{grants.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('grants.resource')}</TableHead>
                  <TableHead className="text-xs">{t('grants.subject')}</TableHead>
                  <TableHead className="text-xs">{t('grants.role')}</TableHead>
                  <TableHead className="text-xs">{t('grants.createdBy')}</TableHead>
                  <TableHead className="text-xs">{t('grants.created')}</TableHead>
                  <TableHead className="text-xs w-16">{t('grants.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grantsLoading ? (
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : grants.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">{t('common.noGrants')}</TableCell></TableRow>
                ) : grants.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-xs font-mono">{g.resource ? `${g.resource.type}:${g.resource.id}` : '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{g.subject ? `${g.subject.type}:${g.subject.id}` : '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{g.roleKey || g.relation || '-'}</Badge></TableCell>
                    <TableCell className="text-xs">{g.createdBy || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRevoke(g.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('grants.grantAccess')}</CardTitle>
            <CardDescription className="text-[10px]">{t('grants.grantDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('grants.resourceType')}</label>
              <Input value={grantForm.resourceType} onChange={(e) => setGrantForm({ ...grantForm, resourceType: e.target.value })} placeholder={t('grants.resourceTypePlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('common.id')}</label>
              <Input value={grantForm.resourceId} onChange={(e) => setGrantForm({ ...grantForm, resourceId: e.target.value })} placeholder={t('grants.resourceIdPlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('common.type')}</label>
              <Select value={grantForm.subjectType} onValueChange={(v) => setGrantForm({ ...grantForm, subjectType: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('grants.user')}</SelectItem>
                  <SelectItem value="group">{t('grants.group')}</SelectItem>
                  <SelectItem value="org">{t('grants.organization')}</SelectItem>
                  <SelectItem value="agent">{t('grants.agent')}</SelectItem>
                  <SelectItem value="service">{t('grants.service')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('common.subject')} ID</label>
              <Input value={grantForm.subjectId} onChange={(e) => setGrantForm({ ...grantForm, subjectId: e.target.value })} placeholder={t('grants.subjectIdPlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('common.role')}</label>
              <Select value={grantForm.roleKey} onValueChange={(v) => setGrantForm({ ...grantForm, roleKey: v, relation: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t('grants.viewer')}</SelectItem>
                  <SelectItem value="consumer">{t('grants.consumer')}</SelectItem>
                  <SelectItem value="editor">{t('grants.editor')}</SelectItem>
                  <SelectItem value="admin">{t('grants.admin')}</SelectItem>
                  <SelectItem value="owner">{t('grants.owner')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('common.reason')} ({t('common.optional')})</label>
              <Input value={grantForm.reason} onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })} placeholder={t('grants.reasonPlaceholder')} className="h-8 text-xs" />
            </div>
            <Button size="sm" className="w-full" onClick={handleGrant} disabled={grantMutation.isPending}>
              <ShieldCheck className="h-3 w-3 mr-1" /> {t('grants.grant')}
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

// ─── Resources Tab ─────────────────────────────────────────────────────

function ResourcesTab() {
  const t = useT();
  const { data: me } = useMe();
  const orgId = me?.orgId || '';
  const [filterType, setFilterType] = useState('');

  const { data: typesData, isLoading: typesLoading } = useIamResourceTypes();
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useIamResources(orgId, filterType ? { type: filterType } : undefined);

  const resourceTypes = typesData?.resourceTypes || [];
  const resources = resourcesData?.resources || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('resources.title')}</span>
              <Badge variant="secondary">{resourceTypes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('resources.type')}</TableHead>
                  <TableHead className="text-xs">{t('resources.displayName')}</TableHead>
                  <TableHead className="text-xs">{t('resources.spicedbType')}</TableHead>
                  <TableHead className="text-xs">{t('resources.grantable')}</TableHead>
                  <TableHead className="text-xs">{t('resources.relations')}</TableHead>
                  <TableHead className="text-xs">{t('resources.permissions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typesLoading ? (
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : resourceTypes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">{t('common.noResourceTypes')}</TableCell></TableRow>
                ) : resourceTypes.map((rt) => (
                  <TableRow key={rt.type}>
                    <TableCell className="font-medium text-xs font-mono">{rt.type}</TableCell>
                    <TableCell className="text-xs">{rt.displayName || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{rt.spicedbType || '-'}</TableCell>
                    <TableCell>{rt.grantable ? <Badge className="text-[10px] bg-green-500">{t('resources.yes')}</Badge> : <Badge variant="secondary" className="text-[10px]">{t('resources.no')}</Badge>}</TableCell>
                    <TableCell className="text-xs">{(rt.relations || []).length}</TableCell>
                    <TableCell className="text-xs">{(rt.permissions || []).length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('resources.resources')}</span>
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder={t('resources.allTypes')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('resources.allTypes')}</SelectItem>
                    {resourceTypes.map((rt) => (
                      <SelectItem key={rt.type} value={rt.type}>{rt.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => refetchResources()}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('resources.type')}</TableHead>
                  <TableHead className="text-xs">{t('resources.id')}</TableHead>
                  <TableHead className="text-xs">{t('resources.displayName')}</TableHead>
                  <TableHead className="text-xs">{t('resources.status')}</TableHead>
                  <TableHead className="text-xs">{t('resources.project')}</TableHead>
                  <TableHead className="text-xs">{t('resources.created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourcesLoading ? (
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : resources.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">{t('common.noResources')}</TableCell></TableRow>
                ) : resources.map((r, i) => (
                  <TableRow key={r.ref?.id || i}>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{r.ref?.type || '-'}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{r.ref?.id || '-'}</TableCell>
                    <TableCell className="text-xs">{r.displayName || '-'}</TableCell>
                    <TableCell><Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{r.status || '-'}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{r.projectId ? r.projectId.slice(0, 12) + '...' : '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('resources.details')}</CardTitle>
          <CardDescription className="text-[10px]">{t('resources.detailsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground text-center py-8">
            {t('resources.detailsHint')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

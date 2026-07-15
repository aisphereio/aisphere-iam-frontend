'use client';

import { useState } from 'react';
import {
  Building2, Folder, KeyRound, ShieldCheck, Database,
  Search, Plus, Pencil, Trash2, RefreshCw, Lightbulb, Info,
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
  useIamOrganizations,
  useIamCreateOrganization,
  useIamUpdateOrganization,
  useIamArchiveOrganization,
  useIamProjects,
  useIamCreateProject,
  useIamUpdateProject,
  useIamArchiveProject,
  useIamCapabilities,
  useIamProjectCapabilities,
  useIamRegisterCapability,
  useIamEnableCapability,
  useIamDisableCapability,
  useIamResourceTypes,
  useIamResources,
  useIamResourceType,
  useIamRegisterResourceType,
  useIamRoleTemplates,
  useIamGrants,
  useIamGrantAccess,
  useIamRevokeAccess,
  useIamRegisterRoleTemplate,
  useIamExplainAccess,
} from '@/hooks/use-iam';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { ExternalUsersPage } from './users-page';
import type { IamCpOrganization, IamProject, IamResourceType, Tab } from '@/lib/api/types';

// ─── Main IAM Page ─────────────────────────────────────────────────────

export function IamPage({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'users':
      return <ExternalUsersPage />;
    case 'organizations':
      return <OrganizationsTab />;
    case 'projects':
      return <ProjectsTab />;
    case 'grants':
      return <GrantsTab />;
    case 'resources':
      return <ResourcesTab />;
    case 'capabilities':
      return <CapabilitiesTab />;
    default:
      return <ExternalUsersPage />;
  }
}

// ─── Organizations Tab ─────────────────────────────────────────────────

function OrganizationsTab() {
  const t = useT();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ slug: '', displayName: '', casdoorOrg: '' });
  const [editForm, setEditForm] = useState({ id: '', displayName: '', plan: '', region: '' });
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; slug: string } | null>(null);

  const { data, isLoading, refetch } = useIamOrganizations();
  const createMutation = useIamCreateOrganization();
  const updateMutation = useIamUpdateOrganization();
  const archiveMutation = useIamArchiveOrganization();
  const organizations = data?.organizations || [];

  const filtered = search
    ? organizations.filter((o) =>
        (o.slug || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.displayName || '').toLowerCase().includes(search.toLowerCase()),
      )
    : organizations;

  const handleCreate = async () => {
    if (!form.slug) { toast.error(t('common.slugRequired')); return; }
    try {
      await createMutation.mutateAsync(form);
      toast.success(t('common.organizationCreated'));
      setForm({ slug: '', displayName: '', casdoorOrg: '' });
      setShowCreate(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.createFailed'));
    }
  };

  const handleEdit = (org: IamCpOrganization) => {
    setEditForm({ id: org.id, displayName: org.displayName || '', plan: org.plan || '', region: org.region || '' });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    try {
      await updateMutation.mutateAsync({
        orgId: editForm.id,
        org: { displayName: editForm.displayName, plan: editForm.plan, region: editForm.region },
      });
      toast.success(t('common.organizationUpdated'));
      setShowEdit(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.updateFailed'));
    }
  };

  const handleArchiveClick = (org: IamCpOrganization) => {
    setArchiveTarget({ id: org.id, slug: org.slug });
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      toast.success(t('common.organizationArchived'));
      setShowArchiveConfirm(false);
      setArchiveTarget(null);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.deleteFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
          <div className="space-y-1">
            <div className="font-medium text-foreground/80">平台组织（CP Organizations）是租户级别的资源</div>
            <div className="text-muted-foreground leading-relaxed">
              每个 CP Organization 对应一个独立的租户，本身是扁平的。如果你需要管理组织内部的上下级层级关系
              （例如：平台 → 业务线 → 团队 → 小组），请前往侧边栏
              <span className="font-medium text-foreground/80">「身份目录 → 组织与用户组」</span>
              ，那里有完整的多级组织树、嵌套卡片和成员管理界面。
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('orgs.search')}
            className="h-8 w-full sm:w-64 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('orgs.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('orgs.slug')}</TableHead>
                <TableHead className="text-xs">{t('orgs.displayName')}</TableHead>
                <TableHead className="text-xs">{t('orgs.status')}</TableHead>
                <TableHead className="text-xs">{t('orgs.casdoorOrg')}</TableHead>
                <TableHead className="text-xs">{t('orgs.plan')}</TableHead>
                <TableHead className="text-xs">{t('orgs.created')}</TableHead>
                <TableHead className="text-xs w-20">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
              )) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">{t('common.noOrganizations')}</TableCell></TableRow>
              ) : filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium text-xs">{org.slug}</TableCell>
                  <TableCell className="text-xs">{org.displayName || '-'}</TableCell>
                  <TableCell><Badge variant={org.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{org.status}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{org.casdoorOrg || '-'}</TableCell>
                  <TableCell className="text-xs">{org.plan || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEdit(org)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleArchiveClick(org)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgs.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('orgs.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('orgs.slug')} *</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={t('orgs.slugPlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('orgs.displayName')}</label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder={t('orgs.displayNamePlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('orgs.casdoorOrg')}</label>
              <Input value={form.casdoorOrg} onChange={(e) => setForm({ ...form, casdoorOrg: e.target.value })} placeholder={t('orgs.casdoorPlaceholder')} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>{t('orgs.cancel')}</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>{t('orgs.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgs.editDialogTitle')}</DialogTitle>
            <DialogDescription>{t('orgs.editDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('orgs.displayName')}</label>
              <Input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} placeholder={t('orgs.displayNamePlaceholder')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('orgs.plan')}</label>
              <Input value={editForm.plan} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })} placeholder={t('orgs.plan')} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('orgs.region')}</label>
              <Input value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} placeholder={t('orgs.regionPlaceholder')} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(false)}>{t('orgs.cancel')}</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>{t('common.update')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgs.archive')}</DialogTitle>
            <DialogDescription>
              {t('orgs.confirmArchive')} {archiveTarget && <span className="font-mono">({archiveTarget.slug})</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowArchiveConfirm(false); setArchiveTarget(null); }}>{t('orgs.cancel')}</Button>
            <Button variant="destructive" size="sm" onClick={handleArchiveConfirm} disabled={archiveMutation.isPending}>{t('orgs.archive')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Projects Tab ──────────────────────────────────────────────────────

function ProjectsTab() {
  const t = useT();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ slug: '', displayName: '', description: '' });
  const [editForm, setEditForm] = useState({ id: '', displayName: '', description: '', visibility: '' });
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; slug: string } | null>(null);

  const { data, isLoading, refetch } = useIamProjects();
  const createMutation = useIamCreateProject();
  const updateMutation = useIamUpdateProject();
  const archiveMutation = useIamArchiveProject();
  const projects = data?.projects || [];

  const filtered = search
    ? projects.filter((p) =>
        (p.slug || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.displayName || '').toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  const handleCreate = async () => {
    if (!form.slug) { toast.error(t('common.slugRequired')); return; }
    try {
      await createMutation.mutateAsync({ slug: form.slug, displayName: form.displayName, description: form.description });
      toast.success(t('common.projectCreated'));
      setForm({ slug: '', displayName: '', description: '' });
      setShowCreate(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.createFailed'));
    }
  };

  const handleEditClick = (proj: IamProject) => {
    setEditForm({ id: proj.id, displayName: proj.displayName || '', description: proj.description || '', visibility: proj.visibility || '' });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    try {
      await updateMutation.mutateAsync({
        projectId: editForm.id,
        project: { displayName: editForm.displayName, description: editForm.description, visibility: editForm.visibility },
      });
      toast.success('项目已更新');
      setShowEdit(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.updateFailed'));
    }
  };

  const handleArchiveClick = (proj: IamProject) => {
    setArchiveTarget({ id: proj.id, slug: proj.slug });
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      toast.success('项目已归档');
      setShowArchiveConfirm(false);
      setArchiveTarget(null);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.deleteFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('projects.search')}
            className="h-8 w-full sm:w-64 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                <TableHead className="text-xs w-20">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
              )) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">{t('common.noProjects')}</TableCell></TableRow>
              ) : filtered.map((proj) => (
                <TableRow key={proj.id}>
                  <TableCell className="font-medium text-xs">{proj.slug}</TableCell>
                  <TableCell className="text-xs">{proj.displayName || '-'}</TableCell>
                  <TableCell className="text-xs font-mono">{proj.orgId?.slice(0, 12)}...</TableCell>
                  <TableCell><Badge variant={proj.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{proj.status}</Badge></TableCell>
                  <TableCell className="text-xs">{proj.visibility}</TableCell>
                  <TableCell className="text-xs">{proj.stats?.countResources ?? '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditClick(proj)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleArchiveClick(proj)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
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

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
            <DialogDescription>更新项目详情</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('projects.displayName')}</label>
              <Input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('projects.description')}</label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('common.visibility')}</label>
              <Select value={editForm.visibility} onValueChange={(v) => setEditForm({ ...editForm, visibility: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="ORG">Org</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(false)}>取消</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>{t('common.update')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>归档项目</DialogTitle>
            <DialogDescription>
              确定要归档此项目吗？{archiveTarget && <span className="font-mono">({archiveTarget.slug})</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowArchiveConfirm(false); setArchiveTarget(null); }}>取消</Button>
            <Button variant="destructive" size="sm" onClick={handleArchiveConfirm} disabled={archiveMutation.isPending}>归档</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Grants & Roles Tab ────────────────────────────────────────────────

function GrantsTab() {
  const t = useT();
  const [showGrant, setShowGrant] = useState(false);
  const [showRegisterRole, setShowRegisterRole] = useState(false);
  const [showExplain, setShowExplain] = useState<{ resource: string; subject: string; role: string; steps: unknown[] } | null>(null);
  const [grantForm, setGrantForm] = useState({
    resourceType: '', resourceId: '',
    subjectType: 'user', subjectId: '',
    roleKey: 'viewer', relation: 'viewer',
    reason: '',
  });
  const [roleForm, setRoleForm] = useState({ resourceType: '', roleKey: '', displayName: '', description: '' });
  const [explainForm, setExplainForm] = useState({ resourceType: '', resourceId: '', subjectType: 'user', subjectId: '', permission: '' });

  const { data: rolesData, isLoading: rolesLoading, refetch: refetchRoles } = useIamRoleTemplates();
  const { data: grantsData, isLoading: grantsLoading, refetch: refetchGrants } = useIamGrants();
  const grantMutation = useIamGrantAccess();
  const revokeMutation = useIamRevokeAccess();
  const registerRoleMutation = useIamRegisterRoleTemplate();
  const explainMutation = useIamExplainAccess();

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

  const handleRegisterRole = async () => {
    if (!roleForm.roleKey) { toast.error('角色键为必填项'); return; }
    try {
      await registerRoleMutation.mutateAsync(roleForm);
      toast.success('角色模板已注册');
      setRoleForm({ resourceType: '', roleKey: '', displayName: '', description: '' });
      setShowRegisterRole(false);
      refetchRoles();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '注册失败');
    }
  };

  const handleExplain = async () => {
    if (!explainForm.resourceType || !explainForm.resourceId || !explainForm.subjectId || !explainForm.permission) {
      toast.error('请填写完整的解释信息');
      return;
    }
    try {
      const result = await explainMutation.mutateAsync({
        resource: { type: explainForm.resourceType, id: explainForm.resourceId },
        permission: explainForm.permission,
        subject: { type: explainForm.subjectType, id: explainForm.subjectId },
      });
      setShowExplain({
        resource: `${explainForm.resourceType}:${explainForm.resourceId}`,
        subject: `${explainForm.subjectType}:${explainForm.subjectId}`,
        role: explainForm.permission,
        steps: result.steps || [],
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '解释失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
        <div className="flex items-start gap-2">
          <KeyRound className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
          <div className="space-y-1 text-xs">
            <div className="font-medium text-foreground/80">授权三件套：角色模板 → 授权 → 关系</div>
            <div className="text-muted-foreground leading-relaxed">
              <span className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">Role Template</span> 是可复用的角色定义；
              <span className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">Grant</span> 是把某个角色分配给主体（用户/组）的一次操作；
              <span className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">Relationship</span> 是底层 SpiceDB tuple，最终决定权限是否放行。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Role Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{t('grants.title')}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{roleTemplates.length}</Badge>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowRegisterRole(true)}>
                    <Plus className="h-3 w-3 mr-1" /> 注册
                  </Button>
                </div>
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

          {/* Active Grants */}
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
                    <TableHead className="text-xs w-24">{t('grants.actions')}</TableHead>
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                            setExplainForm({
                              resourceType: g.resource?.type || '',
                              resourceId: g.resource?.id || '',
                              subjectType: g.subject?.type || 'user',
                              subjectId: g.subject?.id || '',
                              permission: g.roleKey || g.relation || '',
                            });
                            handleExplain();
                          }}>
                            <Info className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRevoke(g.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Grant Access Form */}
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

          {/* Explain Access Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">权限解释</CardTitle>
              <CardDescription className="text-[10px]">查询授权链</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">资源类型</label>
                <Input value={explainForm.resourceType} onChange={(e) => setExplainForm({ ...explainForm, resourceType: e.target.value })} placeholder="skill" className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">资源 ID</label>
                <Input value={explainForm.resourceId} onChange={(e) => setExplainForm({ ...explainForm, resourceId: e.target.value })} placeholder="resource-id" className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">主体</label>
                <div className="flex gap-2">
                  <Select value={explainForm.subjectType} onValueChange={(v) => setExplainForm({ ...explainForm, subjectType: v })}>
                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="group">group</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={explainForm.subjectId} onChange={(e) => setExplainForm({ ...explainForm, subjectId: e.target.value })} placeholder="user-id" className="h-8 text-xs flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">权限</label>
                <Input value={explainForm.permission} onChange={(e) => setExplainForm({ ...explainForm, permission: e.target.value })} placeholder="e.g. view" className="h-8 text-xs" />
              </div>
              <Button size="sm" className="w-full" variant="outline" onClick={handleExplain} disabled={explainMutation.isPending}>
                <Info className="h-3 w-3 mr-1" /> 解释权限
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Register Role Template Dialog */}
      <Dialog open={showRegisterRole} onOpenChange={setShowRegisterRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注册角色模板</DialogTitle>
            <DialogDescription>创建一个新的角色模板</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">角色键 *</label>
              <Input value={roleForm.roleKey} onChange={(e) => setRoleForm({ ...roleForm, roleKey: e.target.value })} placeholder="my-role" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">资源类型</label>
              <Input value={roleForm.resourceType} onChange={(e) => setRoleForm({ ...roleForm, resourceType: e.target.value })} placeholder="skill" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">显示名称</label>
              <Input value={roleForm.displayName} onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })} placeholder="My Role" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">描述</label>
              <Textarea value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRegisterRole(false)}>取消</Button>
            <Button size="sm" onClick={handleRegisterRole} disabled={registerRoleMutation.isPending}>注册</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Explain Result Dialog */}
      <Dialog open={!!showExplain} onOpenChange={(open) => { if (!open) setShowExplain(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>权限解释结果</DialogTitle>
            <DialogDescription>
              {showExplain && `${showExplain.subject} → ${showExplain.role} → ${showExplain.resource}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {showExplain?.steps && showExplain.steps.length > 0 ? (
              showExplain.steps.map((step, i) => (
                <div key={i} className="text-xs p-2 rounded bg-muted/50 font-mono">
                  {typeof step === 'string' ? step : JSON.stringify(step, null, 2)}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">无详细步骤信息</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowExplain(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Resources Tab ─────────────────────────────────────────────────────

function ResourcesTab() {
  const t = useT();
  const [filterType, setFilterType] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [showRegisterType, setShowRegisterType] = useState(false);
  const [typeForm, setTypeForm] = useState({ type: '', displayName: '', description: '' });

  const { data: typesData, isLoading: typesLoading, refetch: refetchTypes } = useIamResourceTypes();
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useIamResources(filterType ? { type: filterType } : {});
  const { data: rtDetail } = useIamResourceType(selectedResourceType || '');
  const registerTypeMutation = useIamRegisterResourceType();

  const resourceTypes = typesData?.resourceTypes || [];
  const resources = resourcesData?.resources || [];

  const handleRegisterType = async () => {
    if (!typeForm.type) { toast.error('资源类型为必填项'); return; }
    try {
      await registerTypeMutation.mutateAsync(typeForm);
      toast.success('资源类型已注册');
      setTypeForm({ type: '', displayName: '', description: '' });
      setShowRegisterType(false);
      refetchTypes();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '注册失败');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{t('resources.title')}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{resourceTypes.length}</Badge>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowRegisterType(true)}>
                  <Plus className="h-3 w-3 mr-1" /> 注册
                </Button>
              </div>
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
                  <TableRow
                    key={rt.type}
                    className={`cursor-pointer ${selectedResourceType === rt.type ? 'bg-accent/50' : ''}`}
                    onClick={() => setSelectedResourceType(selectedResourceType === rt.type ? null : rt.type)}
                  >
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
                  <SelectTrigger className="h-7 text-xs w-full sm:w-36"><SelectValue placeholder={t('resources.allTypes')} /></SelectTrigger>
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

      {/* Resource Type Detail Card */}
      <Card className="h-fit sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('resources.details')}</CardTitle>
          <CardDescription className="text-[10px]">{t('resources.detailsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedResourceType && rtDetail ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-medium">类型：</span>
                <span className="font-mono">{rtDetail.type}</span>
              </div>
              {rtDetail.displayName && <div><span className="font-medium">显示名称：</span>{rtDetail.displayName}</div>}
              {rtDetail.description && <div><span className="font-medium">描述：</span>{rtDetail.description}</div>}
              {rtDetail.spicedbType && <div><span className="font-medium">SpiceDB 类型：</span><span className="font-mono">{rtDetail.spicedbType}</span></div>}
              {rtDetail.relations && rtDetail.relations.length > 0 && (
                <div>
                  <span className="font-medium">关系：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rtDetail.relations.map((rel) => (
                      <Badge key={rel} variant="outline" className="text-[10px]">{rel}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {rtDetail.permissions && rtDetail.permissions.length > 0 && (
                <div>
                  <span className="font-medium">权限：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rtDetail.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-[10px]">{perm}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div><span className="font-medium">可授权：</span>{rtDetail.grantable ? '是' : '否'}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8">
              {t('resources.detailsHint')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Resource Type Dialog */}
      <Dialog open={showRegisterType} onOpenChange={setShowRegisterType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注册资源类型</DialogTitle>
            <DialogDescription>创建一个新的资源类型定义</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">类型 *</label>
              <Input value={typeForm.type} onChange={(e) => setTypeForm({ ...typeForm, type: e.target.value })} placeholder="my-resource" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">显示名称</label>
              <Input value={typeForm.displayName} onChange={(e) => setTypeForm({ ...typeForm, displayName: e.target.value })} placeholder="My Resource" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">描述</label>
              <Textarea value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRegisterType(false)}>取消</Button>
            <Button size="sm" onClick={handleRegisterType} disabled={registerTypeMutation.isPending}>注册</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Capabilities Tab ──────────────────────────────────────────────────

function CapabilitiesTab() {
  const t = useT();
  const [showRegister, setShowRegister] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [capForm, setCapForm] = useState({ name: '', displayName: '', ownerService: '' });

  const { data: capsData, isLoading: capsLoading, refetch: refetchCaps } = useIamCapabilities();
  const { data: projCapsData, isLoading: projCapsLoading, refetch: refetchProjCaps } = useIamProjectCapabilities(selectedProject);
  const { data: projectsData } = useIamProjects();
  const registerMutation = useIamRegisterCapability();
  const enableMutation = useIamEnableCapability();
  const disableMutation = useIamDisableCapability();

  const capabilities = capsData?.capabilities || [];
  const projectCapabilities = projCapsData?.capabilities || [];
  const projects = projectsData?.projects || [];

  const handleRegister = async () => {
    if (!capForm.name) { toast.error('能力名称为必填项'); return; }
    try {
      await registerMutation.mutateAsync(capForm);
      toast.success('能力已注册');
      setCapForm({ name: '', displayName: '', ownerService: '' });
      setShowRegister(false);
      refetchCaps();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '注册失败');
    }
  };

  const handleToggleCapability = async (capabilityId: string, enabled: boolean) => {
    if (!selectedProject) return;
    try {
      if (enabled) {
        await disableMutation.mutateAsync({ projectId: selectedProject, capabilityId });
        toast.success('能力已禁用');
      } else {
        await enableMutation.mutateAsync({ projectId: selectedProject, capabilityId });
        toast.success('能力已启用');
      }
      refetchProjCaps();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
          <div className="space-y-1">
            <div className="font-medium text-foreground/80">能力管理</div>
            <div className="text-muted-foreground leading-relaxed">
              能力（Capability）是平台提供的功能模块，例如 IAM、Hub、Git、Agent 等。
              你可以在此注册新的能力，并为每个项目启用或禁用特定能力。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Capabilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>系统能力</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{capabilities.length}</Badge>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowRegister(true)}>
                  <Plus className="h-3 w-3 mr-1" /> 注册
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">名称</TableHead>
                  <TableHead className="text-xs">显示名称</TableHead>
                  <TableHead className="text-xs">所属服务</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capsLoading ? (
                  <TableRow><TableCell colSpan={4}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : capabilities.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">暂无能力</TableCell></TableRow>
                ) : capabilities.map((cap) => (
                  <TableRow key={cap.id}>
                    <TableCell className="font-medium text-xs font-mono">{cap.name}</TableCell>
                    <TableCell className="text-xs">{cap.displayName || '-'}</TableCell>
                    <TableCell className="text-xs">{cap.ownerService || '-'}</TableCell>
                    <TableCell><Badge variant={cap.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{cap.status || 'ACTIVE'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Project Capabilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>项目能力</span>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-7 text-xs w-full sm:w-40">
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.slug}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">能力 ID</TableHead>
                  <TableHead className="text-xs">状态</TableHead>
                  <TableHead className="text-xs w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedProject ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">请先选择一个项目</TableCell></TableRow>
                ) : projCapsLoading ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ) : projectCapabilities.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">该项目暂无能力</TableCell></TableRow>
                ) : projectCapabilities.map((pc) => (
                  <TableRow key={`${pc.projectId}-${pc.capabilityId}`}>
                    <TableCell className="text-xs font-mono">{pc.capabilityId}</TableCell>
                    <TableCell>
                      <Badge variant={pc.enabled ? 'default' : 'secondary'} className="text-[10px]">
                        {pc.enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={pc.enabled ? 'destructive' : 'default'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleToggleCapability(pc.capabilityId, pc.enabled)}
                        disabled={enableMutation.isPending || disableMutation.isPending}
                      >
                        {pc.enabled ? '禁用' : '启用'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Register Capability Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注册能力</DialogTitle>
            <DialogDescription>创建一个新的平台能力</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">名称 *</label>
              <Input value={capForm.name} onChange={(e) => setCapForm({ ...capForm, name: e.target.value })} placeholder="my-capability" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">显示名称</label>
              <Input value={capForm.displayName} onChange={(e) => setCapForm({ ...capForm, displayName: e.target.value })} placeholder="My Capability" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">所属服务</label>
              <Input value={capForm.ownerService} onChange={(e) => setCapForm({ ...capForm, ownerService: e.target.value })} placeholder="aisphere-iam" className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRegister(false)}>取消</Button>
            <Button size="sm" onClick={handleRegister} disabled={registerMutation.isPending}>注册</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
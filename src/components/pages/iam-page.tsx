'use client';

import { useState } from 'react';
import {
  Users, Building2, FolderKanban, KeyRound, ShieldCheck, Database,
  Plus, Trash2, Save, Pencil, X, Search, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  useIamUsers,
  useIamSaveUser,
  useIamDeleteUser,
  useIamOrganizations,
  useIamCreateOrganization,
  useIamUpdateOrganization,
  useIamArchiveOrganization,
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
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import type { LocalUser, IamCpOrganization, Tab } from '@/lib/api/types';

// ─── Main IAM Page ─────────────────────────────────────────────────────
// Content is driven by the sidebar navigation — no horizontal tab bar.

export function IamPage({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'users':
      return <LocalUsersTab />;
    case 'organizations':
      return <OrganizationsTab />;
    case 'projects':
      return <ProjectsTab />;
    case 'grants':
      return <GrantsTab />;
    case 'resources':
      return <ResourcesTab />;
    default:
      return <LocalUsersTab />;
  }
}

// ─── Local Users Tab ───────────────────────────────────────────────────

function LocalUsersTab() {
  const t = useT();
  const [form, setForm] = useState<LocalUser & { password?: string }>({
    username: '', password: '', subjectType: 'human', roles: ['agent'], permissions: ['skill:read'], namespaces: ['public'],
  });
  const [editing, setEditing] = useState(false);

  const { data, isLoading, refetch } = useIamUsers();
  const items = data?.users || [];
  const saveMutation = useIamSaveUser();
  const deleteMutation = useIamDeleteUser();

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(form);
      toast.success(editing ? t('common.userUpdated') : t('common.userCreated'));
      setForm({ username: '', password: '', subjectType: 'human', roles: ['agent'], permissions: ['skill:read'], namespaces: ['public'] });
      setEditing(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.saveFailed'));
    }
  };

  const handleDelete = async (username: string) => {
    try {
      await deleteMutation.mutateAsync(username);
      toast.success(t('common.userDeleted'));
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.deleteFailed'));
    }
  };

  const handleEdit = (u: LocalUser) => {
    setForm({ ...u, password: '' });
    setEditing(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              {t('users.title')}
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('users.username')}</TableHead>
                  <TableHead className="text-xs">{t('users.subjectId')}</TableHead>
                  <TableHead className="text-xs">{t('users.type')}</TableHead>
                  <TableHead className="text-xs">{t('users.roles')}</TableHead>
                  <TableHead className="text-xs">{t('common.status')}</TableHead>
                  <TableHead className="text-xs w-20">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                )) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">{t('common.noUsers')}</TableCell></TableRow>
                ) : items.map((u) => (
                  <TableRow key={u.username}>
                    <TableCell className="font-medium text-xs">{u.username}</TableCell>
                    <TableCell className="text-xs font-mono">{u.subjectId || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{u.subjectType}</Badge></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{(u.roles || []).map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}</div></TableCell>
                    <TableCell>{u.disabled ? <Badge variant="destructive" className="text-[10px]">{t('users.disabled')}</Badge> : <Badge variant="default" className="text-[10px] bg-green-500">{t('users.active')}</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEdit(u)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(u.username)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{editing ? t('users.edit') : t('users.create')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.username')}</label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.password')}</label>
            <Input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? t('users.passwordKeepPlaceholder') : t('users.passwordPlaceholder')} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.subjectId')}</label>
            <Input value={form.subjectId || ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} placeholder={t('users.subjectIdPlaceholder')} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.type')}</label>
            <Select value={form.subjectType || 'human'} onValueChange={(v) => setForm({ ...form, subjectType: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="human">{t('users.human')}</SelectItem>
                <SelectItem value="agent">{t('users.agent')}</SelectItem>
                <SelectItem value="service">{t('users.service')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.roles')} ({t('common.commaSeparated')})</label>
            <Input value={(form.roles || []).join(',')} onChange={(e) => setForm({ ...form, roles: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.permissions')} ({t('common.onePerLine')})</label>
            <Textarea value={(form.permissions || []).join('\n')} onChange={(e) => setForm({ ...form, permissions: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })} rows={3} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('users.namespaces')} ({t('common.commaSeparated')})</label>
            <Input value={(form.namespaces || []).join(',')} onChange={(e) => setForm({ ...form, namespaces: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} className="h-8 text-xs" />
          </div>
          <div className="flex gap-2">
            {editing && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(false); setForm({ username: '', password: '', subjectType: 'human', roles: ['agent'], permissions: ['skill:read'], namespaces: ['public'] }); }}>
                <X className="h-3 w-3 mr-1" /> {t('users.cancel')}
              </Button>
            )}
            <Button size="sm" className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-500" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-3 w-3 mr-1" /> {editing ? t('users.update') : t('users.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('orgs.search')}
            className="h-8 w-64 text-xs"
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
  const [form, setForm] = useState({ orgId: '', slug: '', displayName: '', description: '' });

  const { data, isLoading, refetch } = useIamProjects();
  const { data: orgsData } = useIamOrganizations();
  const createMutation = useIamCreateProject();
  const projects = data?.projects || [];
  const organizations = orgsData?.organizations || [];

  const handleCreate = async () => {
    if (!form.slug || !form.orgId) { toast.error(t('common.slugAndOrgRequired')); return; }
    try {
      await createMutation.mutateAsync({ orgId: form.orgId, slug: form.slug, displayName: form.displayName, description: form.description });
      toast.success(t('common.projectCreated'));
      setForm({ orgId: '', slug: '', displayName: '', description: '' });
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
              <label className="text-xs font-medium">{t('projects.organization')} *</label>
              <Select value={form.orgId} onValueChange={(v) => setForm({ ...form, orgId: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('projects.selectOrg')} /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.slug}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
  const [showGrant, setShowGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({
    resourceType: '', resourceId: '',
    subjectType: 'user', subjectId: '',
    roleKey: 'viewer', relation: 'viewer',
    reason: '',
  });

  const { data: rolesData, isLoading: rolesLoading } = useIamRoleTemplates();
  const { data: grantsData, isLoading: grantsLoading, refetch: refetchGrants } = useIamGrants();
  const grantMutation = useIamGrantAccess();
  const revokeMutation = useIamRevokeAccess();

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
  );
}

// ─── Resources Tab ─────────────────────────────────────────────────────

function ResourcesTab() {
  const t = useT();
  const [filterType, setFilterType] = useState('');

  const { data: typesData, isLoading: typesLoading } = useIamResourceTypes();
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useIamResources(filterType ? { type: filterType } : {});

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
'use client';

import { useState } from 'react';
import {
  Search, Plus, Pencil, Trash2, RefreshCw, Lightbulb,
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
} from '@/hooks/use-iam';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { ExternalUsersPage } from './users-page';
import type { IamProject, IamResourceType, Tab } from '@/lib/api/types';

// ─── Main IAM Page ─────────────────────────────────────────────────────

export function IamPage({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'users':
      return <ExternalUsersPage />;
    case 'projects':
      return <ProjectsTab />;
    case 'resources':
      return <ResourcesTab />;
    case 'capabilities':
      return <CapabilitiesTab />;
    default:
      return <ExternalUsersPage />;
  }
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
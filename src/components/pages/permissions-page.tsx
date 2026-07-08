'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, GitBranch, KeyRound, Layers3, ListChecks, RefreshCw, Route, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useIamAuthzCatalog,
  useIamAuthzRelationships,
  useIamAuthzSchema,
  useIamCheckAuthzPermission,
  useIamDeleteAuthzRelationships,
  useIamEffectivePermissions,
  useIamExplainAuthzPermission,
  useIamPublishAuthzSchema,
  useIamValidateAuthzSchema,
  useIamWriteAuthzRelationship,
} from '@/hooks/use-authz';
import { useMe } from '@/hooks/use-auth';
import type { IamRelationship } from '@/lib/api/types';
import {
  buildFriendlyResourceModels,
  expressionToFriendlyText,
  permissionLabel,
  relationLabel,
  type FriendlyPermission,
  type FriendlyResourceModel,
} from '@/lib/authz/schema-summary';
import { toast } from 'sonner';

const DEFAULT_PERMISSIONS = 'view_users,manage_users,view_groups,manage_groups,view_permissions,manage_permissions';
const DEFAULT_RESOURCE_ID: Record<string, string> = {
  zone: 'aisphere',
  iam_authz: 'global',
};

export function PermissionsPage() {
  const schemaQuery = useIamAuthzSchema();
  const catalogQuery = useIamAuthzCatalog();
  const { data: principal } = useMe();

  const [schemaDraft, setSchemaDraft] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('zone');
  const [relationship, setRelationship] = useState<IamRelationship>({
    resource: { type: 'zone', id: 'aisphere' },
    relation: 'owner',
    subject: { type: 'user', id: '' },
  });
  const [filter, setFilter] = useState({ resourceType: 'zone', resourceId: 'aisphere', relation: '', subjectType: '', subjectId: '' });
  const [checkForm, setCheckForm] = useState({
    subjectType: 'user',
    subjectId: '',
    resourceType: 'zone',
    resourceId: 'aisphere',
    permission: 'view_users',
    permissions: DEFAULT_PERMISSIONS,
  });

  const relationshipsQuery = useIamAuthzRelationships(filter);
  const validateSchema = useIamValidateAuthzSchema();
  const publishSchema = useIamPublishAuthzSchema();
  const writeRelationship = useIamWriteAuthzRelationship();
  const deleteRelationships = useIamDeleteAuthzRelationships();
  const checkPermission = useIamCheckAuthzPermission();
  const explainPermission = useIamExplainAuthzPermission();
  const effectivePermissions = useIamEffectivePermissions();

  useEffect(() => {
    if (schemaQuery.data?.text && !schemaDraft) {
      setSchemaDraft(schemaQuery.data.text);
    }
  }, [schemaQuery.data?.text, schemaDraft]);

  useEffect(() => {
    if (!principal?.subjectId) return;
    setCheckForm((prev) => prev.subjectId ? prev : {
      ...prev,
      subjectType: principal.subjectType || 'user',
      subjectId: principal.subjectId,
    });
    setRelationship((prev) => prev.subject.id ? prev : {
      ...prev,
      subject: { ...prev.subject, type: principal.subjectType || 'user', id: principal.subjectId },
    });
  }, [principal?.subjectId, principal?.subjectType]);

  const resourceModels = useMemo(
    () => buildFriendlyResourceModels(catalogQuery.data?.resourceTypes, catalogQuery.data?.roleTemplates, schemaQuery.data?.text || ''),
    [catalogQuery.data?.resourceTypes, catalogQuery.data?.roleTemplates, schemaQuery.data?.text],
  );

  useEffect(() => {
    if (resourceModels.length === 0) return;
    if (!resourceModels.some((resource) => resource.type === selectedResourceType)) {
      setSelectedResourceType(resourceModels[0].type);
    }
  }, [resourceModels, selectedResourceType]);

  const selectedResource = resourceModels.find((resource) => resource.type === selectedResourceType) || resourceModels[0];
  const activeRelationships = relationshipsQuery.data?.relationships || [];
  const modelStats = useMemo(() => summarizeModels(resourceModels), [resourceModels]);
  const relationshipPreview = useMemo(() => {
    const subject = `${relationship.subject.type}:${relationship.subject.id || '<subject-id>'}${relationship.subject.relation ? `#${relationship.subject.relation}` : ''}`;
    return `${relationship.resource.type}:${relationship.resource.id || '<resource-id>'}#${relationship.relation || '<relation>'}@${subject}`;
  }, [relationship]);

  const handleSelectResource = (resource: FriendlyResourceModel) => {
    const resourceId = DEFAULT_RESOURCE_ID[resource.type] || '';
    const relation = firstWritableRelation(resource) || 'owner';
    const permission = resource.permissions[0]?.key || 'view';
    setSelectedResourceType(resource.type);
    setRelationship((prev) => ({
      ...prev,
      resource: { type: resource.type, id: resourceId },
      relation,
    }));
    setFilter((prev) => ({ ...prev, resourceType: resource.type, resourceId }));
    setCheckForm((prev) => ({
      ...prev,
      resourceType: resource.type,
      resourceId,
      permission,
      permissions: resource.permissions.map((p) => p.key).join(','),
    }));
  };

  const fillCurrentUserAsZoneOwner = () => {
    const subjectId = principal?.subjectId || checkForm.subjectId;
    if (!subjectId) {
      toast.error('当前用户 subject id 为空，请先确认 /v1/iam/me 返回正常');
      return;
    }
    setRelationship({
      resource: { type: 'zone', id: 'aisphere' },
      relation: 'owner',
      subject: { type: principal?.subjectType || checkForm.subjectType || 'user', id: subjectId },
    });
    setFilter({ resourceType: 'zone', resourceId: 'aisphere', relation: 'owner', subjectType: '', subjectId: '' });
  };

  const handleValidate = async () => {
    try {
      await validateSchema.mutateAsync(schemaDraft);
      toast.success('Schema 校验通过');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Schema 校验失败');
    }
  };

  const handlePublish = async () => {
    try {
      await publishSchema.mutateAsync(schemaDraft);
      toast.success('Schema 已发布');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Schema 发布失败');
    }
  };

  const handleWriteRelationship = async () => {
    if (!relationship.resource.type || !relationship.resource.id || !relationship.relation || !relationship.subject.type || !relationship.subject.id) {
      toast.error('授权字段不完整');
      return;
    }
    try {
      await writeRelationship.mutateAsync(relationship);
      toast.success('授权关系已写入');
      relationshipsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '授权关系写入失败');
    }
  };

  const handleDeleteRelationship = async (rel: IamRelationship) => {
    try {
      await deleteRelationships.mutateAsync({
        resourceType: rel.resource.type,
        resourceId: rel.resource.id,
        relation: rel.relation,
        subjectType: rel.subject.type,
        subjectId: rel.subject.id,
        subjectRelation: rel.subject.relation,
      });
      toast.success('授权关系已删除');
      relationshipsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '授权关系删除失败');
    }
  };

  const permissionRequest = {
    subject: { type: checkForm.subjectType, id: checkForm.subjectId },
    resource: { type: checkForm.resourceType, id: checkForm.resourceId },
    permission: checkForm.permission,
    orgId: principal?.orgId || 'aisphere',
  };

  const handleCheck = async () => {
    if (!checkForm.subjectId || !checkForm.resourceType || !checkForm.resourceId || !checkForm.permission) {
      toast.error('请填写用户/资源/权限');
      return;
    }
    try {
      await checkPermission.mutateAsync(permissionRequest);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '权限检查失败');
    }
  };

  const handleExplain = async () => {
    if (!checkForm.subjectId || !checkForm.resourceType || !checkForm.resourceId || !checkForm.permission) {
      toast.error('请填写用户/资源/权限');
      return;
    }
    try {
      await explainPermission.mutateAsync(permissionRequest);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '权限解释失败');
    }
  };

  const handleEffective = async () => {
    if (!checkForm.subjectId || !checkForm.resourceType || !checkForm.resourceId) {
      toast.error('请填写用户和资源');
      return;
    }
    try {
      await effectivePermissions.mutateAsync({
        subjectType: checkForm.subjectType,
        subjectId: checkForm.subjectId,
        resourceType: checkForm.resourceType,
        resourceId: checkForm.resourceId,
        permissions: checkForm.permissions.split(',').map((v) => v.trim()).filter(Boolean),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '有效权限查询失败');
    }
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> 权限控制台
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            以资源类型、关系、权限表达式和继承链展示当前 SpiceDB 权限模型；Schema 原文只保留在高级模式。
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { schemaQuery.refetch(); catalogQuery.refetch(); relationshipsQuery.refetch(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> 刷新
        </Button>
      </div>

      <ModelOverview stats={modelStats} activeRelationshipCount={activeRelationships.length} schemaVersion={schemaQuery.data?.version} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> 权限模型地图</CardTitle>
            <CardDescription>
              左侧选择资源类型，右侧会展示它的可授予关系、可检查权限、权限来源和继承路径。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {resourceModels.length === 0 ? (
                <div className="text-sm text-muted-foreground">正在加载权限模型...</div>
              ) : resourceModels.map((resource) => (
                <button
                  key={resource.type}
                  type="button"
                  onClick={() => handleSelectResource(resource)}
                  className={`rounded-lg border p-3 text-left transition hover:bg-muted ${selectedResourceType === resource.type ? 'border-primary bg-muted/60' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{resource.label}</div>
                    <Badge variant="secondary" className="text-[10px]">{resource.type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>{resource.permissions.length} 权限</span>
                    <span>·</span>
                    <span>{resource.relations.length} 关系</span>
                    {resource.roles.length > 0 ? <><span>·</span><span>{resource.roles.length} 角色模板</span></> : null}
                    {resource.inheritedRelations.length > 0 ? <><span>·</span><span>{resource.inheritedRelations.length} 继承入口</span></> : null}
                  </div>
                </button>
              ))}
            </div>

            {selectedResource ? <ResourceDetail resource={selectedResource} /> : null}

            <details className="rounded-lg border bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">高级：Schema 原文 / 校验 / 发布</summary>
              <div className="mt-3 space-y-3">
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
                  仅在修改底层权限模型时使用。普通授权、撤销授权、权限检查请使用下方表单。
                </div>
                <Textarea
                  className="font-mono text-xs min-h-[320px]"
                  value={schemaDraft}
                  onChange={(e) => setSchemaDraft(e.target.value)}
                  placeholder={schemaQuery.isLoading ? '正在加载 schema...' : 'SpiceDB schema'}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleValidate} disabled={validateSchema.isPending || !schemaDraft}>
                    校验 Schema
                  </Button>
                  <Button size="sm" onClick={handlePublish} disabled={publishSchema.isPending || !schemaDraft}>
                    <UploadCloud className="h-3.5 w-3.5 mr-1" /> 发布 Schema
                  </Button>
                  {schemaQuery.data?.version ? <Badge variant="secondary">{schemaQuery.data.version}</Badge> : null}
                  <Badge variant="outline" className="text-[10px]">{catalogQuery.data?.resourceTypes?.length ? 'Catalog + Schema 合并视图' : 'Schema 解析视图'}</Badge>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> 权限检查</CardTitle>
            <CardDescription>检查某个用户、服务或用户组成员是否拥有资源权限。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="主体类型" value={checkForm.subjectType} onChange={(v) => setCheckForm({ ...checkForm, subjectType: v })} />
            <Field label="主体 ID" value={checkForm.subjectId} onChange={(v) => setCheckForm({ ...checkForm, subjectId: v })} placeholder="user uuid / group id" />
            <Field label="资源类型" value={checkForm.resourceType} onChange={(v) => setCheckForm({ ...checkForm, resourceType: v })} />
            <Field label="资源 ID" value={checkForm.resourceId} onChange={(v) => setCheckForm({ ...checkForm, resourceId: v })} />
            <SelectField
              label="检查权限"
              value={checkForm.permission}
              options={(selectedResource?.permissions || []).map((p) => ({ value: p.key, label: `${p.label} (${p.key})` }))}
              fallbackValue={checkForm.permission}
              onChange={(v) => setCheckForm({ ...checkForm, permission: v })}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCheck} disabled={checkPermission.isPending}>检查</Button>
              <Button size="sm" variant="outline" onClick={handleExplain} disabled={explainPermission.isPending}>解释</Button>
            </div>
            {checkPermission.data ? <DecisionCard title="检查结果" data={checkPermission.data} /> : null}
            {explainPermission.data ? <DecisionCard title="解释结果" data={explainPermission.data} /> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> 授权给用户 / 用户组</CardTitle>
            <CardDescription>写入一条授权关系。建议优先选择角色模板，而不是手写 relationship。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={fillCurrentUserAsZoneOwner}>当前用户设为用户源 Owner</Button>
              <Button size="sm" variant="outline" onClick={() => setRelationship({ ...relationship, relation: 'user_viewer' })}>授予用户查看员</Button>
            </div>
            <Field label="资源类型" value={relationship.resource.type} onChange={(v) => setRelationship({ ...relationship, resource: { ...relationship.resource, type: v } })} />
            <Field label="资源 ID" value={relationship.resource.id} onChange={(v) => setRelationship({ ...relationship, resource: { ...relationship.resource, id: v } })} />
            <SelectField
              label="授予角色 / 关系"
              value={relationship.relation}
              fallbackValue={relationship.relation}
              options={relationshipOptions(selectedResource)}
              onChange={(v) => setRelationship({ ...relationship, relation: v })}
            />
            <Field label="主体类型" value={relationship.subject.type} onChange={(v) => setRelationship({ ...relationship, subject: { ...relationship.subject, type: v } })} />
            <Field label="主体 ID" value={relationship.subject.id} onChange={(v) => setRelationship({ ...relationship, subject: { ...relationship.subject, id: v } })} placeholder="user uuid / group id" />
            <Field label="主体关系" value={relationship.subject.relation || ''} onChange={(v) => setRelationship({ ...relationship, subject: { ...relationship.subject, relation: v } })} placeholder="用户组授权填 member，可空" />
            <div className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono break-all">{relationshipPreview}</div>
            <Button size="sm" onClick={handleWriteRelationship} disabled={writeRelationship.isPending}>写入授权关系</Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">授权关系列表</CardTitle>
            <CardDescription>按资源、角色或主体过滤现有授权关系。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input className="h-8 text-xs" placeholder="资源类型" value={filter.resourceType} onChange={(e) => setFilter({ ...filter, resourceType: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="资源 ID" value={filter.resourceId} onChange={(e) => setFilter({ ...filter, resourceId: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="角色/关系" value={filter.relation} onChange={(e) => setFilter({ ...filter, relation: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="主体类型" value={filter.subjectType} onChange={(e) => setFilter({ ...filter, subjectType: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="主体 ID" value={filter.subjectId} onChange={(e) => setFilter({ ...filter, subjectId: e.target.value })} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">资源</TableHead>
                  <TableHead className="text-xs">角色/关系</TableHead>
                  <TableHead className="text-xs">主体</TableHead>
                  <TableHead className="text-xs w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationshipsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground">加载中...</TableCell></TableRow>
                ) : activeRelationships.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground">暂无授权关系</TableCell></TableRow>
                ) : activeRelationships.map((rel, idx) => (
                  <TableRow key={`${rel.resource.type}:${rel.resource.id}:${rel.relation}:${rel.subject.type}:${rel.subject.id}:${idx}`}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{resourceName(rel.resource.type)}</div>
                      <div className="font-mono text-muted-foreground">{rel.resource.type}:{rel.resource.id}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{relationLabel(rel.relation)}</div>
                      <div className="font-mono text-muted-foreground">{rel.relation}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{rel.subject.type}:{rel.subject.id}{rel.subject.relation ? `#${rel.subject.relation}` : ''}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDeleteRelationship(rel)} disabled={deleteRelationships.isPending}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">有效权限视图</CardTitle>
          <CardDescription>批量检查用户在某资源上的权限集合，适合排查“为什么看不到/为什么能操作”。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="权限集合 CSV" value={checkForm.permissions} onChange={(v) => setCheckForm({ ...checkForm, permissions: v })} />
          <Button size="sm" variant="outline" onClick={handleEffective} disabled={effectivePermissions.isPending}>查询有效权限</Button>
          {effectivePermissions.data ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {Object.entries(effectivePermissions.data.permissions || {}).map(([permission, result]) => (
                <div key={permission} className="rounded-md border p-2">
                  <div className="text-xs font-medium truncate">{permissionLabel(permission)}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">{permission}</div>
                  <Badge variant={result.allowed ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                    {result.allowed ? '允许' : '拒绝'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ModelOverview({ stats, activeRelationshipCount, schemaVersion }: { stats: ModelStats; activeRelationshipCount: number; schemaVersion?: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <MetricCard icon={<Layers3 className="h-4 w-4" />} label="资源类型" value={stats.resources} helper="definition / resource type" />
      <MetricCard icon={<GitBranch className="h-4 w-4" />} label="关系" value={stats.relations} helper="可写入 relationship" />
      <MetricCard icon={<ListChecks className="h-4 w-4" />} label="权限" value={stats.permissions} helper="可 CheckPermission" />
      <MetricCard icon={<Route className="h-4 w-4" />} label="继承入口" value={stats.inheritanceEdges} helper="parent / zone / backing" />
      <MetricCard icon={<Database className="h-4 w-4" />} label="当前关系" value={activeRelationshipCount} helper={schemaVersion || 'filtered relationships'} />
    </div>
  );
}

function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: number; helper: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-[10px] text-muted-foreground truncate">{helper}</div>
      </CardContent>
    </Card>
  );
}

function ResourceDetail({ resource }: { resource: FriendlyResourceModel }) {
  const directRelations = resource.relations.filter((relation) => !resource.inheritedRelations.some((item) => item.key === relation.key));
  return (
    <div className="rounded-lg border p-3 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{resource.label}</div>
          <div className="text-xs text-muted-foreground mt-1">{resource.description}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Badge variant="outline" className="text-[10px]">
            {resource.source === 'merged' ? 'Catalog + Schema' : resource.source === 'control-plane' ? '后端资源模型' : 'Schema 解析'}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">{resource.type}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MiniStat label="可授予关系" value={resource.relations.length} />
        <MiniStat label="可检查权限" value={resource.permissions.length} />
        <MiniStat label="角色模板" value={resource.roles.length} />
        <MiniStat label="继承入口" value={resource.inheritedRelations.length} />
      </div>

      {resource.inheritedRelations.length > 0 ? (
        <div>
          <div className="text-xs font-medium mb-2">继承路径</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {resource.inheritedRelations.map((relation) => (
              <div key={relation.key} className="rounded-md border bg-muted/30 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{relation.label}</span>
                  <Badge variant="outline" className="text-[10px]">{relation.key}</Badge>
                </div>
                <div className="mt-1 text-muted-foreground">{relation.description}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {resource.roles.length > 0 ? (
        <div>
          <div className="text-xs font-medium mb-2">可分配角色模板</div>
          <div className="flex flex-wrap gap-2">
            {resource.roles.map((role) => (
              <div key={`${role.roleKey}:${role.relation}`} className="rounded-md border px-2 py-1 text-xs">
                <span className="font-medium">{role.label}</span>
                {role.relation ? <span className="ml-1 text-muted-foreground">→ {relationLabel(role.relation)}</span> : null}
                <span className="ml-1 font-mono text-[10px] text-muted-foreground">{role.roleKey}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="text-xs font-medium mb-2">关系模型</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[...resource.inheritedRelations, ...directRelations].map((relation) => (
            <div key={relation.key} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium">{relation.label}</div>
                <Badge variant={relation.inherited ? 'secondary' : 'outline'} className="text-[10px]">{relation.key}</Badge>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{relation.description}</div>
              {relation.targets ? <div className="mt-1 font-mono text-[10px] text-muted-foreground break-all">{relation.targets}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-2">权限矩阵</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {resource.permissions.map((permission) => (
            <PermissionCard key={permission.key} permission={permission} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PermissionCard({ permission }: { permission: FriendlyPermission }) {
  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium">{permission.label}</div>
        <Badge variant="secondary" className="text-[10px]">{permission.key}</Badge>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{permission.description}</div>
      {permission.expression ? (
        <div className="mt-2 rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground break-all">
          {permission.expression}
        </div>
      ) : null}
      {(permission.sources.length > 0 || permission.inherited.length > 0) ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {permission.sources.map((source) => <Badge key={source} variant="outline" className="text-[10px]">关系：{relationLabel(source)}</Badge>)}
          {permission.inherited.map((source) => <Badge key={source} variant="secondary" className="text-[10px]">继承：{expressionToFriendlyText(source)}</Badge>)}
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card/50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  fallbackValue,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  fallbackValue: string;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) {
    return <Field label={label} value={fallbackValue} onChange={onChange} />;
  }
  const normalizedOptions = options.some((option) => option.value === value)
    ? options
    : [{ value, label: value }, ...options];
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {normalizedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function DecisionCard({ title, data }: { title: string; data: { allowed: boolean; effect?: string; reason?: string; steps?: string[] } }) {
  return (
    <div className="rounded-md border p-2 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{title}</span>
        <Badge variant={data.allowed ? 'default' : 'secondary'}>{data.allowed ? '允许' : '拒绝'}</Badge>
      </div>
      {data.reason ? <div className="text-muted-foreground break-all">{data.reason}</div> : null}
      {data.steps?.length ? (
        <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
          {data.steps.map((step) => <li key={step} className="break-all font-mono">{expressionToFriendlyText(step) || step}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function firstWritableRelation(resource: FriendlyResourceModel): string | undefined {
  return resource.roles.find((role) => role.relation)?.relation || resource.relations.find((relation) => !['parent', 'zone', 'backing_skill', 'runs_agent'].includes(relation.key))?.key;
}

function relationshipOptions(resource?: FriendlyResourceModel): { value: string; label: string }[] {
  if (!resource) return [];
  const fromRoles = resource.roles
    .filter((role) => role.relation)
    .map((role) => ({ value: role.relation || role.roleKey, label: `${role.label} (${role.relation || role.roleKey})` }));
  const roleValues = new Set(fromRoles.map((role) => role.value));
  const fromRelations = resource.relations
    .filter((relation) => !['parent', 'zone', 'backing_skill', 'runs_agent'].includes(relation.key) && !roleValues.has(relation.key))
    .map((relation) => ({ value: relation.key, label: `${relation.label} (${relation.key})` }));
  return [...fromRoles, ...fromRelations];
}

function resourceName(type: string): string {
  return type.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

type ModelStats = {
  resources: number;
  relations: number;
  permissions: number;
  roles: number;
  inheritanceEdges: number;
};

function summarizeModels(resources: FriendlyResourceModel[]): ModelStats {
  return resources.reduce<ModelStats>((acc, resource) => {
    acc.resources += 1;
    acc.relations += resource.relations.length;
    acc.permissions += resource.permissions.length;
    acc.roles += resource.roles.length;
    acc.inheritanceEdges += resource.inheritedRelations.length + resource.permissions.reduce((sum, permission) => sum + permission.inherited.length, 0);
    return acc;
  }, { resources: 0, relations: 0, permissions: 0, roles: 0, inheritanceEdges: 0 });
}

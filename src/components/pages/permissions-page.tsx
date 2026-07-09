'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Code2,
  Database,
  GitBranch,
  KeyRound,
  Layers3,
  ListChecks,
  RefreshCw,
  Route,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const TAB_VALUE_RESOURCE = 'resource';
const TAB_VALUE_SUBJECT = 'subject';
const TAB_VALUE_EXPLAIN = 'explain';
const TAB_VALUE_MODEL = 'model';

export function PermissionsPage() {
  const schemaQuery = useIamAuthzSchema();
  const catalogQuery = useIamAuthzCatalog();
  const { data: principal } = useMe();

  const [schemaDraft, setSchemaDraft] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('zone');
  const [resourceAuth, setResourceAuth] = useState({ resourceType: 'zone', resourceId: 'aisphere' });
  const [subjectView, setSubjectView] = useState({ subjectType: 'user', subjectId: '', resourceType: 'zone', resourceId: 'aisphere', permissions: DEFAULT_PERMISSIONS });
  const [explainForm, setExplainForm] = useState({ subjectType: 'user', subjectId: '', resourceType: 'zone', resourceId: 'aisphere', permission: 'manage_groups' });
  const [relationship, setRelationship] = useState<IamRelationship>({
    resource: { type: 'zone', id: 'aisphere' },
    relation: 'owner',
    subject: { type: 'user', id: '' },
  });
  const [rawFilter, setRawFilter] = useState({ resourceType: 'zone', resourceId: 'aisphere', relation: '', subjectType: '', subjectId: '' });

  const resourceRelationshipsQuery = useIamAuthzRelationships({ resourceType: resourceAuth.resourceType, resourceId: resourceAuth.resourceId });
  const subjectRelationshipsQuery = useIamAuthzRelationships({ subjectType: subjectView.subjectType, subjectId: subjectView.subjectId });
  const rawRelationshipsQuery = useIamAuthzRelationships(rawFilter);
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
    const subjectType = principal.subjectType || 'user';
    setSubjectView((prev) => prev.subjectId ? prev : { ...prev, subjectType, subjectId: principal.subjectId });
    setExplainForm((prev) => prev.subjectId ? prev : { ...prev, subjectType, subjectId: principal.subjectId });
    setRelationship((prev) => prev.subject.id ? prev : { ...prev, subject: { ...prev.subject, type: subjectType, id: principal.subjectId } });
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
  const resourceRelationships = resourceRelationshipsQuery.data?.relationships || [];
  const subjectRelationships = subjectRelationshipsQuery.data?.relationships || [];
  const rawRelationships = rawRelationshipsQuery.data?.relationships || [];
  const modelStats = useMemo(() => summarizeModels(resourceModels), [resourceModels]);
  const resourceTypeOptions = useMemo(() => resourceModels.map((resource) => ({ value: resource.type, label: `${resource.label} (${resource.type})` })), [resourceModels]);
  const relationshipPreview = useMemo(() => relationshipToText(relationship), [relationship]);

  const applyResourceSelection = (resourceType: string, resourceId?: string) => {
    const resource = resourceModels.find((item) => item.type === resourceType);
    const nextResourceId = resourceId ?? DEFAULT_RESOURCE_ID[resourceType] ?? resourceAuth.resourceId;
    const nextRelation = firstWritableRelation(resource) || relationship.relation || 'owner';
    const nextPermission = resource?.permissions[0]?.key || explainForm.permission || 'view';
    setSelectedResourceType(resourceType);
    setResourceAuth({ resourceType, resourceId: nextResourceId });
    setRelationship((prev) => ({
      ...prev,
      resource: { type: resourceType, id: nextResourceId },
      relation: nextRelation,
    }));
    setSubjectView((prev) => ({
      ...prev,
      resourceType,
      resourceId: nextResourceId,
      permissions: resource?.permissions.map((p) => p.key).join(',') || prev.permissions,
    }));
    setExplainForm((prev) => ({ ...prev, resourceType, resourceId: nextResourceId, permission: nextPermission }));
    setRawFilter((prev) => ({ ...prev, resourceType, resourceId: nextResourceId }));
  };

  const handleSelectResource = (resource: FriendlyResourceModel) => applyResourceSelection(resource.type);

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
      await Promise.all([resourceRelationshipsQuery.refetch(), subjectRelationshipsQuery.refetch(), rawRelationshipsQuery.refetch()]);
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
      await Promise.all([resourceRelationshipsQuery.refetch(), subjectRelationshipsQuery.refetch(), rawRelationshipsQuery.refetch()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '授权关系删除失败');
    }
  };

  const handleCheck = async () => {
    if (!explainForm.subjectId || !explainForm.resourceType || !explainForm.resourceId || !explainForm.permission) {
      toast.error('请填写主体、资源和权限');
      return;
    }
    try {
      await checkPermission.mutateAsync({
        subject: { type: explainForm.subjectType, id: explainForm.subjectId },
        resource: { type: explainForm.resourceType, id: explainForm.resourceId },
        permission: explainForm.permission,
        orgId: principal?.orgId || 'aisphere',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '权限检查失败');
    }
  };

  const handleExplain = async () => {
    if (!explainForm.subjectId || !explainForm.resourceType || !explainForm.resourceId || !explainForm.permission) {
      toast.error('请填写主体、资源和权限');
      return;
    }
    try {
      await explainPermission.mutateAsync({
        subject: { type: explainForm.subjectType, id: explainForm.subjectId },
        resource: { type: explainForm.resourceType, id: explainForm.resourceId },
        permission: explainForm.permission,
        orgId: principal?.orgId || 'aisphere',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '权限解释失败');
    }
  };

  const handleEffective = async () => {
    if (!subjectView.subjectId || !subjectView.resourceType || !subjectView.resourceId) {
      toast.error('请填写主体和资源');
      return;
    }
    try {
      await effectivePermissions.mutateAsync({
        subjectType: subjectView.subjectType,
        subjectId: subjectView.subjectId,
        resourceType: subjectView.resourceType,
        resourceId: subjectView.resourceId,
        permissions: subjectView.permissions.split(',').map((v) => v.trim()).filter(Boolean),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '有效权限查询失败');
    }
  };

  const fillCurrentUserAsZoneOwner = () => {
    const subjectId = principal?.subjectId || subjectView.subjectId || explainForm.subjectId;
    if (!subjectId) {
      toast.error('当前用户 subject id 为空，请先确认 /v1/iam/me 返回正常');
      return;
    }
    setRelationship({
      resource: { type: 'zone', id: 'aisphere' },
      relation: 'owner',
      subject: { type: principal?.subjectType || 'user', id: subjectId },
    });
    setResourceAuth({ resourceType: 'zone', resourceId: 'aisphere' });
    setRawFilter({ resourceType: 'zone', resourceId: 'aisphere', relation: 'owner', subjectType: '', subjectId: '' });
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> 权限管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            面向管理员展示资源授权、主体有效权限和权限解释；SpiceDB schema / relationship 原文收敛到开发者模型。
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { schemaQuery.refetch(); catalogQuery.refetch(); resourceRelationshipsQuery.refetch(); subjectRelationshipsQuery.refetch(); rawRelationshipsQuery.refetch(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> 刷新
        </Button>
      </div>

      <PermissionModelHero stats={modelStats} schemaVersion={schemaQuery.data?.version} />

      <ModelOverview stats={modelStats} activeRelationshipCount={resourceRelationships.length} schemaVersion={schemaQuery.data?.version} />

      <Tabs defaultValue={TAB_VALUE_RESOURCE} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value={TAB_VALUE_RESOURCE}><Box className="h-3.5 w-3.5" /> 资源授权</TabsTrigger>
          <TabsTrigger value={TAB_VALUE_SUBJECT}><UserRound className="h-3.5 w-3.5" /> 用户权限</TabsTrigger>
          <TabsTrigger value={TAB_VALUE_EXPLAIN}><KeyRound className="h-3.5 w-3.5" /> 权限解释器</TabsTrigger>
          <TabsTrigger value={TAB_VALUE_MODEL}><Code2 className="h-3.5 w-3.5" /> 开发者模型</TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_VALUE_RESOURCE} className="space-y-4">
          <ResourceAuthorizationPanel
            resourceModels={resourceModels}
            selectedResource={selectedResource}
            resourceTypeOptions={resourceTypeOptions}
            resourceAuth={resourceAuth}
            setResourceAuth={setResourceAuth}
            relationship={relationship}
            setRelationship={setRelationship}
            relationshipPreview={relationshipPreview}
            relationships={resourceRelationships}
            loading={resourceRelationshipsQuery.isLoading}
            writePending={writeRelationship.isPending}
            deletePending={deleteRelationships.isPending}
            onSelectResource={handleSelectResource}
            onChangeResourceType={(resourceType) => applyResourceSelection(resourceType)}
            onWrite={handleWriteRelationship}
            onDelete={handleDeleteRelationship}
            onFillCurrentUserAsOwner={fillCurrentUserAsZoneOwner}
          />
        </TabsContent>

        <TabsContent value={TAB_VALUE_SUBJECT} className="space-y-4">
          <SubjectPermissionsPanel
            resourceTypeOptions={resourceTypeOptions}
            subjectView={subjectView}
            setSubjectView={setSubjectView}
            subjectRelationships={subjectRelationships}
            loading={subjectRelationshipsQuery.isLoading}
            effectiveData={effectivePermissions.data}
            effectivePending={effectivePermissions.isPending}
            onEffective={handleEffective}
          />
        </TabsContent>

        <TabsContent value={TAB_VALUE_EXPLAIN} className="space-y-4">
          <PermissionExplainerPanel
            resourceModels={resourceModels}
            resourceTypeOptions={resourceTypeOptions}
            explainForm={explainForm}
            setExplainForm={setExplainForm}
            checkData={checkPermission.data}
            explainData={explainPermission.data}
            checkPending={checkPermission.isPending}
            explainPending={explainPermission.isPending}
            onCheck={handleCheck}
            onExplain={handleExplain}
          />
        </TabsContent>

        <TabsContent value={TAB_VALUE_MODEL} className="space-y-4">
          <DeveloperModelPanel
            resourceModels={resourceModels}
            selectedResourceType={selectedResourceType}
            selectedResource={selectedResource}
            schemaDraft={schemaDraft}
            setSchemaDraft={setSchemaDraft}
            schemaLoading={schemaQuery.isLoading}
            schemaVersion={schemaQuery.data?.version}
            catalogHasResourceTypes={Boolean(catalogQuery.data?.resourceTypes?.length)}
            validatePending={validateSchema.isPending}
            publishPending={publishSchema.isPending}
            rawFilter={rawFilter}
            setRawFilter={setRawFilter}
            rawRelationships={rawRelationships}
            rawLoading={rawRelationshipsQuery.isLoading}
            deletePending={deleteRelationships.isPending}
            onSelectResource={handleSelectResource}
            onValidate={handleValidate}
            onPublish={handlePublish}
            onDelete={handleDeleteRelationship}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResourceAuthorizationPanel({
  resourceModels,
  selectedResource,
  resourceTypeOptions,
  resourceAuth,
  setResourceAuth,
  relationship,
  setRelationship,
  relationshipPreview,
  relationships,
  loading,
  writePending,
  deletePending,
  onSelectResource,
  onChangeResourceType,
  onWrite,
  onDelete,
  onFillCurrentUserAsOwner,
}: {
  resourceModels: FriendlyResourceModel[];
  selectedResource?: FriendlyResourceModel;
  resourceTypeOptions: SelectOption[];
  resourceAuth: ResourceAuthState;
  setResourceAuth: (value: ResourceAuthState) => void;
  relationship: IamRelationship;
  setRelationship: (value: IamRelationship) => void;
  relationshipPreview: string;
  relationships: IamRelationship[];
  loading: boolean;
  writePending: boolean;
  deletePending: boolean;
  onSelectResource: (resource: FriendlyResourceModel) => void;
  onChangeResourceType: (resourceType: string) => void;
  onWrite: () => void;
  onDelete: (relationship: IamRelationship) => void;
  onFillCurrentUserAsOwner: () => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> 资源目录</CardTitle>
          <CardDescription>按业务资源选择授权对象，不需要管理员理解 SpiceDB tuple。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {resourceModels.map((resource) => (
              <button
                key={resource.type}
                type="button"
                onClick={() => onSelectResource(resource)}
                className={`rounded-lg border p-3 text-left transition hover:bg-muted ${resourceAuth.resourceType === resource.type ? 'border-primary bg-muted/60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{resource.label}</div>
                  <Badge variant="secondary" className="text-[10px]">{resource.type}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <span>{resource.permissions.length} 权限</span><span>·</span><span>{resource.relations.length} 关系</span>
                  {resource.inheritedRelations.length > 0 ? <><span>·</span><span>{resource.inheritedRelations.length} 继承入口</span></> : null}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span>资源授权页</span>
              {selectedResource ? <Badge variant="outline">{selectedResource.label}</Badge> : null}
            </CardTitle>
            <CardDescription>回答“谁可以访问这个资源、以什么角色访问”。继承来源可继续用权限解释器排查。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <SelectField
                label="资源类型"
                value={resourceAuth.resourceType}
                fallbackValue={resourceAuth.resourceType}
                options={resourceTypeOptions}
                onChange={onChangeResourceType}
              />
              <Field label="资源 ID" value={resourceAuth.resourceId} onChange={(resourceId) => {
                setResourceAuth({ ...resourceAuth, resourceId });
                setRelationship({ ...relationship, resource: { ...relationship.resource, id: resourceId } });
              }} />
              <SelectField
                label="授予角色 / 关系"
                value={relationship.relation}
                fallbackValue={relationship.relation}
                options={relationshipOptions(selectedResource)}
                onChange={(relation) => setRelationship({ ...relationship, relation })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Field label="授权主体类型" value={relationship.subject.type} onChange={(type) => setRelationship({ ...relationship, subject: { ...relationship.subject, type } })} placeholder="user / group / service" />
              <Field label="授权主体 ID" value={relationship.subject.id} onChange={(id) => setRelationship({ ...relationship, subject: { ...relationship.subject, id } })} placeholder="user uuid / group id" />
              <Field label="主体关系" value={relationship.subject.relation || ''} onChange={(relation) => setRelationship({ ...relationship, subject: { ...relationship.subject, relation } })} placeholder="组授权常填 member，可空" />
            </div>
            <div className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono break-all">{relationshipPreview}</div>
            {/* 可视化：当前正在编辑的授权关系 */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1">当前编辑的授权关系</div>
              <GrantFlowVisualization relationship={relationship} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onWrite} disabled={writePending}>添加授权</Button>
              <Button size="sm" variant="outline" onClick={onFillCurrentUserAsOwner}>当前用户设为用户源 Owner</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">谁可以访问？</CardTitle>
            <CardDescription>当前只展示直接 relationship；派生权限和继承链通过“权限解释器”查看。</CardDescription>
          </CardHeader>
          <CardContent>
            <RelationshipTable relationships={relationships} loading={loading} deletePending={deletePending} onDelete={onDelete} emptyText="当前资源暂无直接授权关系" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubjectPermissionsPanel({
  resourceTypeOptions,
  subjectView,
  setSubjectView,
  subjectRelationships,
  loading,
  effectiveData,
  effectivePending,
  onEffective,
}: {
  resourceTypeOptions: SelectOption[];
  subjectView: SubjectViewState;
  setSubjectView: (value: SubjectViewState) => void;
  subjectRelationships: IamRelationship[];
  loading: boolean;
  effectiveData?: { permissions?: Record<string, { allowed: boolean; effect?: string; reason?: string }> };
  effectivePending: boolean;
  onEffective: () => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4" /> 用户权限页</CardTitle>
          <CardDescription>从用户 / 用户组视角看直接拥有的授权，以及它在某个资源上的有效权限。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Field label="主体类型" value={subjectView.subjectType} onChange={(subjectType) => setSubjectView({ ...subjectView, subjectType })} placeholder="user / group / service" />
            <Field label="主体 ID" value={subjectView.subjectId} onChange={(subjectId) => setSubjectView({ ...subjectView, subjectId })} placeholder="user uuid / group id" />
          </div>
          <div className="rounded-md border p-2 text-xs text-muted-foreground">
            这个视图适合排查“某个用户到底有哪些直接授权”。通过组继承、父资源继承和资源派生权限请结合右侧有效权限和权限解释器确认。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">直接拥有</CardTitle>
          <CardDescription>按 subject 过滤出来的直接关系。</CardDescription>
        </CardHeader>
        <CardContent>
          <RelationshipTable relationships={subjectRelationships} loading={loading} emptyText="当前主体暂无直接授权关系" />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">可访问资源 / 有效权限</CardTitle>
          <CardDescription>选择一个资源，批量检查该主体在资源上的权限集合。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <SelectField label="资源类型" value={subjectView.resourceType} fallbackValue={subjectView.resourceType} options={resourceTypeOptions} onChange={(resourceType) => setSubjectView({ ...subjectView, resourceType, resourceId: DEFAULT_RESOURCE_ID[resourceType] || subjectView.resourceId })} />
            <Field label="资源 ID" value={subjectView.resourceId} onChange={(resourceId) => setSubjectView({ ...subjectView, resourceId })} />
            <Field label="权限集合 CSV" value={subjectView.permissions} onChange={(permissions) => setSubjectView({ ...subjectView, permissions })} />
          </div>
          <Button size="sm" variant="outline" onClick={onEffective} disabled={effectivePending}>查询有效权限</Button>
          {effectiveData ? <EffectivePermissionGrid permissions={effectiveData.permissions || {}} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function PermissionExplainerPanel({
  resourceModels,
  resourceTypeOptions,
  explainForm,
  setExplainForm,
  checkData,
  explainData,
  checkPending,
  explainPending,
  onCheck,
  onExplain,
}: {
  resourceModels: FriendlyResourceModel[];
  resourceTypeOptions: SelectOption[];
  explainForm: ExplainFormState;
  setExplainForm: (value: ExplainFormState) => void;
  checkData?: DecisionData;
  explainData?: DecisionData;
  checkPending: boolean;
  explainPending: boolean;
  onCheck: () => void;
  onExplain: () => void;
}) {
  const selectedModel = resourceModels.find((resource) => resource.type === explainForm.resourceType);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> 权限解释器</CardTitle>
          <CardDescription>输入 subject / action / object，直接解释为什么允许或拒绝。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Field label="Subject 类型" value={explainForm.subjectType} onChange={(subjectType) => setExplainForm({ ...explainForm, subjectType })} />
            <Field label="Subject ID" value={explainForm.subjectId} onChange={(subjectId) => setExplainForm({ ...explainForm, subjectId })} placeholder="user uuid / group id" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <SelectField label="Object 类型" value={explainForm.resourceType} fallbackValue={explainForm.resourceType} options={resourceTypeOptions} onChange={(resourceType) => setExplainForm({ ...explainForm, resourceType, resourceId: DEFAULT_RESOURCE_ID[resourceType] || explainForm.resourceId, permission: resourceModels.find((r) => r.type === resourceType)?.permissions[0]?.key || explainForm.permission })} />
            <Field label="Object ID" value={explainForm.resourceId} onChange={(resourceId) => setExplainForm({ ...explainForm, resourceId })} />
          </div>
          <SelectField
            label="Action / Permission"
            value={explainForm.permission}
            fallbackValue={explainForm.permission}
            options={(selectedModel?.permissions || []).map((permission) => ({ value: permission.key, label: `${permission.label} (${permission.key})` }))}
            onChange={(permission) => setExplainForm({ ...explainForm, permission })}
          />
          <div className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono break-all">
            {explainForm.subjectType}:{explainForm.subjectId || '<subject-id>'} → {explainForm.permission || '<permission>'} → {explainForm.resourceType}:{explainForm.resourceId || '<resource-id>'}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCheck} disabled={checkPending}>快速检查</Button>
            <Button size="sm" onClick={onExplain} disabled={explainPending}>解释路径</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {checkData ? <DecisionCard title="检查结果" data={checkData} /> : null}
        {explainData ? <DecisionTimeline data={explainData} /> : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">解释结果</CardTitle>
              <CardDescription>执行“解释路径”后，这里会展示允许/拒绝和推导步骤。</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              建议把业务报错里的 subject、object、permission 直接填进来，用这个页面排查 `spicedb check permission failed`。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DeveloperModelPanel({
  resourceModels,
  selectedResourceType,
  selectedResource,
  schemaDraft,
  setSchemaDraft,
  schemaLoading,
  schemaVersion,
  catalogHasResourceTypes,
  validatePending,
  publishPending,
  rawFilter,
  setRawFilter,
  rawRelationships,
  rawLoading,
  deletePending,
  onSelectResource,
  onValidate,
  onPublish,
  onDelete,
}: {
  resourceModels: FriendlyResourceModel[];
  selectedResourceType: string;
  selectedResource?: FriendlyResourceModel;
  schemaDraft: string;
  setSchemaDraft: (value: string) => void;
  schemaLoading: boolean;
  schemaVersion?: string;
  catalogHasResourceTypes: boolean;
  validatePending: boolean;
  publishPending: boolean;
  rawFilter: RawRelationshipFilter;
  setRawFilter: (value: RawRelationshipFilter) => void;
  rawRelationships: IamRelationship[];
  rawLoading: boolean;
  deletePending: boolean;
  onSelectResource: (resource: FriendlyResourceModel) => void;
  onValidate: () => void;
  onPublish: () => void;
  onDelete: (relationship: IamRelationship) => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> 权限模型地图</CardTitle>
          <CardDescription>开发者 / 平台管理员使用，用来理解 schema、catalog、关系和继承链。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {resourceModels.length === 0 ? (
              <div className="text-sm text-muted-foreground">正在加载权限模型...</div>
            ) : resourceModels.map((resource) => (
              <button
                key={resource.type}
                type="button"
                onClick={() => onSelectResource(resource)}
                className={`rounded-lg border p-3 text-left transition hover:bg-muted ${selectedResourceType === resource.type ? 'border-primary bg-muted/60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{resource.label}</div>
                  <Badge variant="secondary" className="text-[10px]">{resource.type}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <span>{resource.permissions.length} 权限</span><span>·</span><span>{resource.relations.length} 关系</span>
                  {resource.roles.length > 0 ? <><span>·</span><span>{resource.roles.length} 角色模板</span></> : null}
                  {resource.inheritedRelations.length > 0 ? <><span>·</span><span>{resource.inheritedRelations.length} 继承入口</span></> : null}
                </div>
              </button>
            ))}
          </div>
          {selectedResource ? <ResourceDetail resource={selectedResource} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Schema 高级模式</CardTitle>
          <CardDescription>只给开发者使用。普通管理员不要直接编辑 raw schema。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="font-mono text-xs min-h-[320px]"
            value={schemaDraft}
            onChange={(e) => setSchemaDraft(e.target.value)}
            placeholder={schemaLoading ? '正在加载 schema...' : 'SpiceDB schema'}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onValidate} disabled={validatePending || !schemaDraft}>校验 Schema</Button>
            <Button size="sm" onClick={onPublish} disabled={publishPending || !schemaDraft}><UploadCloud className="h-3.5 w-3.5 mr-1" /> 发布 Schema</Button>
            {schemaVersion ? <Badge variant="secondary">{schemaVersion}</Badge> : null}
            <Badge variant="outline" className="text-[10px]">{catalogHasResourceTypes ? 'Catalog + Schema 合并视图' : 'Schema 解析视图'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Raw Relationship 调试</CardTitle>
          <CardDescription>用于底层排查。业务授权建议在“资源授权”页完成。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input className="h-8 text-xs" placeholder="资源类型" value={rawFilter.resourceType} onChange={(e) => setRawFilter({ ...rawFilter, resourceType: e.target.value })} />
            <Input className="h-8 text-xs" placeholder="资源 ID" value={rawFilter.resourceId} onChange={(e) => setRawFilter({ ...rawFilter, resourceId: e.target.value })} />
            <Input className="h-8 text-xs" placeholder="角色/关系" value={rawFilter.relation} onChange={(e) => setRawFilter({ ...rawFilter, relation: e.target.value })} />
            <Input className="h-8 text-xs" placeholder="主体类型" value={rawFilter.subjectType} onChange={(e) => setRawFilter({ ...rawFilter, subjectType: e.target.value })} />
            <Input className="h-8 text-xs" placeholder="主体 ID" value={rawFilter.subjectId} onChange={(e) => setRawFilter({ ...rawFilter, subjectId: e.target.value })} />
          </div>
          <RelationshipTable relationships={rawRelationships} loading={rawLoading} deletePending={deletePending} onDelete={onDelete} emptyText="暂无授权关系" />
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
      <MetricCard icon={<Database className="h-4 w-4" />} label="当前资源关系" value={activeRelationshipCount} helper={schemaVersion || 'resource relationships'} />
    </div>
  );
}

function MetricCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: number; helper: string }) {
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

      {/* 资源继承链可视化 */}
      <ResourceInheritanceDiagram resource={resource} />

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
          {resource.permissions.map((permission) => <PermissionCard key={permission.key} permission={permission} />)}
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
      {permission.expression ? <div className="mt-2 rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground break-all">{permission.expression}</div> : null}
      {(permission.sources.length > 0 || permission.inherited.length > 0) ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {permission.sources.map((source) => <Badge key={source} variant="outline" className="text-[10px]">关系：{relationLabel(source)}</Badge>)}
          {permission.inherited.map((source) => <Badge key={source} variant="secondary" className="text-[10px]">继承：{expressionToFriendlyText(source)}</Badge>)}
        </div>
      ) : null}
    </div>
  );
}

function RelationshipTable({ relationships, loading, deletePending, onDelete, emptyText }: { relationships: IamRelationship[]; loading: boolean; deletePending?: boolean; onDelete?: (relationship: IamRelationship) => void; emptyText: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">资源</TableHead>
          <TableHead className="text-xs">角色/关系</TableHead>
          <TableHead className="text-xs">主体</TableHead>
          {onDelete ? <TableHead className="text-xs w-20">操作</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={onDelete ? 4 : 3} className="text-xs text-muted-foreground">加载中...</TableCell></TableRow>
        ) : relationships.length === 0 ? (
          <TableRow><TableCell colSpan={onDelete ? 4 : 3} className="py-8 text-center text-xs text-muted-foreground">{emptyText}</TableCell></TableRow>
        ) : relationships.map((rel, idx) => (
          <TableRow key={`${rel.resource.type}:${rel.resource.id}:${rel.relation}:${rel.subject.type}:${rel.subject.id}:${idx}`}>
            <TableCell className="text-xs">
              <div className="font-medium">{resourceName(rel.resource.type)}</div>
              <div className="font-mono text-muted-foreground">{rel.resource.type}:{rel.resource.id}</div>
            </TableCell>
            <TableCell className="text-xs">
              <div>{relationLabel(rel.relation)}</div>
              <div className="font-mono text-muted-foreground">{rel.relation}</div>
            </TableCell>
            <TableCell className="text-xs font-mono">{subjectToText(rel.subject)}</TableCell>
            {onDelete ? (
              <TableCell>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onDelete(rel)} disabled={deletePending}>删除</Button>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EffectivePermissionGrid({ permissions }: { permissions: Record<string, { allowed: boolean; effect?: string; reason?: string }> }) {
  const entries = Object.entries(permissions || {});
  if (entries.length === 0) return <div className="text-xs text-muted-foreground">暂无有效权限结果</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
      {entries.map(([permission, result]) => (
        <div key={permission} className="rounded-md border p-2">
          <div className="text-xs font-medium truncate">{permissionLabel(permission)}</div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">{permission}</div>
          <Badge variant={result.allowed ? 'default' : 'secondary'} className="mt-1 text-[10px]">{result.allowed ? '允许' : '拒绝'}</Badge>
          {result.reason ? <div className="mt-1 text-[10px] text-muted-foreground break-all">{result.reason}</div> : null}
        </div>
      ))}
    </div>
  );
}

function DecisionCard({ title, data }: { title: string; data: DecisionData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {title}
          <Badge variant={data.allowed ? 'default' : 'secondary'}>{data.allowed ? '允许' : '拒绝'}</Badge>
        </CardTitle>
        {data.reason ? <CardDescription className="break-all">{data.reason}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}

function DecisionTimeline({ data }: { data: DecisionData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          解释路径
          <Badge variant={data.allowed ? 'default' : 'secondary'}>{data.allowed ? 'YES / 允许' : 'NO / 拒绝'}</Badge>
        </CardTitle>
        {data.reason ? <CardDescription className="break-all">{data.reason}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {data.steps?.length ? (
          <div className="space-y-2">
            {data.steps.map((step, idx) => (
              <div key={`${step}:${idx}`} className="flex gap-3 rounded-md border p-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{idx + 1}</div>
                <div>
                  <div className="text-xs font-medium">{expressionToFriendlyText(step) || step}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground break-all">{step}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">当前后端没有返回解释步骤，只返回了最终决策。</div>
        )}
      </CardContent>
    </Card>
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

function SelectField({ label, value, options, fallbackValue, onChange }: { label: string; value: string; options: SelectOption[]; fallbackValue: string; onChange: (value: string) => void }) {
  if (options.length === 0) return <Field label={label} value={fallbackValue} onChange={onChange} />;
  const normalizedOptions = options.some((option) => option.value === value) ? options : [{ value, label: value }, ...options];
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
        {normalizedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function firstWritableRelation(resource?: FriendlyResourceModel): string | undefined {
  if (!resource) return undefined;
  return resource.roles.find((role) => role.relation)?.relation || resource.relations.find((relation) => !['parent', 'zone', 'backing_skill', 'runs_agent'].includes(relation.key))?.key;
}

function relationshipOptions(resource?: FriendlyResourceModel): SelectOption[] {
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

function relationshipToText(rel: IamRelationship): string {
  return `${rel.resource.type}:${rel.resource.id || '<resource-id>'}#${rel.relation || '<relation>'}@${subjectToText(rel.subject, true)}`;
}

function subjectToText(subject: { type: string; id: string; relation?: string }, withPlaceholder = false): string {
  const id = subject.id || (withPlaceholder ? '<subject-id>' : '');
  return `${subject.type}:${id}${subject.relation ? `#${subject.relation}` : ''}`;
}

type SelectOption = { value: string; label: string };

type ResourceAuthState = { resourceType: string; resourceId: string };

type SubjectViewState = { subjectType: string; subjectId: string; resourceType: string; resourceId: string; permissions: string };

type ExplainFormState = { subjectType: string; subjectId: string; resourceType: string; resourceId: string; permission: string };

type RawRelationshipFilter = { resourceType: string; resourceId: string; relation: string; subjectType: string; subjectId: string };

type DecisionData = { allowed: boolean; effect?: string; reason?: string; steps?: string[] };

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
// ─── 权限模型可视化组件 ─────────────────────────────────────────────

/** 顶部"权限模型概览"可视化：用流程图形式展示主体 → 关系 → 资源 → 权限 的整体结构 */
function PermissionModelHero({ stats, schemaVersion }: { stats: ModelStats; schemaVersion?: string }) {
  const nodes = [
    { key: 'subject', label: '主体', sub: 'User / Group / Agent', icon: <UserRound className="h-4 w-4" />, color: 'from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400' },
    { key: 'relation', label: '关系 / 角色', sub: `${stats.relations} 个关系 · ${stats.roles} 个角色模板`, icon: <GitBranch className="h-4 w-4" />, color: 'from-violet-500/20 to-fuchsia-500/20 text-violet-600 dark:text-violet-400' },
    { key: 'resource', label: '资源', sub: `${stats.resources} 种资源类型`, icon: <Database className="h-4 w-4" />, color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400' },
    { key: 'permission', label: '权限', sub: `${stats.permissions} 项可检查权限`, icon: <ListChecks className="h-4 w-4" />, color: 'from-emerald-500/20 to-green-500/20 text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-500" />
          权限模型概览
          {schemaVersion ? <Badge variant="outline" className="text-[10px]">Schema v{schemaVersion}</Badge> : null}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          整个权限系统按
          <span className="font-medium text-foreground/80"> 主体 → 关系 → 资源 → 权限 </span>
          的链路工作。下方四个节点构成完整授权链路，理解这条链路即可完成 90% 的日常权限管理。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
          {nodes.map((node, idx) => (
            <div key={node.key} className="relative">
              <div className={`h-full rounded-lg border bg-gradient-to-br ${node.color} p-3 flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/60">
                    {node.icon}
                  </div>
                  <div className="text-xs font-semibold">{node.label}</div>
                </div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">{node.sub}</div>
              </div>
              {idx < nodes.length - 1 ? (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-background border border-violet-500/40 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-md border border-dashed border-sky-500/30 bg-sky-500/5 p-2">
            <div className="font-medium text-sky-700 dark:text-sky-300 mb-0.5">① 主体是谁</div>
            <div className="text-muted-foreground">用户、组织、Agent、Service。每个主体有唯一 ID。</div>
          </div>
          <div className="rounded-md border border-dashed border-violet-500/30 bg-violet-500/5 p-2">
            <div className="font-medium text-violet-700 dark:text-violet-300 mb-0.5">② 通过什么关系</div>
            <div className="text-muted-foreground">owner / admin / member / viewer 等关系，或角色模板。</div>
          </div>
          <div className="rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-2">
            <div className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">③ 访问什么资源</div>
            <div className="text-muted-foreground">zone / group / project / skill / agent 等资源类型实例。</div>
          </div>
        </div>
        <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]">
          <span className="font-medium text-emerald-700 dark:text-emerald-300">④ 最终能做什么：</span>
          <span className="text-muted-foreground"> view / manage / execute / deploy 等可检查的权限点。系统按关系和继承规则自动推导允许或拒绝。</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** 资源继承链示意：展示 zone → group → resource 的层级继承关系 */
function ResourceInheritanceDiagram({ resource }: { resource: FriendlyResourceModel }) {
  const inherited = resource.inheritedRelations;
  if (inherited.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
        当前资源没有继承入口，授权完全来自直接关系。
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] font-medium text-muted-foreground mb-1.5">资源继承链</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {inherited.map((rel, idx) => (
          <div key={rel.key} className="flex items-center gap-1.5">
            <span className="rounded-md border bg-background px-1.5 py-0.5">
              <span className="text-muted-foreground">{rel.label}</span>
              <span className="ml-1 font-mono text-[9px] text-muted-foreground/70">#{rel.key}</span>
            </span>
            {idx < inherited.length - 1 ? (
              <span className="text-muted-foreground/40">→</span>
            ) : null}
          </div>
        ))}
        <span className="text-muted-foreground/40">→</span>
        <span className="rounded-md border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 font-medium">
          {resource.label}
        </span>
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">
        继承入口意味着：在父级资源上授予的权限会自动向下传递到当前资源。例如在 zone 上是 owner，则在 zone 内的 group 上自动获得对应权限。
      </div>
    </div>
  );
}

/** 授权关系可视化：把一个 IamRelationship 渲染成可视的"主体 → 关系 → 资源"图 */
function GrantFlowVisualization({ relationship }: { relationship: IamRelationship }) {
  return (
    <div className="rounded-md border bg-gradient-to-br from-muted/40 to-transparent p-3">
      <div className="grid grid-cols-3 gap-2 items-center text-center">
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-2">
          <div className="text-[10px] font-medium text-sky-700 dark:text-sky-300 mb-0.5">主体 Subject</div>
          <div className="font-mono text-[10px] break-all">{subjectToText(relationship.subject)}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] text-muted-foreground">通过</div>
          <div className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
            {relationLabel(relationship.relation)}
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/70">#{relationship.relation}</div>
          <svg width="100%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
            <line x1="0" y1="4" x2="100" y2="4" stroke="currentColor" strokeWidth="1" className="text-violet-500/40" strokeDasharray="2 2" />
            <polygon points="100,4 95,1 95,7" fill="currentColor" className="text-violet-500/40" />
          </svg>
        </div>
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
          <div className="text-[10px] font-medium text-amber-700 dark:text-amber-300 mb-0.5">资源 Resource</div>
          <div className="font-mono text-[10px] break-all">{relationship.resource.type}:{relationship.resource.id}</div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Boxes,
  ChevronRight,
  Code2,
  Database,
  Fingerprint,
  FolderTree,
  GitBranch,
  KeyRound,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/hooks/use-auth';
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
import { useIamDirectoryGroups, useIamExternalUsers, useIamResources } from '@/hooks/use-iam';
import type {
  IamAuthzEffectivePermissionsReply,
  IamCheckPermissionResponse,
  IamGroup,
  IamRelationship,
  IamResource,
  IamUser,
} from '@/lib/api/types';
import {
  buildFriendlyResourceModels,
  expressionToFriendlyText,
  permissionLabel,
  relationLabel,
  resourceLabel,
  type FriendlyPermission,
  type FriendlyResourceModel,
} from '@/lib/authz/schema-summary';
import {
  friendlyTargets,
  groupDirectoryOptions,
  groupResources,
  permissionCategory,
  permissionCategoryLabel,
  permissionSentence,
  relationshipSummary,
  resolveDirectoryLabel,
  resourceDirectoryOptions,
  roleMeaning,
  shortId,
  subjectTypeDescription,
  subjectTypeLabel,
  technicalRelationship,
  userDirectoryOptions,
  type DirectoryOption,
  type PermissionCategory,
} from '@/lib/authz/presentation';

const DEFAULT_RESOURCE_ID: Record<string, string> = {
  zone: 'aisphere',
  iam_authz: 'global',
};

const SUBJECT_TYPES = [
  { value: 'user', label: '用户' },
  { value: 'group', label: '用户组 / 组织节点' },
  { value: 'service', label: '服务账号' },
  { value: 'agent', label: 'Agent' },
  { value: 'workload', label: '工作负载' },
];

export function PermissionsCenterPage({ identityOrg }: { identityOrg: string }) {
  const { data: principal } = useMe();
  const schemaQuery = useIamAuthzSchema();
  const catalogQuery = useIamAuthzCatalog();
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const groupsQuery = useIamDirectoryGroups(identityOrg);

  const [schemaDraft, setSchemaDraft] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('zone');
  const [selectedResourceId, setSelectedResourceId] = useState('aisphere');
  const [selectedSubjectType, setSelectedSubjectType] = useState('user');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedRelation, setSelectedRelation] = useState('owner');
  const [selectedPermission, setSelectedPermission] = useState('manage_groups');
  const [subjectRelation, setSubjectRelation] = useState('');

  const users = usersQuery.data?.users || [];
  const groups = groupsQuery.data?.groups || [];

  const resourceModels = useMemo(
    () => buildFriendlyResourceModels(
      catalogQuery.data?.resourceTypes,
      catalogQuery.data?.roleTemplates,
      schemaQuery.data?.text || '',
    ),
    [catalogQuery.data?.resourceTypes, catalogQuery.data?.roleTemplates, schemaQuery.data?.text],
  );
  const resourceGroups = useMemo(() => groupResources(resourceModels), [resourceModels]);
  const selectedModel = resourceModels.find((item) => item.type === selectedResourceType) || resourceModels[0];

  const resourcesQuery = useIamResources({ type: selectedResourceType });
  const resourceInstances = resourcesQuery.data?.resources || [];
  const resourceRelationshipsQuery = useIamAuthzRelationships({
    resourceType: selectedResourceType,
    resourceId: selectedResourceId,
  });
  const subjectRelationshipsQuery = useIamAuthzRelationships({
    subjectType: selectedSubjectType,
    subjectId: selectedSubjectId || '__none__',
  });

  const writeRelationship = useIamWriteAuthzRelationship();
  const deleteRelationships = useIamDeleteAuthzRelationships();
  const effectivePermissions = useIamEffectivePermissions();
  const checkPermission = useIamCheckAuthzPermission();
  const explainPermission = useIamExplainAuthzPermission();
  const validateSchema = useIamValidateAuthzSchema();
  const publishSchema = useIamPublishAuthzSchema();

  useEffect(() => {
    if (schemaQuery.data?.text && !schemaDraft) setSchemaDraft(schemaQuery.data.text);
  }, [schemaQuery.data?.text, schemaDraft]);

  useEffect(() => {
    if (!principal?.subjectId || selectedSubjectId) return;
    setSelectedSubjectType(principal.subjectType || 'user');
    setSelectedSubjectId(principal.subjectId);
  }, [principal?.subjectId, principal?.subjectType, selectedSubjectId]);

  useEffect(() => {
    if (!selectedModel) return;
    const writable = selectedModel.roles.find((role) => role.relation)?.relation
      || selectedModel.relations.find((relation) => !isStructuralRelation(relation.key))?.key;
    if (writable && !selectedModel.relations.some((relation) => relation.key === selectedRelation)) {
      setSelectedRelation(writable);
    }
    if (!selectedModel.permissions.some((permission) => permission.key === selectedPermission)) {
      setSelectedPermission(selectedModel.permissions[0]?.key || 'view');
    }
  }, [selectedModel, selectedPermission, selectedRelation]);

  const subjectOptions = useMemo(
    () => directoryOptions(selectedSubjectType, users, groups),
    [selectedSubjectType, users, groups],
  );
  const resourceOptions = useMemo(
    () => resourceDirectoryOptions(resourceInstances),
    [resourceInstances],
  );

  const relationship: IamRelationship = {
    resource: { type: selectedResourceType, id: selectedResourceId },
    relation: selectedRelation,
    subject: {
      type: selectedSubjectType,
      id: selectedSubjectId,
      relation: subjectRelation || undefined,
    },
  };

  const selectResourceType = (type: string) => {
    const model = resourceModels.find((item) => item.type === type);
    setSelectedResourceType(type);
    setSelectedResourceId(DEFAULT_RESOURCE_ID[type] || '');
    setSelectedRelation(
      model?.roles.find((role) => role.relation)?.relation
      || model?.relations.find((relation) => !isStructuralRelation(relation.key))?.key
      || 'owner',
    );
    setSelectedPermission(model?.permissions[0]?.key || 'view');
  };

  const selectSubjectType = (type: string) => {
    setSelectedSubjectType(type);
    setSelectedSubjectId('');
    setSubjectRelation(type === 'group' ? 'member' : '');
  };

  const handleWriteRelationship = async () => {
    if (!selectedResourceType || !selectedResourceId || !selectedRelation || !selectedSubjectType || !selectedSubjectId) {
      toast.error('请先选择资源、角色和授权对象');
      return;
    }
    try {
      await writeRelationship.mutateAsync(relationship);
      toast.success('授权已添加');
      await Promise.all([resourceRelationshipsQuery.refetch(), subjectRelationshipsQuery.refetch()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '授权失败');
    }
  };

  const handleDeleteRelationship = async (item: IamRelationship) => {
    try {
      await deleteRelationships.mutateAsync({
        resourceType: item.resource.type,
        resourceId: item.resource.id,
        relation: item.relation,
        subjectType: item.subject.type,
        subjectId: item.subject.id,
        subjectRelation: item.subject.relation,
      });
      toast.success('授权已移除');
      await Promise.all([resourceRelationshipsQuery.refetch(), subjectRelationshipsQuery.refetch()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移除授权失败');
    }
  };

  const handleEffectivePermissions = async () => {
    if (!selectedSubjectId || !selectedResourceId || !selectedModel) {
      toast.error('请选择人员和资源');
      return;
    }
    try {
      await effectivePermissions.mutateAsync({
        subjectType: selectedSubjectType,
        subjectId: selectedSubjectId,
        subjectRelation: subjectRelation || undefined,
        resourceType: selectedResourceType,
        resourceId: selectedResourceId,
        permissions: selectedModel.permissions.map((permission) => permission.key),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '查询有效权限失败');
    }
  };

  const decisionRequest = {
    subject: { type: selectedSubjectType, id: selectedSubjectId, relation: subjectRelation || undefined },
    resource: { type: selectedResourceType, id: selectedResourceId },
    permission: selectedPermission,
    orgId: principal?.orgId || identityOrg,
  };

  const handleCheckPermission = async () => {
    if (!selectedSubjectId || !selectedResourceId || !selectedPermission) {
      toast.error('请选择人员、资源和权限');
      return;
    }
    try {
      await checkPermission.mutateAsync(decisionRequest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '权限检查失败');
    }
  };

  const handleExplainPermission = async () => {
    if (!selectedSubjectId || !selectedResourceId || !selectedPermission) {
      toast.error('请选择人员、资源和权限');
      return;
    }
    try {
      await explainPermission.mutateAsync(decisionRequest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '权限解释失败');
    }
  };

  const handleValidateSchema = async () => {
    try {
      const result = await validateSchema.mutateAsync(schemaDraft);
      if (result.valid === false) {
        toast.error(result.error || 'Schema 校验失败');
      } else {
        toast.success('Schema 校验通过');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Schema 校验失败');
    }
  };

  const handlePublishSchema = async () => {
    try {
      await publishSchema.mutateAsync(schemaDraft);
      toast.success('Schema 已发布');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Schema 发布失败');
    }
  };

  const refreshAll = () => {
    schemaQuery.refetch();
    catalogQuery.refetch();
    usersQuery.refetch();
    groupsQuery.refetch();
    resourcesQuery.refetch();
    resourceRelationshipsQuery.refetch();
    subjectRelationshipsQuery.refetch();
  };

  const stats = summarize(resourceModels);

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5" /> 权限中心
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            用人员、角色、资源和可执行操作来理解权限；技术字段仍保留在辅助信息中，便于排障但不干扰日常管理。
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refreshAll}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> 刷新目录与权限
        </Button>
      </div>

      <PlainLanguageHero stats={stats} schemaVersion={schemaQuery.data?.version} />

      <Tabs defaultValue="model" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="model"><Boxes className="h-3.5 w-3.5" /> 权限模型</TabsTrigger>
          <TabsTrigger value="subject"><UserRound className="h-3.5 w-3.5" /> 人员与用户组</TabsTrigger>
          <TabsTrigger value="resource"><Database className="h-3.5 w-3.5" /> 资源授权</TabsTrigger>
          <TabsTrigger value="diagnose"><SearchCheck className="h-3.5 w-3.5" /> 权限诊断</TabsTrigger>
          <TabsTrigger value="advanced"><Code2 className="h-3.5 w-3.5" /> 高级设置</TabsTrigger>
        </TabsList>

        <TabsContent value="model">
          <ResourceModelExplorer
            groups={resourceGroups}
            selected={selectedModel}
            selectedType={selectedResourceType}
            onSelect={selectResourceType}
          />
        </TabsContent>

        <TabsContent value="subject">
          <SubjectAccessPanel
            principalId={principal?.subjectId}
            subjectType={selectedSubjectType}
            subjectId={selectedSubjectId}
            subjectOptions={subjectOptions}
            onSubjectTypeChange={selectSubjectType}
            onSubjectIdChange={setSelectedSubjectId}
            resourceModels={resourceModels}
            resourceType={selectedResourceType}
            resourceId={selectedResourceId}
            resourceOptions={resourceOptions}
            onResourceTypeChange={selectResourceType}
            onResourceIdChange={setSelectedResourceId}
            relationships={subjectRelationshipsQuery.data?.relationships || []}
            relationshipsLoading={subjectRelationshipsQuery.isLoading}
            effectiveData={effectivePermissions.data}
            effectivePending={effectivePermissions.isPending}
            users={users}
            groups={groups}
            onUseCurrentUser={() => {
              if (!principal?.subjectId) return;
              setSelectedSubjectType(principal.subjectType || 'user');
              setSelectedSubjectId(principal.subjectId);
            }}
            onQueryEffective={handleEffectivePermissions}
          />
        </TabsContent>

        <TabsContent value="resource">
          <ResourceGrantPanel
            model={selectedModel}
            resourceModels={resourceModels}
            resourceType={selectedResourceType}
            resourceId={selectedResourceId}
            resourceOptions={resourceOptions}
            relation={selectedRelation}
            subjectType={selectedSubjectType}
            subjectId={selectedSubjectId}
            subjectRelation={subjectRelation}
            subjectOptions={subjectOptions}
            relationship={relationship}
            relationships={resourceRelationshipsQuery.data?.relationships || []}
            loading={resourceRelationshipsQuery.isLoading}
            writePending={writeRelationship.isPending}
            deletePending={deleteRelationships.isPending}
            users={users}
            groups={groups}
            onResourceTypeChange={selectResourceType}
            onResourceIdChange={setSelectedResourceId}
            onRelationChange={setSelectedRelation}
            onSubjectTypeChange={selectSubjectType}
            onSubjectIdChange={setSelectedSubjectId}
            onSubjectRelationChange={setSubjectRelation}
            onWrite={handleWriteRelationship}
            onDelete={handleDeleteRelationship}
          />
        </TabsContent>

        <TabsContent value="diagnose">
          <PermissionDiagnosisPanel
            model={selectedModel}
            resourceModels={resourceModels}
            resourceType={selectedResourceType}
            resourceId={selectedResourceId}
            resourceOptions={resourceOptions}
            subjectType={selectedSubjectType}
            subjectId={selectedSubjectId}
            subjectOptions={subjectOptions}
            permission={selectedPermission}
            users={users}
            groups={groups}
            checkData={checkPermission.data}
            explainData={explainPermission.data}
            checkPending={checkPermission.isPending}
            explainPending={explainPermission.isPending}
            onResourceTypeChange={selectResourceType}
            onResourceIdChange={setSelectedResourceId}
            onSubjectTypeChange={selectSubjectType}
            onSubjectIdChange={setSelectedSubjectId}
            onPermissionChange={setSelectedPermission}
            onCheck={handleCheckPermission}
            onExplain={handleExplainPermission}
          />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSchemaPanel
            schemaDraft={schemaDraft}
            onSchemaDraftChange={setSchemaDraft}
            version={schemaQuery.data?.version}
            loading={schemaQuery.isLoading}
            validating={validateSchema.isPending}
            publishing={publishSchema.isPending}
            models={resourceModels}
            onValidate={handleValidateSchema}
            onPublish={handlePublishSchema}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlainLanguageHero({ stats, schemaVersion }: { stats: ModelStats; schemaVersion?: string }) {
  const steps = [
    { icon: <UserRound className="h-4 w-4" />, title: '谁', detail: '用户、用户组、服务账号', value: `${stats.subjectKinds} 类主体` },
    { icon: <GitBranch className="h-4 w-4" />, title: '以什么身份', detail: '所有者、管理员、成员、查看者', value: `${stats.relations} 个关系` },
    { icon: <Database className="h-4 w-4" />, title: '访问什么', detail: '用户源、项目、Skill、Agent、运行环境', value: `${stats.resources} 类资源` },
    { icon: <KeyRound className="h-4 w-4" />, title: '可以做什么', detail: '查看、管理、执行、部署', value: `${stats.permissions} 个权限点` },
  ];
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> 一句话理解权限
          {schemaVersion ? <Badge variant="outline" className="text-[10px]">模型 {schemaVersion}</Badge> : null}
        </CardTitle>
        <CardDescription>一条授权表达的是：某个主体，以某种角色访问某个资源，因此获得一组操作能力。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-lg border bg-background/70 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">{step.icon}{step.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{step.detail}</div>
              <div className="mt-2 text-[10px] font-medium text-primary">{step.value}</div>
              {index < steps.length - 1 ? <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full border bg-background p-1 text-muted-foreground md:block" /> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceModelExplorer({ groups, selected, selectedType, onSelect }: {
  groups: ReturnType<typeof groupResources>;
  selected?: FriendlyResourceModel;
  selectedType: string;
  onSelect: (type: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <div className="space-y-3">
        {groups.map((group) => (
          <Card key={group.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{group.label}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {group.resources.map((resource) => (
                <button
                  type="button"
                  key={resource.type}
                  onClick={() => onSelect(resource.type)}
                  className={`rounded-lg border p-3 text-left transition hover:bg-muted ${selectedType === resource.type ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{resource.label}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{resource.description}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{resource.type}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">{resource.roles.length || resource.relations.filter((item) => !isStructuralRelation(item.key)).length} 个角色</Badge>
                    <Badge variant="secondary" className="text-[10px]">{resource.permissions.length} 个能力</Badge>
                    {resource.inheritedRelations.length > 0 ? <Badge variant="secondary" className="text-[10px]">可继承</Badge> : null}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <ResourceHumanDetail resource={selected} />
    </div>
  );
}

function ResourceHumanDetail({ resource }: { resource?: FriendlyResourceModel }) {
  if (!resource) return <EmptyCard text="正在加载权限模型…" />;
  const assignableRelations = resource.relations.filter((item) => !isStructuralRelation(item.key));
  const permissionsByCategory = groupPermissions(resource.permissions);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{resource.label}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl">{resource.description}</CardDescription>
            </div>
            <div className="flex gap-1">
              <Badge variant="secondary">{resource.type}</Badge>
              <Badge variant="outline">{sourceLabel(resource.source)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MiniMetric label="可分配角色" value={resource.roles.length || assignableRelations.length} />
          <MiniMetric label="可检查能力" value={resource.permissions.length} />
          <MiniMetric label="继承入口" value={resource.inheritedRelations.length} />
          <MiniMetric label="模型来源" value={resource.source === 'merged' ? '已合并' : '单一来源'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">可以给谁分配哪些角色</CardTitle>
          <CardDescription>角色是管理员日常分配的概念；底层 Relationship Key 仅作为辅助信息展示。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(resource.roles.length > 0 ? resource.roles.map((role) => ({
            key: role.relation || role.roleKey,
            label: role.label,
            description: role.description || roleMeaning(role.relation || role.roleKey),
            targets: resource.relations.find((item) => item.key === role.relation)?.targets,
          })) : assignableRelations.map((relation) => ({
            key: relation.key,
            label: relation.label,
            description: relation.description || roleMeaning(relation.key),
            targets: relation.targets,
          }))).map((role) => (
            <div key={role.key} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{role.label}</div>
                <Badge variant="outline" className="text-[10px]">{role.key}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{role.description}</div>
              <div className="mt-2 text-[11px]"><span className="text-muted-foreground">可授予：</span>{friendlyTargets(role.targets)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {resource.inheritedRelations.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">权限从哪里继承</CardTitle>
            <CardDescription>上级资源上的角色可以沿这些入口向当前资源传递。</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {resource.inheritedRelations.map((relation) => (
              <div key={relation.key} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-sm font-medium"><FolderTree className="h-4 w-4" />{relation.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{relation.description}</div>
                {relation.targets ? <div className="mt-2 text-[11px]">上级类型：{friendlyTargets(relation.targets)}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">最终可以做什么</CardTitle>
          <CardDescription>系统根据直接角色和上级继承，计算这些可检查的业务能力。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissionsByCategory.map((group) => (
            <div key={group.category}>
              <div className="mb-2 text-xs font-medium">{permissionCategoryLabel(group.category)}</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {group.permissions.map((permission) => <HumanPermissionCard key={permission.key} permission={permission} />)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HumanPermissionCard({ permission }: { permission: FriendlyPermission }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{permission.label}</div>
        <Badge variant="secondary" className="text-[10px]">{permission.key}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{permission.description}</div>
      <div className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-[11px]">{permissionSentence(permission)}</div>
      {permission.expression ? <details className="mt-2"><summary className="cursor-pointer text-[10px] text-muted-foreground">查看技术表达式</summary><code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-[10px]">{permission.expression}</code></details> : null}
    </div>
  );
}

function SubjectAccessPanel(props: {
  principalId?: string;
  subjectType: string;
  subjectId: string;
  subjectOptions: DirectoryOption[];
  onSubjectTypeChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  resourceModels: FriendlyResourceModel[];
  resourceType: string;
  resourceId: string;
  resourceOptions: DirectoryOption[];
  onResourceTypeChange: (value: string) => void;
  onResourceIdChange: (value: string) => void;
  relationships: IamRelationship[];
  relationshipsLoading: boolean;
  effectiveData?: IamAuthzEffectivePermissionsReply;
  effectivePending: boolean;
  users: IamUser[];
  groups: IamGroup[];
  onUseCurrentUser: () => void;
  onQueryEffective: () => void;
}) {
  const subject = resolveDirectoryLabel(props.subjectType, props.subjectId, props.users, props.groups);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><UsersRound className="h-4 w-4" /> 先选择一个人员或用户组</CardTitle>
          <CardDescription>目录名称优先展示，UUID 仅作为辅助识别信息。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
          <SelectField label="主体类型" value={props.subjectType} options={SUBJECT_TYPES} onChange={props.onSubjectTypeChange} />
          <DirectorySelect label={subjectTypeLabel(props.subjectType)} value={props.subjectId} options={props.subjectOptions} onChange={props.onSubjectIdChange} placeholder="选择目录中的人员或用户组" />
          <Button variant="outline" size="sm" onClick={props.onUseCurrentUser} disabled={!props.principalId}>使用当前用户</Button>
          <div className="md:col-span-3 rounded-md border bg-muted/20 p-2 text-xs">
            <span className="font-medium">{subject.label || '未选择'}</span>
            <span className="ml-2 text-muted-foreground">{subjectTypeDescription(props.subjectType)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">直接分配给它的角色</CardTitle>
            <CardDescription>只展示直接 Relationship；继承后的结果在右侧查询。</CardDescription>
          </CardHeader>
          <CardContent>
            <HumanRelationshipTable relationships={props.relationships} loading={props.relationshipsLoading} users={props.users} groups={props.groups} emptyText="当前主体没有直接角色" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">它在某个资源上最终能做什么</CardTitle>
            <CardDescription>一次检查当前资源模型里的全部权限，包含直接角色和继承结果。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <SelectField label="资源类型" value={props.resourceType} options={resourceModelOptions(props.resourceModels)} onChange={props.onResourceTypeChange} />
              <ResourceIdField value={props.resourceId} options={props.resourceOptions} onChange={props.onResourceIdChange} />
            </div>
            <Button size="sm" onClick={props.onQueryEffective} disabled={props.effectivePending || !props.subjectId || !props.resourceId}>查询最终权限</Button>
            {props.effectiveData ? <EffectivePermissionCards data={props.effectiveData} /> : <Hint text="选择资源后点击查询，系统会把允许和拒绝的操作分开展示。" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResourceGrantPanel(props: {
  model?: FriendlyResourceModel;
  resourceModels: FriendlyResourceModel[];
  resourceType: string;
  resourceId: string;
  resourceOptions: DirectoryOption[];
  relation: string;
  subjectType: string;
  subjectId: string;
  subjectRelation: string;
  subjectOptions: DirectoryOption[];
  relationship: IamRelationship;
  relationships: IamRelationship[];
  loading: boolean;
  writePending: boolean;
  deletePending: boolean;
  users: IamUser[];
  groups: IamGroup[];
  onResourceTypeChange: (value: string) => void;
  onResourceIdChange: (value: string) => void;
  onRelationChange: (value: string) => void;
  onSubjectTypeChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onSubjectRelationChange: (value: string) => void;
  onWrite: () => void;
  onDelete: (item: IamRelationship) => void;
}) {
  const subject = resolveDirectoryLabel(props.subjectType, props.subjectId, props.users, props.groups);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[440px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">添加一条业务授权</CardTitle>
          <CardDescription>按“资源—角色—人员”顺序选择，不需要手写 SpiceDB tuple。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SelectField label="1. 资源类型" value={props.resourceType} options={resourceModelOptions(props.resourceModels)} onChange={props.onResourceTypeChange} />
          <ResourceIdField value={props.resourceId} options={props.resourceOptions} onChange={props.onResourceIdChange} />
          <SelectField label="2. 分配角色" value={props.relation} options={relationOptions(props.model)} onChange={props.onRelationChange} />
          <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">{roleMeaning(props.relation)}</div>
          <SelectField label="3. 授权对象类型" value={props.subjectType} options={SUBJECT_TYPES} onChange={props.onSubjectTypeChange} />
          <DirectorySelect label={`4. 选择${subjectTypeLabel(props.subjectType)}`} value={props.subjectId} options={props.subjectOptions} onChange={props.onSubjectIdChange} placeholder="选择目录对象或输入稳定 ID" />
          {props.subjectType === 'group' ? <SelectField label="用户组成员关系" value={props.subjectRelation || 'member'} options={[{ value: 'member', label: '组内成员（member）' }]} onChange={props.onSubjectRelationChange} /> : null}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-[10px] font-medium text-primary">授权预览</div>
            <div className="mt-1 text-sm font-medium">
              将“{subject.label || '未选择对象'}”设为“{resourceLabel(props.resourceType)} {props.resourceId || '未选择资源'}”的“{relationLabel(props.relation)}”
            </div>
            <code className="mt-2 block break-all text-[10px] text-muted-foreground">{technicalRelationship(props.relationship)}</code>
          </div>
          <Button onClick={props.onWrite} disabled={props.writePending || !props.subjectId || !props.resourceId} className="w-full">确认添加授权</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">当前资源已经授权给谁</CardTitle>
          <CardDescription>优先显示人员和用户组名称，同时保留稳定 ID 和底层 tuple。</CardDescription>
        </CardHeader>
        <CardContent>
          <HumanRelationshipTable relationships={props.relationships} loading={props.loading} users={props.users} groups={props.groups} emptyText="当前资源还没有直接授权" deletePending={props.deletePending} onDelete={props.onDelete} />
        </CardContent>
      </Card>
    </div>
  );
}

function PermissionDiagnosisPanel(props: {
  model?: FriendlyResourceModel;
  resourceModels: FriendlyResourceModel[];
  resourceType: string;
  resourceId: string;
  resourceOptions: DirectoryOption[];
  subjectType: string;
  subjectId: string;
  subjectOptions: DirectoryOption[];
  permission: string;
  users: IamUser[];
  groups: IamGroup[];
  checkData?: IamCheckPermissionResponse;
  explainData?: IamCheckPermissionResponse;
  checkPending: boolean;
  explainPending: boolean;
  onResourceTypeChange: (value: string) => void;
  onResourceIdChange: (value: string) => void;
  onSubjectTypeChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onPermissionChange: (value: string) => void;
  onCheck: () => void;
  onExplain: () => void;
}) {
  const subject = resolveDirectoryLabel(props.subjectType, props.subjectId, props.users, props.groups);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><SearchCheck className="h-4 w-4" /> 用一句话检查权限</CardTitle>
          <CardDescription>选择“谁想对什么资源做什么”，系统返回允许/拒绝和推导路径。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SelectField label="主体类型" value={props.subjectType} options={SUBJECT_TYPES} onChange={props.onSubjectTypeChange} />
          <DirectorySelect label={subjectTypeLabel(props.subjectType)} value={props.subjectId} options={props.subjectOptions} onChange={props.onSubjectIdChange} placeholder="选择人员或用户组" />
          <SelectField label="资源类型" value={props.resourceType} options={resourceModelOptions(props.resourceModels)} onChange={props.onResourceTypeChange} />
          <ResourceIdField value={props.resourceId} options={props.resourceOptions} onChange={props.onResourceIdChange} />
          <SelectField label="想执行的操作" value={props.permission} options={(props.model?.permissions || []).map((item) => ({ value: item.key, label: `${item.label}（${item.key}）` }))} onChange={props.onPermissionChange} />
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <span className="font-medium">{subject.label || '未选择主体'}</span>
            <span className="mx-1 text-muted-foreground">是否可以</span>
            <span className="font-medium">{permissionLabel(props.permission)}</span>
            <span className="mx-1 text-muted-foreground">：</span>
            <span className="font-medium">{resourceLabel(props.resourceType)} {props.resourceId || '未选择资源'}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={props.onCheck} disabled={props.checkPending}>快速检查</Button>
            <Button size="sm" onClick={props.onExplain} disabled={props.explainPending}>解释为什么</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {props.checkData ? <DecisionCard title="检查结果" data={props.checkData} /> : <HintCard title="检查结果" text="快速检查会返回最终允许或拒绝。" />}
        {props.explainData ? <DecisionCard title="推导路径" data={props.explainData} showSteps /> : <HintCard title="推导路径" text="解释功能用于排查权限来自直接角色、用户组还是父级资源继承。" />}
      </div>
    </div>
  );
}

function AdvancedSchemaPanel(props: {
  schemaDraft: string;
  onSchemaDraftChange: (value: string) => void;
  version?: string;
  loading: boolean;
  validating: boolean;
  publishing: boolean;
  models: FriendlyResourceModel[];
  onValidate: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_460px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Schema 业务摘要</CardTitle>
          <CardDescription>先通过资源模型理解含义；只有平台开发者才需要编辑右侧原始 Schema。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {props.models.map((model) => (
            <div key={model.type} className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[180px_1fr_1fr]">
              <div>
                <div className="text-sm font-medium">{model.label}</div>
                <div className="text-[10px] text-muted-foreground">{model.type}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">角色 / 关系</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {model.relations.filter((item) => !isStructuralRelation(item.key)).slice(0, 6).map((item) => <Badge key={item.key} variant="outline" className="text-[10px]">{item.label}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">业务能力</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {model.permissions.slice(0, 8).map((item) => <Badge key={item.key} variant="secondary" className="text-[10px]">{item.label}</Badge>)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Code2 className="h-4 w-4" /> 原始 SpiceDB Schema</CardTitle>
          <CardDescription>发布会改变整个平台的授权模型，请先校验并经过评审。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea className="min-h-[520px] font-mono text-xs" value={props.schemaDraft} onChange={(event) => props.onSchemaDraftChange(event.target.value)} placeholder={props.loading ? '正在加载…' : 'SpiceDB schema'} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={props.onValidate} disabled={props.validating || !props.schemaDraft}>校验 Schema</Button>
            <Button size="sm" onClick={props.onPublish} disabled={props.publishing || !props.schemaDraft}><UploadCloud className="mr-1 h-3.5 w-3.5" /> 发布 Schema</Button>
            {props.version ? <Badge variant="secondary">版本 {props.version}</Badge> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HumanRelationshipTable({ relationships, loading, users, groups, emptyText, deletePending, onDelete }: {
  relationships: IamRelationship[];
  loading: boolean;
  users: IamUser[];
  groups: IamGroup[];
  emptyText: string;
  deletePending?: boolean;
  onDelete?: (item: IamRelationship) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">授权对象</TableHead>
          <TableHead className="text-xs">角色</TableHead>
          <TableHead className="text-xs">资源</TableHead>
          <TableHead className="text-xs">授权说明</TableHead>
          {onDelete ? <TableHead className="w-20 text-xs">操作</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? <TableRow><TableCell colSpan={onDelete ? 5 : 4} className="text-xs text-muted-foreground">正在加载授权关系…</TableCell></TableRow> : null}
        {!loading && relationships.length === 0 ? <TableRow><TableCell colSpan={onDelete ? 5 : 4} className="py-10 text-center text-xs text-muted-foreground">{emptyText}</TableCell></TableRow> : null}
        {!loading && relationships.map((item, index) => {
          const subject = resolveDirectoryLabel(item.subject.type, item.subject.id, users, groups);
          return (
            <TableRow key={`${technicalRelationship(item)}:${index}`}>
              <TableCell className="text-xs">
                <div className="font-medium">{subject.label}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{subjectTypeLabel(item.subject.type)} · {shortId(item.subject.id)}</div>
                {item.subject.relation ? <Badge variant="outline" className="mt-1 text-[10px]">{relationLabel(item.subject.relation)}</Badge> : null}
              </TableCell>
              <TableCell className="text-xs">
                <div className="font-medium">{relationLabel(item.relation)}</div>
                <div className="text-[10px] text-muted-foreground">{item.relation}</div>
              </TableCell>
              <TableCell className="text-xs">
                <div className="font-medium">{resourceLabel(item.resource.type)}</div>
                <div className="text-[10px] text-muted-foreground">{item.resource.type} · {shortId(item.resource.id)}</div>
              </TableCell>
              <TableCell className="max-w-[360px] text-xs">
                <div>{relationshipSummary(item, users, groups)}</div>
                <code className="mt-1 block break-all text-[9px] text-muted-foreground">{technicalRelationship(item)}</code>
              </TableCell>
              {onDelete ? <TableCell><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onDelete(item)} disabled={deletePending}>移除</Button></TableCell> : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function EffectivePermissionCards({ data }: { data: IamAuthzEffectivePermissionsReply }) {
  const entries = Object.entries(data.permissions || {});
  const allowed = entries.filter(([, result]) => result.allowed);
  const denied = entries.filter(([, result]) => !result.allowed);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MiniMetric label="允许" value={allowed.length} />
        <MiniMetric label="拒绝" value={denied.length} />
      </div>
      {allowed.length > 0 ? <PermissionResultGroup title="允许执行" entries={allowed} allowed /> : null}
      {denied.length > 0 ? <PermissionResultGroup title="当前无权限" entries={denied} /> : null}
    </div>
  );
}

function PermissionResultGroup({ title, entries, allowed = false }: {
  title: string;
  entries: Array<[string, { allowed: boolean; effect?: string; reason?: string }]>;
  allowed?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium">{title}</div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {entries.map(([permission, result]) => (
          <div key={permission} className={`rounded-lg border p-2 ${allowed ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-muted/20'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium">{permissionLabel(permission)}</div>
              <Badge variant={allowed ? 'default' : 'secondary'} className="text-[10px]">{allowed ? '允许' : '拒绝'}</Badge>
            </div>
            <div className="text-[10px] text-muted-foreground">{permission}</div>
            {result.reason ? <div className="mt-1 text-[10px] text-muted-foreground">{result.reason}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionCard({ title, data, showSteps = false }: { title: string; data: IamCheckPermissionResponse; showSteps?: boolean }) {
  return (
    <Card className={data.allowed ? 'border-emerald-500/30' : 'border-destructive/30'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          {title}
          <Badge variant={data.allowed ? 'default' : 'destructive'}>{data.allowed ? '允许' : '拒绝'}</Badge>
        </CardTitle>
        <CardDescription>{data.reason || (data.allowed ? '权限模型允许本次操作。' : '当前关系和继承链无法满足该权限。')}</CardDescription>
      </CardHeader>
      {showSteps ? (
        <CardContent>
          {data.steps && data.steps.length > 0 ? (
            <ol className="space-y-2">
              {data.steps.map((step, index) => (
                <li key={`${step}:${index}`} className="flex gap-2 rounded-md border p-2 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">{index + 1}</span>
                  <span>{humanizeDecisionStep(step)}</span>
                </li>
              ))}
            </ol>
          ) : <Hint text="后端当前只返回最终决策，没有返回逐步推导信息。" />}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ResourceIdField({ value, options, onChange }: { value: string; options: DirectoryOption[]; onChange: (value: string) => void }) {
  if (options.length > 0) return <DirectorySelect label="资源实例" value={value} options={options} onChange={onChange} placeholder="选择资源实例" />;
  return <Field label="资源 ID" value={value} onChange={onChange} placeholder="输入资源的稳定 ID" />;
}

function DirectorySelect({ label, value, options, onChange, placeholder }: { label: string; value: string; options: DirectoryOption[]; onChange: (value: string) => void; placeholder: string }) {
  if (options.length === 0) return <Field label={label} value={value} onChange={onChange} placeholder={placeholder} />;
  const normalized = options.some((option) => option.value === value)
    ? options
    : value ? [{ value, label: value, description: '当前值不在已加载目录中', type: 'unknown' }, ...options] : options;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {normalized.map((option) => <option key={`${option.type}:${option.value}`} value={option.value}>{option.label}{option.description ? ` — ${option.description}` : ''}</option>)}
      </select>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  const normalized = options.some((option) => option.value === value) ? options : value ? [{ value, label: value }, ...options] : options;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        {normalized.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Input className="h-9 text-xs" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-md border bg-muted/10 p-2"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-0.5 text-sm font-semibold">{value}</div></div>;
}

function EmptyCard({ text }: { text: string }) {
  return <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}

function Hint({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{text}</div>;
}

function HintCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent><Hint text={text} /></CardContent></Card>;
}

function directoryOptions(type: string, users: IamUser[], groups: IamGroup[]): DirectoryOption[] {
  if (type === 'user') return userDirectoryOptions(users);
  if (type === 'group') return groupDirectoryOptions(groups);
  return [];
}

function resourceModelOptions(models: FriendlyResourceModel[]) {
  return models.map((model) => ({ value: model.type, label: `${model.label}（${model.type}）` }));
}

function relationOptions(model?: FriendlyResourceModel) {
  if (!model) return [];
  const roles = model.roles.filter((role) => role.relation).map((role) => ({ value: role.relation || role.roleKey, label: `${role.label}（${role.relation || role.roleKey}）` }));
  const seen = new Set(roles.map((item) => item.value));
  const relations = model.relations
    .filter((relation) => !isStructuralRelation(relation.key) && !seen.has(relation.key))
    .map((relation) => ({ value: relation.key, label: `${relation.label}（${relation.key}）` }));
  return [...roles, ...relations];
}

function isStructuralRelation(key: string) {
  return ['parent', 'zone', 'backing_skill', 'runs_agent'].includes(key);
}

function sourceLabel(source: FriendlyResourceModel['source']) {
  if (source === 'merged') return '目录 + Schema';
  if (source === 'control-plane') return '资源目录';
  return 'Schema';
}

function groupPermissions(permissions: FriendlyPermission[]) {
  const order: PermissionCategory[] = ['read', 'manage', 'operate', 'other'];
  return order.map((category) => ({ category, permissions: permissions.filter((item) => permissionCategory(item) === category) })).filter((group) => group.permissions.length > 0);
}

function humanizeDecisionStep(step: string) {
  if (step.includes('->')) return expressionToFriendlyText(step);
  return step
    .replaceAll('subject', '主体')
    .replaceAll('resource', '资源')
    .replaceAll('permission', '权限')
    .replaceAll('relation', '关系');
}

type ModelStats = { resources: number; relations: number; permissions: number; subjectKinds: number };

function summarize(models: FriendlyResourceModel[]): ModelStats {
  const subjectTypes = new Set<string>();
  let relations = 0;
  let permissions = 0;
  for (const model of models) {
    relations += model.relations.length;
    permissions += model.permissions.length;
    for (const relation of model.relations) {
      for (const target of (relation.targets || '').split('|')) {
        const type = target.trim().split('#')[0];
        if (type) subjectTypes.add(type);
      }
    }
  }
  return { resources: models.length, relations, permissions, subjectKinds: subjectTypes.size || SUBJECT_TYPES.length };
}

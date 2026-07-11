'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  KeyRound,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Trash2,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  IamUser,
} from '@/lib/api/types';
import {
  buildFriendlyResourceModels,
  permissionLabel,
  relationLabel,
  resourceLabel,
  type FriendlyPermission,
  type FriendlyResourceModel,
} from '@/lib/authz/schema-summary';
import {
  groupDirectoryOptions,
  permissionCategory,
  permissionCategoryLabel,
  permissionSentence,
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

const BUSINESS_SECTIONS = [
  {
    key: 'resources',
    label: '资源访问管理',
    description: '给项目、Skill、Agent 等资源添加成员和角色',
    icon: Database,
  },
  {
    key: 'subjects',
    label: '人员权限',
    description: '查看某个人或用户组已经获得的访问权限',
    icon: UsersRound,
  },
  {
    key: 'diagnose',
    label: '权限排查',
    description: '排查某次访问为什么被允许或拒绝',
    icon: SearchCheck,
  },
  {
    key: 'roles',
    label: '角色与能力',
    description: '查看每类资源有哪些业务角色和操作能力',
    icon: KeyRound,
  },
  {
    key: 'advanced',
    label: '模型设置',
    description: '面向平台管理员的权限模型配置',
    icon: Code2,
  },
] as const;

type BusinessSection = (typeof BUSINESS_SECTIONS)[number]['key'];

const SUBJECT_TYPES = [
  { value: 'user', label: '用户' },
  { value: 'group', label: '用户组' },
  { value: 'service', label: '服务账号' },
  { value: 'agent', label: 'Agent 身份' },
  { value: 'workload', label: '工作负载' },
];

const BUSINESS_SUBJECT_TYPES = SUBJECT_TYPES.slice(0, 2);
const STRUCTURAL_RELATIONS = new Set(['parent', 'zone', 'backing_skill', 'runs_agent']);
const SUBJECT_MODEL_TYPES = new Set(['user', 'service', 'service_account', 'workload', 'application']);
const TECHNICAL_MODEL_TYPES = new Set(['iam_authz', 'iam']);
const DEFAULT_RESOURCE_IDS: Record<string, string> = { zone: 'aisphere', iam_authz: 'global' };

export function PermissionsBusinessPage({ identityOrg }: { identityOrg: string }) {
  const { data: principal } = useMe();
  const schemaQuery = useIamAuthzSchema();
  const catalogQuery = useIamAuthzCatalog();
  const usersQuery = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const groupsQuery = useIamDirectoryGroups(identityOrg);

  const users = usersQuery.data?.users || [];
  const groups = groupsQuery.data?.groups || [];
  const models = useMemo(
    () => buildFriendlyResourceModels(
      catalogQuery.data?.resourceTypes,
      catalogQuery.data?.roleTemplates,
      schemaQuery.data?.text || '',
    ),
    [catalogQuery.data?.resourceTypes, catalogQuery.data?.roleTemplates, schemaQuery.data?.text],
  );
  const businessModels = useMemo(
    () => models.filter((model) => !SUBJECT_MODEL_TYPES.has(model.type) && !TECHNICAL_MODEL_TYPES.has(model.type)),
    [models],
  );

  const [section, setSection] = useState<BusinessSection>('resources');

  const [grantResourceType, setGrantResourceType] = useState('project');
  const [grantResourceId, setGrantResourceId] = useState('');
  const [grantRelation, setGrantRelation] = useState('member');
  const [grantSubjectType, setGrantSubjectType] = useState('user');
  const [grantSubjectId, setGrantSubjectId] = useState('');

  const [accessSubjectType, setAccessSubjectType] = useState('user');
  const [accessSubjectId, setAccessSubjectId] = useState('');
  const [accessResourceType, setAccessResourceType] = useState('project');
  const [accessResourceId, setAccessResourceId] = useState('');

  const [diagnoseSubjectType, setDiagnoseSubjectType] = useState('user');
  const [diagnoseSubjectId, setDiagnoseSubjectId] = useState('');
  const [diagnoseResourceType, setDiagnoseResourceType] = useState('project');
  const [diagnoseResourceId, setDiagnoseResourceId] = useState('');
  const [diagnosePermission, setDiagnosePermission] = useState('view');

  const [roleResourceType, setRoleResourceType] = useState('project');
  const [schemaDraft, setSchemaDraft] = useState('');

  useEffect(() => {
    if (schemaQuery.data?.text && !schemaDraft) setSchemaDraft(schemaQuery.data.text);
  }, [schemaDraft, schemaQuery.data?.text]);

  useEffect(() => {
    if (!principal?.subjectId) return;
    if (!accessSubjectId) {
      setAccessSubjectType(principal.subjectType || 'user');
      setAccessSubjectId(principal.subjectId);
    }
    if (!diagnoseSubjectId) {
      setDiagnoseSubjectType(principal.subjectType || 'user');
      setDiagnoseSubjectId(principal.subjectId);
    }
  }, [accessSubjectId, diagnoseSubjectId, principal?.subjectId, principal?.subjectType]);

  useEffect(() => {
    if (businessModels.length === 0) return;
    const preferred = businessModels.find((model) => model.type === 'project') || businessModels[0];
    if (!businessModels.some((model) => model.type === grantResourceType)) setGrantResourceType(preferred.type);
    if (!businessModels.some((model) => model.type === accessResourceType)) setAccessResourceType(preferred.type);
    if (!businessModels.some((model) => model.type === diagnoseResourceType)) setDiagnoseResourceType(preferred.type);
    if (!businessModels.some((model) => model.type === roleResourceType)) setRoleResourceType(preferred.type);
  }, [accessResourceType, businessModels, diagnoseResourceType, grantResourceType, roleResourceType]);

  const grantModel = findModel(businessModels, grantResourceType);
  const accessModel = findModel(businessModels, accessResourceType);
  const diagnoseModel = findModel(businessModels, diagnoseResourceType);
  const roleModel = findModel(models, roleResourceType);

  const grantResourcesQuery = useIamResources({ type: grantResourceType });
  const accessResourcesQuery = useIamResources({ type: accessResourceType });
  const diagnoseResourcesQuery = useIamResources({ type: diagnoseResourceType });

  const grantResourceOptions = useMemo(
    () => resourceDirectoryOptions(grantResourcesQuery.data?.resources || []),
    [grantResourcesQuery.data?.resources],
  );
  const accessResourceOptions = useMemo(
    () => resourceDirectoryOptions(accessResourcesQuery.data?.resources || []),
    [accessResourcesQuery.data?.resources],
  );
  const diagnoseResourceOptions = useMemo(
    () => resourceDirectoryOptions(diagnoseResourcesQuery.data?.resources || []),
    [diagnoseResourcesQuery.data?.resources],
  );

  useEffect(() => {
    setGrantResourceId((current) => normalizeResourceId(current, grantResourceType, grantResourceOptions));
  }, [grantResourceOptions, grantResourceType]);
  useEffect(() => {
    setAccessResourceId((current) => normalizeResourceId(current, accessResourceType, accessResourceOptions));
  }, [accessResourceOptions, accessResourceType]);
  useEffect(() => {
    setDiagnoseResourceId((current) => normalizeResourceId(current, diagnoseResourceType, diagnoseResourceOptions));
  }, [diagnoseResourceOptions, diagnoseResourceType]);

  useEffect(() => {
    const roles = assignableRoles(grantModel);
    if (roles.length > 0 && !roles.some((role) => role.key === grantRelation)) setGrantRelation(roles[0].key);
  }, [grantModel, grantRelation]);

  useEffect(() => {
    const permissions = diagnoseModel?.permissions || [];
    if (permissions.length > 0 && !permissions.some((permission) => permission.key === diagnosePermission)) {
      setDiagnosePermission(permissions[0].key);
    }
  }, [diagnoseModel, diagnosePermission]);

  const grantSubjectOptions = useMemo(
    () => subjectDirectoryOptions(grantSubjectType, users, groups),
    [grantSubjectType, groups, users],
  );
  const accessSubjectOptions = useMemo(
    () => subjectDirectoryOptions(accessSubjectType, users, groups),
    [accessSubjectType, groups, users],
  );
  const diagnoseSubjectOptions = useMemo(
    () => subjectDirectoryOptions(diagnoseSubjectType, users, groups),
    [diagnoseSubjectType, groups, users],
  );

  const resourceRelationshipsQuery = useIamAuthzRelationships({
    resourceType: grantResourceType,
    resourceId: grantResourceId || '__none__',
  });
  const subjectRelationshipsQuery = useIamAuthzRelationships({
    subjectType: accessSubjectType,
    subjectId: accessSubjectId || '__none__',
  });

  const writeRelationship = useIamWriteAuthzRelationship();
  const deleteRelationships = useIamDeleteAuthzRelationships();
  const effectivePermissions = useIamEffectivePermissions();
  const checkPermission = useIamCheckAuthzPermission();
  const explainPermission = useIamExplainAuthzPermission();
  const validateSchema = useIamValidateAuthzSchema();
  const publishSchema = useIamPublishAuthzSchema();

  const relationship: IamRelationship = {
    resource: { type: grantResourceType, id: grantResourceId },
    relation: grantRelation,
    subject: {
      type: grantSubjectType,
      id: grantSubjectId,
      relation: grantSubjectType === 'group' ? 'member' : undefined,
    },
  };

  const addAccess = async () => {
    if (!grantResourceId || !grantRelation || !grantSubjectId) {
      toast.error('请选择资源、角色和授权对象');
      return;
    }
    try {
      await writeRelationship.mutateAsync(relationship);
      toast.success('访问权限已添加');
      setGrantSubjectId('');
      await resourceRelationshipsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加访问权限失败');
    }
  };

  const removeAccess = async (item: IamRelationship) => {
    try {
      await deleteRelationships.mutateAsync({
        resourceType: item.resource.type,
        resourceId: item.resource.id,
        relation: item.relation,
        subjectType: item.subject.type,
        subjectId: item.subject.id,
        subjectRelation: item.subject.relation,
      });
      toast.success('访问权限已移除');
      await resourceRelationshipsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移除访问权限失败');
    }
  };

  const queryEffectivePermissions = async () => {
    if (!accessSubjectId || !accessResourceId || !accessModel) {
      toast.error('请选择人员和资源');
      return;
    }
    try {
      await effectivePermissions.mutateAsync({
        subjectType: accessSubjectType,
        subjectId: accessSubjectId,
        subjectRelation: accessSubjectType === 'group' ? 'member' : undefined,
        resourceType: accessResourceType,
        resourceId: accessResourceId,
        permissions: accessModel.permissions.map((permission) => permission.key),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '查询人员权限失败');
    }
  };

  const decisionRequest = {
    subject: {
      type: diagnoseSubjectType,
      id: diagnoseSubjectId,
      relation: diagnoseSubjectType === 'group' ? 'member' : undefined,
    },
    resource: { type: diagnoseResourceType, id: diagnoseResourceId },
    permission: diagnosePermission,
    orgId: principal?.orgId || identityOrg,
  };

  const runCheck = async () => {
    if (!diagnoseSubjectId || !diagnoseResourceId || !diagnosePermission) {
      toast.error('请选择人员、资源和操作');
      return;
    }
    try {
      await checkPermission.mutateAsync(decisionRequest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '权限检查失败');
    }
  };

  const runExplain = async () => {
    if (!diagnoseSubjectId || !diagnoseResourceId || !diagnosePermission) {
      toast.error('请选择人员、资源和操作');
      return;
    }
    try {
      await explainPermission.mutateAsync(decisionRequest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '权限解释失败');
    }
  };

  const refreshAll = () => {
    schemaQuery.refetch();
    catalogQuery.refetch();
    usersQuery.refetch();
    groupsQuery.refetch();
    grantResourcesQuery.refetch();
    accessResourcesQuery.refetch();
    diagnoseResourcesQuery.refetch();
    resourceRelationshipsQuery.refetch();
    subjectRelationshipsQuery.refetch();
  };

  const content = {
    resources: (
      <ResourceAccessSection
        models={businessModels}
        model={grantModel}
        resourceType={grantResourceType}
        resourceId={grantResourceId}
        resourceOptions={grantResourceOptions}
        relation={grantRelation}
        subjectType={grantSubjectType}
        subjectId={grantSubjectId}
        subjectOptions={grantSubjectOptions}
        relationship={relationship}
        relationships={resourceRelationshipsQuery.data?.relationships || []}
        loading={resourceRelationshipsQuery.isLoading}
        writing={writeRelationship.isPending}
        deleting={deleteRelationships.isPending}
        users={users}
        groups={groups}
        onResourceTypeChange={(value) => {
          setGrantResourceType(value);
          setGrantResourceId(DEFAULT_RESOURCE_IDS[value] || '');
        }}
        onResourceIdChange={setGrantResourceId}
        onRelationChange={setGrantRelation}
        onSubjectTypeChange={(value) => {
          setGrantSubjectType(value);
          setGrantSubjectId('');
        }}
        onSubjectIdChange={setGrantSubjectId}
        onAdd={addAccess}
        onRemove={removeAccess}
      />
    ),
    subjects: (
      <SubjectAccessSection
        principalId={principal?.subjectId}
        subjectType={accessSubjectType}
        subjectId={accessSubjectId}
        subjectOptions={accessSubjectOptions}
        models={businessModels}
        model={accessModel}
        resourceType={accessResourceType}
        resourceId={accessResourceId}
        resourceOptions={accessResourceOptions}
        relationships={subjectRelationshipsQuery.data?.relationships || []}
        relationshipsLoading={subjectRelationshipsQuery.isLoading}
        effectiveData={effectivePermissions.data}
        effectivePending={effectivePermissions.isPending}
        users={users}
        groups={groups}
        onSubjectTypeChange={(value) => {
          setAccessSubjectType(value);
          setAccessSubjectId('');
        }}
        onSubjectIdChange={setAccessSubjectId}
        onUseCurrentUser={() => {
          if (!principal?.subjectId) return;
          setAccessSubjectType(principal.subjectType || 'user');
          setAccessSubjectId(principal.subjectId);
        }}
        onResourceTypeChange={(value) => {
          setAccessResourceType(value);
          setAccessResourceId(DEFAULT_RESOURCE_IDS[value] || '');
        }}
        onResourceIdChange={setAccessResourceId}
        onQuery={queryEffectivePermissions}
      />
    ),
    diagnose: (
      <DiagnosisSection
        models={businessModels}
        model={diagnoseModel}
        subjectType={diagnoseSubjectType}
        subjectId={diagnoseSubjectId}
        subjectOptions={diagnoseSubjectOptions}
        resourceType={diagnoseResourceType}
        resourceId={diagnoseResourceId}
        resourceOptions={diagnoseResourceOptions}
        permission={diagnosePermission}
        checkData={checkPermission.data}
        explainData={explainPermission.data}
        checking={checkPermission.isPending}
        explaining={explainPermission.isPending}
        onSubjectTypeChange={(value) => {
          setDiagnoseSubjectType(value);
          setDiagnoseSubjectId('');
        }}
        onSubjectIdChange={setDiagnoseSubjectId}
        onResourceTypeChange={(value) => {
          setDiagnoseResourceType(value);
          setDiagnoseResourceId(DEFAULT_RESOURCE_IDS[value] || '');
        }}
        onResourceIdChange={setDiagnoseResourceId}
        onPermissionChange={setDiagnosePermission}
        onCheck={runCheck}
        onExplain={runExplain}
      />
    ),
    roles: (
      <RolesSection
        models={models.filter((model) => !SUBJECT_MODEL_TYPES.has(model.type))}
        model={roleModel}
        resourceType={roleResourceType}
        onResourceTypeChange={setRoleResourceType}
      />
    ),
    advanced: (
      <AdvancedSection
        schemaDraft={schemaDraft}
        version={schemaQuery.data?.version}
        loading={schemaQuery.isLoading}
        validating={validateSchema.isPending}
        publishing={publishSchema.isPending}
        onSchemaDraftChange={setSchemaDraft}
        onValidate={async () => {
          try {
            const result = await validateSchema.mutateAsync(schemaDraft);
            if (result.valid === false) toast.error(result.error || '模型校验失败');
            else toast.success('模型校验通过');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '模型校验失败');
          }
        }}
        onPublish={async () => {
          try {
            await publishSchema.mutateAsync(schemaDraft);
            toast.success('权限模型已发布');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '模型发布失败');
          }
        }}
      />
    ),
  } satisfies Record<BusinessSection, ReactNode>;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ShieldCheck className="h-5 w-5" /> 访问权限
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              按资源和人员管理访问权限。日常操作使用业务名称，底层关系仅在技术详情中展示。
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refreshAll}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> 刷新数据
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Card className="h-fit lg:sticky lg:top-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">权限管理</CardTitle>
              <CardDescription>选择要完成的业务任务</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1.5 p-2 pt-0 sm:grid-cols-2 lg:grid-cols-1">
              {BUSINESS_SECTIONS.map((item) => {
                const Icon = item.icon;
                const active = section === item.key;
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`group flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                      active ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{item.description}</span>
                    </span>
                    <ChevronRight className={`mt-1 h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="min-w-0">{content[section]}</div>
        </div>
      </div>
    </div>
  );
}

function ResourceAccessSection(props: {
  models: FriendlyResourceModel[];
  model?: FriendlyResourceModel;
  resourceType: string;
  resourceId: string;
  resourceOptions: DirectoryOption[];
  relation: string;
  subjectType: string;
  subjectId: string;
  subjectOptions: DirectoryOption[];
  relationship: IamRelationship;
  relationships: IamRelationship[];
  loading: boolean;
  writing: boolean;
  deleting: boolean;
  users: IamUser[];
  groups: IamGroup[];
  onResourceTypeChange: (value: string) => void;
  onResourceIdChange: (value: string) => void;
  onRelationChange: (value: string) => void;
  onSubjectTypeChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: IamRelationship) => void;
}) {
  const roles = assignableRoles(props.model);
  const selectedSubject = resolveDirectoryLabel(props.subjectType, props.subjectId, props.users, props.groups);
  return (
    <div className="space-y-4">
      <SectionHeading
        title="资源访问管理"
        description="先选择一个业务资源，再查看或调整谁可以访问它。"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">选择资源</CardTitle>
          <CardDescription>资源类型和资源实例都从平台目录中选择，避免手工填写技术 ID。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SelectField label="资源类型" value={props.resourceType} options={modelOptions(props.models)} onChange={props.onResourceTypeChange} />
          <EntityPicker label="资源实例" value={props.resourceId} options={props.resourceOptions} onChange={props.onResourceIdChange} placeholder="选择资源实例" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">当前访问成员</CardTitle>
                <CardDescription>显示直接添加到该资源的用户和用户组。</CardDescription>
              </div>
              <Badge variant="secondary">{props.relationships.length} 条直接授权</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <RelationshipTable
              relationships={props.relationships}
              loading={props.loading}
              users={props.users}
              groups={props.groups}
              emptyText="这个资源还没有添加访问成员"
              deleting={props.deleting}
              onRemove={props.onRemove}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">添加访问成员</CardTitle>
            <CardDescription>选择角色后，系统会自动计算该成员可执行的操作。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SelectField
              label="业务角色"
              value={props.relation}
              options={roles.map((role) => ({ value: role.key, label: role.label }))}
              onChange={props.onRelationChange}
            />
            <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
              {roleMeaning(props.relation)}
            </div>
            <SelectField
              label="成员类型"
              value={props.subjectType}
              options={BUSINESS_SUBJECT_TYPES}
              onChange={props.onSubjectTypeChange}
            />
            <EntityPicker
              label={props.subjectType === 'group' ? '用户组' : '用户'}
              value={props.subjectId}
              options={props.subjectOptions}
              onChange={props.onSubjectIdChange}
              placeholder={props.subjectType === 'group' ? '选择用户组' : '选择用户'}
            />
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="text-[10px] font-medium text-primary">授权预览</div>
              <div className="mt-1 text-sm font-medium">
                {selectedSubject.label || '未选择成员'} 将成为 {resourceLabel(props.resourceType)}“{displayOptionLabel(props.resourceId, props.resourceOptions)}”的{relationLabel(props.relation)}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] text-muted-foreground">查看技术详情</summary>
                <code className="mt-1 block break-all text-[10px] text-muted-foreground">{technicalRelationship(props.relationship)}</code>
              </details>
            </div>
            <Button className="w-full" onClick={props.onAdd} disabled={props.writing || !props.resourceId || !props.subjectId || !props.relation}>
              确认添加
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubjectAccessSection(props: {
  principalId?: string;
  subjectType: string;
  subjectId: string;
  subjectOptions: DirectoryOption[];
  models: FriendlyResourceModel[];
  model?: FriendlyResourceModel;
  resourceType: string;
  resourceId: string;
  resourceOptions: DirectoryOption[];
  relationships: IamRelationship[];
  relationshipsLoading: boolean;
  effectiveData?: IamAuthzEffectivePermissionsReply;
  effectivePending: boolean;
  users: IamUser[];
  groups: IamGroup[];
  onSubjectTypeChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onUseCurrentUser: () => void;
  onResourceTypeChange: (value: string) => void;
  onResourceIdChange: (value: string) => void;
  onQuery: () => void;
}) {
  const selectedSubject = resolveDirectoryLabel(props.subjectType, props.subjectId, props.users, props.groups);
  return (
    <div className="space-y-4">
      <SectionHeading title="人员权限" description="从人员或用户组出发，查看它已经获得的角色以及对某个资源的最终权限。" />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">选择人员或用户组</CardTitle>
          <CardDescription>目录名称优先展示，稳定 ID 收在技术详情中。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
          <SelectField label="对象类型" value={props.subjectType} options={SUBJECT_TYPES} onChange={props.onSubjectTypeChange} />
          <EntityPicker
            label={subjectTypeLabel(props.subjectType)}
            value={props.subjectId}
            options={props.subjectOptions}
            onChange={props.onSubjectIdChange}
            placeholder={`选择${subjectTypeLabel(props.subjectType)}`}
          />
          <Button variant="outline" size="sm" onClick={props.onUseCurrentUser} disabled={!props.principalId}>使用当前用户</Button>
          <div className="md:col-span-3 rounded-md border bg-muted/20 p-2 text-xs">
            <span className="font-medium">{selectedSubject.label || '未选择'}</span>
            <span className="ml-2 text-muted-foreground">{subjectTypeDescription(props.subjectType)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">已直接获得的角色</CardTitle>
            <CardDescription>这里只列出直接添加的角色，不包含从组织、项目或空间继承的权限。</CardDescription>
          </CardHeader>
          <CardContent>
            <RelationshipTable
              relationships={props.relationships}
              loading={props.relationshipsLoading}
              users={props.users}
              groups={props.groups}
              emptyText="当前对象没有直接分配的角色"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">查询对某个资源的最终权限</CardTitle>
            <CardDescription>结果会合并直接角色、用户组授权和上级资源继承。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SelectField label="资源类型" value={props.resourceType} options={modelOptions(props.models)} onChange={props.onResourceTypeChange} />
              <EntityPicker label="资源实例" value={props.resourceId} options={props.resourceOptions} onChange={props.onResourceIdChange} placeholder="选择资源实例" />
            </div>
            <Button size="sm" onClick={props.onQuery} disabled={props.effectivePending || !props.subjectId || !props.resourceId}>查询最终权限</Button>
            {props.effectiveData ? <EffectivePermissions data={props.effectiveData} /> : <EmptyHint text="选择资源后查询，系统会把允许和不允许的操作分开展示。" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DiagnosisSection(props: {
  models: FriendlyResourceModel[];
  model?: FriendlyResourceModel;
  subjectType: string;
  subjectId: string;
  subjectOptions: DirectoryOption[];
  resourceType: string;
  resourceId: string;
  resourceOptions: DirectoryOption[];
  permission: string;
  checkData?: IamCheckPermissionResponse;
  explainData?: IamCheckPermissionResponse;
  checking: boolean;
  explaining: boolean;
  onSubjectTypeChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onResourceTypeChange: (value: string) => void;
  onResourceIdChange: (value: string) => void;
  onPermissionChange: (value: string) => void;
  onCheck: () => void;
  onExplain: () => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading title="权限排查" description="复现一次业务访问，确认系统会允许还是拒绝，并查看原因。" />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">选择要排查的访问</CardTitle>
          <CardDescription>按照“谁访问哪个资源、准备执行什么操作”填写。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SelectField label="对象类型" value={props.subjectType} options={SUBJECT_TYPES} onChange={props.onSubjectTypeChange} />
          <EntityPicker label={subjectTypeLabel(props.subjectType)} value={props.subjectId} options={props.subjectOptions} onChange={props.onSubjectIdChange} placeholder={`选择${subjectTypeLabel(props.subjectType)}`} />
          <div className="hidden xl:block" />
          <SelectField label="资源类型" value={props.resourceType} options={modelOptions(props.models)} onChange={props.onResourceTypeChange} />
          <EntityPicker label="资源实例" value={props.resourceId} options={props.resourceOptions} onChange={props.onResourceIdChange} placeholder="选择资源实例" />
          <SelectField
            label="准备执行的操作"
            value={props.permission}
            options={(props.model?.permissions || []).map((permission) => ({ value: permission.key, label: permission.label }))}
            onChange={props.onPermissionChange}
          />
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
            <Button onClick={props.onCheck} disabled={props.checking || !props.subjectId || !props.resourceId}>检查是否允许</Button>
            <Button variant="outline" onClick={props.onExplain} disabled={props.explaining || !props.subjectId || !props.resourceId}>解释判断原因</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {props.checkData ? <DecisionResult title="检查结果" data={props.checkData} /> : <EmptyCard title="检查结果" text="完成上方选择后，点击“检查是否允许”。" />}
        {props.explainData ? <DecisionResult title="判断原因" data={props.explainData} showSteps /> : <EmptyCard title="判断原因" text="点击“解释判断原因”查看权限来源和推导过程。" />}
      </div>
    </div>
  );
}

function RolesSection(props: {
  models: FriendlyResourceModel[];
  model?: FriendlyResourceModel;
  resourceType: string;
  onResourceTypeChange: (value: string) => void;
}) {
  const roles = assignableRoles(props.model);
  const groupedPermissions = groupPermissions(props.model?.permissions || []);
  return (
    <div className="space-y-4">
      <SectionHeading title="角色与能力" description="用业务语言查看每类资源可分配哪些角色，以及每个角色最终包含哪些操作能力。" />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">选择资源类型</CardTitle>
          <CardDescription>这里只浏览规则，不会修改任何成员权限。</CardDescription>
        </CardHeader>
        <CardContent>
          <SelectField label="资源类型" value={props.resourceType} options={modelOptions(props.models)} onChange={props.onResourceTypeChange} />
        </CardContent>
      </Card>

      {props.model ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">可分配的业务角色</CardTitle>
              <CardDescription>{props.model.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <div key={role.key} className="rounded-lg border p-3">
                  <div className="font-medium text-sm">{role.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{roleMeaning(role.key)}</div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground">查看技术名称</summary>
                    <code className="mt-1 block text-[10px] text-muted-foreground">{role.key}</code>
                  </details>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">系统可检查的操作能力</CardTitle>
              <CardDescription>实际访问时，系统根据角色、用户组和上级资源继承计算这些能力。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedPermissions.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 text-xs font-medium">{permissionCategoryLabel(group.category)}</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {group.permissions.map((permission) => <PermissionCard key={permission.key} permission={permission} />)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : <EmptyHint text="正在加载资源权限规则。" />}
    </div>
  );
}

function AdvancedSection(props: {
  schemaDraft: string;
  version?: string;
  loading: boolean;
  validating: boolean;
  publishing: boolean;
  onSchemaDraftChange: (value: string) => void;
  onValidate: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading title="模型设置" description="仅供权限平台管理员修改底层授权模型；日常成员授权不需要进入这里。" />
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" /> 高级配置</CardTitle>
          <CardDescription>发布模型会影响所有资源的权限计算，请先校验并在测试环境验证。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">当前模型版本</span>
            <Badge variant="outline">{props.version || '未标记'}</Badge>
          </div>
          <Textarea
            className="min-h-[520px] font-mono text-xs"
            value={props.schemaDraft}
            onChange={(event) => props.onSchemaDraftChange(event.target.value)}
            disabled={props.loading}
            placeholder="正在加载权限模型…"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={props.onValidate} disabled={props.validating || !props.schemaDraft}>校验模型</Button>
            <Button onClick={props.onPublish} disabled={props.publishing || !props.schemaDraft}>发布模型</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RelationshipTable(props: {
  relationships: IamRelationship[];
  loading: boolean;
  users: IamUser[];
  groups: IamGroup[];
  emptyText: string;
  deleting?: boolean;
  onRemove?: (item: IamRelationship) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">成员</TableHead>
            <TableHead className="text-xs">角色</TableHead>
            <TableHead className="text-xs">资源</TableHead>
            <TableHead className="text-xs">来源</TableHead>
            {props.onRemove ? <TableHead className="w-20 text-xs">操作</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.loading ? (
            <TableRow><TableCell colSpan={props.onRemove ? 5 : 4} className="text-xs text-muted-foreground">正在加载访问成员…</TableCell></TableRow>
          ) : null}
          {!props.loading && props.relationships.length === 0 ? (
            <TableRow><TableCell colSpan={props.onRemove ? 5 : 4} className="py-10 text-center text-xs text-muted-foreground">{props.emptyText}</TableCell></TableRow>
          ) : null}
          {!props.loading && props.relationships.map((item, index) => {
            const subject = resolveDirectoryLabel(item.subject.type, item.subject.id, props.users, props.groups);
            return (
              <TableRow key={`${technicalRelationship(item)}:${index}`}>
                <TableCell className="text-xs">
                  <div className="font-medium">{subject.label}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{subjectTypeLabel(item.subject.type)}</div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{relationLabel(item.relation)}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{roleMeaning(item.relation)}</div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{resourceLabel(item.resource.type)}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{shortId(item.resource.id)}</div>
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline">直接添加</Badge>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground">技术详情</summary>
                    <code className="mt-1 block max-w-[340px] break-all text-[9px] text-muted-foreground">{technicalRelationship(item)}</code>
                  </details>
                </TableCell>
                {props.onRemove ? (
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => props.onRemove?.(item)} disabled={props.deleting}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> 移除
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EffectivePermissions({ data }: { data: IamAuthzEffectivePermissionsReply }) {
  const entries = Object.entries(data.permissions || {});
  const allowed = entries.filter(([, result]) => result.allowed);
  const denied = entries.filter(([, result]) => !result.allowed);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="允许的操作" value={allowed.length} />
        <Metric label="当前不可用" value={denied.length} />
      </div>
      {allowed.length > 0 ? <PermissionResultGroup title="可以执行" entries={allowed} allowed /> : null}
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
              <Badge variant={allowed ? 'default' : 'secondary'} className="text-[10px]">{allowed ? '允许' : '无权限'}</Badge>
            </div>
            {result.reason ? <div className="mt-1 text-[10px] text-muted-foreground">{result.reason}</div> : null}
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] text-muted-foreground">技术名称</summary>
              <code className="text-[10px] text-muted-foreground">{permission}</code>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionResult({ title, data, showSteps = false }: { title: string; data: IamCheckPermissionResponse; showSteps?: boolean }) {
  return (
    <Card className={data.allowed ? 'border-emerald-500/30' : 'border-destructive/30'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            {data.allowed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
            {title}
          </span>
          <Badge variant={data.allowed ? 'default' : 'destructive'}>{data.allowed ? '允许访问' : '拒绝访问'}</Badge>
        </CardTitle>
        <CardDescription>{data.reason || (data.allowed ? '当前角色和继承关系允许执行该操作。' : '当前角色和继承关系不能满足该操作。')}</CardDescription>
      </CardHeader>
      {showSteps ? (
        <CardContent>
          {data.steps && data.steps.length > 0 ? (
            <ol className="space-y-2">
              {data.steps.map((step, index) => (
                <li key={`${step}:${index}`} className="flex gap-2 rounded-md border p-2 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">{index + 1}</span>
                  <span className="break-all">{friendlyDecisionStep(step)}</span>
                </li>
              ))}
            </ol>
          ) : <EmptyHint text="后端当前返回了最终判断，但没有返回逐步推导信息。" />}
        </CardContent>
      ) : null}
    </Card>
  );
}

function PermissionCard({ permission }: { permission: FriendlyPermission }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium">{permission.label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{permission.description}</div>
      <div className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-[11px]">{permissionSentence(permission)}</div>
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] text-muted-foreground">查看技术规则</summary>
        <code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-[10px]">{permission.expression || permission.key}</code>
      </details>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const normalized = options.some((option) => option.value === value) ? options : value ? [{ value, label: value }, ...options] : options;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        {normalized.length === 0 ? <option value="">暂无可选项</option> : null}
        {normalized.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function EntityPicker({ label, value, options, onChange, placeholder }: {
  label: string;
  value: string;
  options: DirectoryOption[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  if (options.length === 0) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium">{label}</label>
        <Input className="h-9 text-xs" value={value} onChange={(event) => onChange(event.target.value)} placeholder={`${placeholder}，或输入稳定 ID`} />
      </div>
    );
  }
  const normalized = options.some((option) => option.value === value)
    ? options
    : value ? [{ value, label: value, description: '当前值不在已加载目录中', type: 'unknown' }, ...options] : options;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {normalized.map((option) => (
          <option key={`${option.type}:${option.value}`} value={option.value}>
            {option.label}{option.description ? ` — ${option.description}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-md border bg-muted/10 p-2"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-0.5 text-sm font-semibold">{value}</div></div>;
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{text}</div>;
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent><EmptyHint text={text} /></CardContent></Card>;
}

function findModel(models: FriendlyResourceModel[], type: string): FriendlyResourceModel | undefined {
  return models.find((model) => model.type === type) || models[0];
}

function assignableRoles(model?: FriendlyResourceModel): Array<{ key: string; label: string }> {
  if (!model) return [];
  const roles = model.roles
    .filter((role) => role.relation)
    .map((role) => ({ key: role.relation || role.roleKey, label: role.label }));
  const seen = new Set(roles.map((role) => role.key));
  for (const relation of model.relations) {
    if (STRUCTURAL_RELATIONS.has(relation.key) || seen.has(relation.key)) continue;
    roles.push({ key: relation.key, label: relation.label });
    seen.add(relation.key);
  }
  return roles;
}

function modelOptions(models: FriendlyResourceModel[]): Array<{ value: string; label: string }> {
  return models.map((model) => ({ value: model.type, label: model.label }));
}

function subjectDirectoryOptions(type: string, users: IamUser[], groups: IamGroup[]): DirectoryOption[] {
  if (type === 'user') return userDirectoryOptions(users);
  if (type === 'group') return groupDirectoryOptions(groups);
  return [];
}

function normalizeResourceId(current: string, resourceType: string, options: DirectoryOption[]): string {
  if (options.length > 0) {
    if (options.some((option) => option.value === current)) return current;
    return options[0].value;
  }
  return current || DEFAULT_RESOURCE_IDS[resourceType] || '';
}

function displayOptionLabel(value: string, options: DirectoryOption[]): string {
  return options.find((option) => option.value === value)?.label || value || '未选择资源';
}

function groupPermissions(permissions: FriendlyPermission[]) {
  const order: PermissionCategory[] = ['read', 'manage', 'operate', 'other'];
  return order
    .map((category) => ({ category, permissions: permissions.filter((permission) => permissionCategory(permission) === category) }))
    .filter((group) => group.permissions.length > 0);
}

function friendlyDecisionStep(step: string): string {
  return step
    .replaceAll('subject', '访问对象')
    .replaceAll('resource', '资源')
    .replaceAll('permission', '操作权限')
    .replaceAll('relation', '角色关系');
}

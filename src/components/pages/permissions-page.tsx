'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, GitBranch, KeyRound, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
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
import type { IamRelationship } from '@/lib/api/types';
import { toast } from 'sonner';

const DEFAULT_PERMISSIONS = 'view_users,manage_users,view_groups,manage_groups,view_permissions,manage_permissions';

export function PermissionsPage() {
  const schemaQuery = useIamAuthzSchema();
  const [schemaDraft, setSchemaDraft] = useState('');
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

  const activeRelationships = relationshipsQuery.data?.relationships || [];
  const relationshipPreview = useMemo(() => {
    const subject = `${relationship.subject.type}:${relationship.subject.id}${relationship.subject.relation ? `#${relationship.subject.relation}` : ''}`;
    return `${relationship.resource.type}:${relationship.resource.id}#${relationship.relation}@${subject}`;
  }, [relationship]);

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
      toast.error('Relationship 字段不完整');
      return;
    }
    try {
      await writeRelationship.mutateAsync(relationship);
      toast.success('Relationship 已写入');
      relationshipsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Relationship 写入失败');
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
      toast.success('Relationship 已删除');
      relationshipsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Relationship 删除失败');
    }
  };

  const permissionRequest = {
    subject: { type: checkForm.subjectType, id: checkForm.subjectId },
    resource: { type: checkForm.resourceType, id: checkForm.resourceId },
    permission: checkForm.permission,
  };

  const handleCheck = async () => {
    if (!checkForm.subjectId || !checkForm.resourceType || !checkForm.resourceId || !checkForm.permission) {
      toast.error('请填写 subject/resource/permission');
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
      toast.error('请填写 subject/resource/permission');
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
      toast.error('请填写 subject/resource');
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
            管理 SpiceDB schema、relationship、权限检查和有效权限视图。授权源以 SpiceDB relationship 为准，不依赖 OIDC groups。
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { schemaQuery.refetch(); relationshipsQuery.refetch(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> 刷新
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Schema 管理</CardTitle>
            <CardDescription>查看、校验和发布当前 SpiceDB schema。生产发布前建议先校验。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              className="font-mono text-xs min-h-[360px]"
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4" /> 权限检查</CardTitle>
            <CardDescription>检查某个 subject 是否拥有某资源权限，并查看解释步骤。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Subject Type" value={checkForm.subjectType} onChange={(v) => setCheckForm({ ...checkForm, subjectType: v })} />
            <Field label="Subject ID" value={checkForm.subjectId} onChange={(v) => setCheckForm({ ...checkForm, subjectId: v })} placeholder="user uuid" />
            <Field label="Resource Type" value={checkForm.resourceType} onChange={(v) => setCheckForm({ ...checkForm, resourceType: v })} />
            <Field label="Resource ID" value={checkForm.resourceId} onChange={(v) => setCheckForm({ ...checkForm, resourceId: v })} />
            <Field label="Permission" value={checkForm.permission} onChange={(v) => setCheckForm({ ...checkForm, permission: v })} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCheck} disabled={checkPermission.isPending}>Check</Button>
              <Button size="sm" variant="outline" onClick={handleExplain} disabled={explainPermission.isPending}>Explain</Button>
            </div>
            {checkPermission.data ? <DecisionCard title="Check Result" data={checkPermission.data} /> : null}
            {explainPermission.data ? <DecisionCard title="Explain Result" data={explainPermission.data} /> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> 写入 Relationship</CardTitle>
            <CardDescription>直接写入 SpiceDB relationship。后续会接入 Grant Wizard。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Resource Type" value={relationship.resource.type} onChange={(v) => setRelationship({ ...relationship, resource: { ...relationship.resource, type: v } })} />
            <Field label="Resource ID" value={relationship.resource.id} onChange={(v) => setRelationship({ ...relationship, resource: { ...relationship.resource, id: v } })} />
            <Field label="Relation" value={relationship.relation} onChange={(v) => setRelationship({ ...relationship, relation: v })} />
            <Field label="Subject Type" value={relationship.subject.type} onChange={(v) => setRelationship({ ...relationship, subject: { ...relationship.subject, type: v } })} />
            <Field label="Subject ID" value={relationship.subject.id} onChange={(v) => setRelationship({ ...relationship, subject: { ...relationship.subject, id: v } })} placeholder="user uuid / group id" />
            <Field label="Subject Relation" value={relationship.subject.relation || ''} onChange={(v) => setRelationship({ ...relationship, subject: { ...relationship.subject, relation: v } })} placeholder="例如 member，可空" />
            <div className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono break-all">{relationshipPreview}</div>
            <Button size="sm" onClick={handleWriteRelationship} disabled={writeRelationship.isPending}>写入 Relationship</Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Relationship Explorer</CardTitle>
            <CardDescription>按资源、关系或主体过滤现有 SpiceDB relationships。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input className="h-8 text-xs" placeholder="resource type" value={filter.resourceType} onChange={(e) => setFilter({ ...filter, resourceType: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="resource id" value={filter.resourceId} onChange={(e) => setFilter({ ...filter, resourceId: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="relation" value={filter.relation} onChange={(e) => setFilter({ ...filter, relation: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="subject type" value={filter.subjectType} onChange={(e) => setFilter({ ...filter, subjectType: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="subject id" value={filter.subjectId} onChange={(e) => setFilter({ ...filter, subjectId: e.target.value })} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Resource</TableHead>
                  <TableHead className="text-xs">Relation</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationshipsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground">加载中...</TableCell></TableRow>
                ) : activeRelationships.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground">暂无 relationship</TableCell></TableRow>
                ) : activeRelationships.map((rel, idx) => (
                  <TableRow key={`${rel.resource.type}:${rel.resource.id}:${rel.relation}:${rel.subject.type}:${rel.subject.id}:${idx}`}>
                    <TableCell className="text-xs font-mono">{rel.resource.type}:{rel.resource.id}</TableCell>
                    <TableCell className="text-xs font-mono">{rel.relation}</TableCell>
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
          <CardTitle className="text-sm">Effective Permissions</CardTitle>
          <CardDescription>批量检查 subject 在某资源上的权限集合。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Permissions CSV" value={checkForm.permissions} onChange={(v) => setCheckForm({ ...checkForm, permissions: v })} />
          <Button size="sm" variant="outline" onClick={handleEffective} disabled={effectivePermissions.isPending}>查询有效权限</Button>
          {effectivePermissions.data ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {Object.entries(effectivePermissions.data.permissions).map(([permission, result]) => (
                <div key={permission} className="rounded-md border p-2">
                  <div className="text-xs font-mono truncate">{permission}</div>
                  <Badge variant={result.allowed ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                    {result.allowed ? 'ALLOW' : 'DENY'}
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function DecisionCard({ title, data }: { title: string; data: { allowed: boolean; effect?: string; reason?: string; steps?: string[] } }) {
  return (
    <div className="rounded-md border p-2 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{title}</span>
        <Badge variant={data.allowed ? 'default' : 'secondary'}>{data.allowed ? 'ALLOW' : 'DENY'}</Badge>
      </div>
      {data.reason ? <div className="text-muted-foreground break-all">{data.reason}</div> : null}
      {data.steps?.length ? (
        <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
          {data.steps.map((step) => <li key={step} className="break-all font-mono">{step}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

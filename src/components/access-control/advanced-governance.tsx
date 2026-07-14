'use client';

import { useEffect, useState } from 'react';
import { Braces, Database, RefreshCw, ShieldAlert, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useIamAuthzRelationships,
  useIamAuthzSchema,
  useIamPublishAuthzSchema,
  useIamValidateAuthzSchema,
} from '@/hooks/use-authz';

export function AdvancedGovernance() {
  const schemaQuery = useIamAuthzSchema();
  const validateSchema = useIamValidateAuthzSchema();
  const publishSchema = useIamPublishAuthzSchema();
  const [schemaDraft, setSchemaDraft] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [relation, setRelation] = useState('');
  const relationshipsQuery = useIamAuthzRelationships({
    resourceType: resourceType || undefined,
    resourceId: resourceId || undefined,
    relation: relation || undefined,
  });

  useEffect(() => {
    if (schemaQuery.data?.text && !schemaDraft) setSchemaDraft(schemaQuery.data.text);
  }, [schemaDraft, schemaQuery.data?.text]);

  const validate = async () => {
    if (!schemaDraft.trim()) return toast.error('Schema 不能为空');
    try {
      await validateSchema.mutateAsync(schemaDraft);
      toast.success('Schema 校验通过');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Schema 校验失败');
    }
  };

  const publish = async () => {
    if (!window.confirm('发布 Schema 会影响整个授权图。确认已经评审并处于迁移窗口吗？')) return;
    try {
      await validateSchema.mutateAsync(schemaDraft);
      await publishSchema.mutateAsync(schemaDraft);
      toast.success('Schema 已发布');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Schema 发布失败');
    }
  };

  const relationships = relationshipsQuery.data?.relationships || [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">高级治理</h2>
        <p className="text-sm text-muted-foreground">Schema 和原始关系保留给平台治理与故障修复；日常角色和授权不需要进入这里。</p>
      </div>
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
        <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><div className="font-medium">这是技术操作区，不是另一个权限管理入口</div><p className="mt-1 text-sm leading-6 text-muted-foreground">角色库负责能力组合，访问分配负责绑定对象和范围，权限排查负责解释结果。只有这些抽象不足以处理问题时，才直接检查 SpiceDB。</p></div></div>
      </div>

      <Tabs defaultValue="schema">
        <TabsList><TabsTrigger value="schema"><Braces className="mr-1.5 h-4 w-4" />Schema</TabsTrigger><TabsTrigger value="relationships"><Database className="mr-1.5 h-4 w-4" />原始关系</TabsTrigger></TabsList>
        <TabsContent value="schema" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><CardTitle className="text-base">SpiceDB Schema</CardTitle><CardDescription>查看、校验和受控发布授权模型。发布前仍应经过代码评审与迁移窗口。</CardDescription></div>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => schemaQuery.refetch()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新</Button><Button size="sm" variant="outline" onClick={validate} disabled={validateSchema.isPending}>校验</Button><Button size="sm" onClick={publish} disabled={publishSchema.isPending}><UploadCloud className="mr-1.5 h-3.5 w-3.5" />发布</Button></div>
              </div>
            </CardHeader>
            <CardContent><Textarea aria-label="SpiceDB Schema" value={schemaDraft} onChange={(event) => setSchemaDraft(event.target.value)} className="min-h-[280px] sm:min-h-[440px] resize-y font-mono text-xs leading-5" placeholder="正在加载 Schema…" /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="relationships" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Relationship Explorer</CardTitle><CardDescription>按精确资源过滤原始 tuple，用于核对投影和继承边。日常授权请使用“访问分配”。</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Filter label="资源类型" value={resourceType} onChange={setResourceType} placeholder="例如 skill" />
                <Filter label="资源 ID" value={resourceId} onChange={setResourceId} placeholder="例如 skill-a" />
                <Filter label="Relation" value={relation} onChange={setRelation} placeholder="例如 custom_binding" />
              </div>
              <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">过滤条件为空时由后端应用默认查询边界。</div><Badge variant="secondary">{relationships.length} 条</Badge></div>
              {relationships.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">没有匹配的原始关系。</div>
              ) : (
                <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                  {relationships.map((item, index) => (
                    <div key={`${item.resource.type}:${item.resource.id}#${item.relation}@${item.subject.type}:${item.subject.id}:${index}`} className="rounded-lg border bg-muted/35 px-3 py-2 font-mono text-xs leading-5 break-all">
                      <span className="text-violet-600 dark:text-violet-400">{item.resource.type}:{item.resource.id}</span>
                      <span>#{item.relation}@</span>
                      <span className="text-cyan-700 dark:text-cyan-400">{item.subject.type}:{item.subject.id}{item.subject.relation ? `#${item.subject.relation}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Filter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

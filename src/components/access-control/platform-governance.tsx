'use client';

import { AlertTriangle, Braces, Database, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedGovernance } from './advanced-governance';

export function PlatformGovernance() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">平台治理</h2>
        <p className="text-sm text-muted-foreground">授权模型管理、原始关系查看、投影状态监控和漂移检测。仅平台管理员可见。</p>
      </div>

      {/* Warning Banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-amber-700 dark:text-amber-300">技术操作区</span>
            <br />
            这里不是另一个权限管理入口。Schema 发布会影响整个授权图，请确保变更经过审核。普通权限管理请使用"资源与访问"下的功能。
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schema">
        <TabsList>
          <TabsTrigger value="schema">
            <Braces className="mr-1.5 h-3.5 w-3.5" />
            授权模型
          </TabsTrigger>
          <TabsTrigger value="relationships">
            <Database className="mr-1.5 h-3.5 w-3.5" />
            原始关系
          </TabsTrigger>
          <TabsTrigger value="projection">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            投影状态
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-4">
          <AdvancedGovernance />
        </TabsContent>

        <TabsContent value="relationships" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationship Explorer</CardTitle>
              <CardDescription>查看和管理 SpiceDB 中的原始关系数据。</CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedGovernance />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projection" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                投影状态
              </CardTitle>
              <CardDescription>监控授权模型投影的同步状态。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                投影状态监控功能即将上线。
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
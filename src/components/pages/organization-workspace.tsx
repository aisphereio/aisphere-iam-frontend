'use client';

import type { ReactNode } from 'react';
import { Building2, Settings2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function OrganizationWorkspaceTabs({
  overview,
  members,
  settings,
  memberCount,
  childCount,
}: {
  overview: ReactNode;
  members: ReactNode;
  settings: ReactNode;
  memberCount: number;
  childCount: number;
}) {
  return (
    <Tabs defaultValue="overview" className="gap-5">
      <TabsList aria-label="组织管理视图" className="h-10 w-full justify-start overflow-x-auto rounded-xl bg-muted/70 p-1 sm:w-fit">
        <TabsTrigger value="overview" className="min-w-24 rounded-lg px-3 text-xs">
          <Building2 className="h-3.5 w-3.5" />
          概览
          <Badge variant="secondary" className="h-4 min-w-4 rounded-full px-1 text-[9px]">{childCount}</Badge>
        </TabsTrigger>
        <TabsTrigger value="members" className="min-w-24 rounded-lg px-3 text-xs">
          <Users className="h-3.5 w-3.5" />
          成员
          <Badge variant="secondary" className="h-4 min-w-4 rounded-full px-1 text-[9px]">{memberCount}</Badge>
        </TabsTrigger>
        <TabsTrigger value="settings" className="min-w-24 rounded-lg px-3 text-xs">
          <Settings2 className="h-3.5 w-3.5" />
          组织设置
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-0">{overview}</TabsContent>
      <TabsContent value="members" className="mt-0">{members}</TabsContent>
      <TabsContent value="settings" className="mt-0">{settings}</TabsContent>
    </Tabs>
  );
}

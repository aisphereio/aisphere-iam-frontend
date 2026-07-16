'use client';

import { useEffect, useState } from 'react';
import { Building2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIamDirectoryGroups, useIamResourceAccess, useIamSubjectEntitlements } from '@/hooks/use-iam';
import { EntitlementList } from './entitlement-list';
import { GroupPermissionPanel } from './group-permission-panel';
import { ObjectSearch, type PermissionInsightObject } from './object-search';
import { RelationshipDetails } from './relationship-details';

function SelectedObjectHeader({ selected }: { selected: PermissionInsightObject }) {
  const icon = {
    user: <Users className="h-4 w-4" />,
    group: <Building2 className="h-4 w-4" />,
    resource: <DatabaseIcon />,
  }[selected.kind];

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      {icon}
      <div>
        <div className="text-sm font-medium">{selected.label}</div>
        <div className="text-xs text-muted-foreground">
          {selected.subtitle || selected.id}
        </div>
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 5.33 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 5.33 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function UserView({ identityOrg, selected }: { identityOrg: string; selected: PermissionInsightObject & { kind: 'user' } }) {
  const { data: subjectEntitlements, isLoading: loadingEntitlements, error: entitlementsError } = useIamSubjectEntitlements(
    identityOrg,
    { type: 'user', id: selected.id },
  );
  const { data: groupsData } = useIamDirectoryGroups(identityOrg, { userId: selected.id });

  return (
    <Tabs defaultValue="entitlements" className="mt-4">
      <TabsList className="h-9 w-full justify-start overflow-x-auto rounded-lg bg-muted/70 p-1">
        <TabsTrigger value="entitlements" className="rounded-md px-3 text-xs">有效权限</TabsTrigger>
        <TabsTrigger value="groups" className="rounded-md px-3 text-xs">所属组织</TabsTrigger>
        <TabsTrigger value="relationships" className="rounded-md px-3 text-xs">技术关系</TabsTrigger>
      </TabsList>

      <TabsContent value="entitlements" className="mt-3">
        {entitlementsError ? (
          <p className="text-sm text-destructive">{(entitlementsError as Error).message}</p>
        ) : loadingEntitlements ? (
          <p className="py-4 text-center text-sm text-muted-foreground">正在加载权限数据...</p>
        ) : (
          <EntitlementList
            entitlements={subjectEntitlements?.entitlements || []}
            emptyText="当前人员没有有效资源权限。"
          />
        )}
      </TabsContent>

      <TabsContent value="groups" className="mt-3">
        {groupsData?.groups?.length ? (
          <div className="flex flex-wrap gap-2">
            {groupsData.groups.map((g) => (
              <div key={g.id} className="rounded-md border bg-card px-3 py-1.5 text-sm">
                {g.displayName || g.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">该人员不属于任何组织。</p>
        )}
      </TabsContent>

      <TabsContent value="relationships" className="mt-3">
        <RelationshipDetails mode="subject" subjectType="user" subjectId={selected.id} />
      </TabsContent>
    </Tabs>
  );
}

function ResourceView({ identityOrg, selected }: { identityOrg: string; selected: PermissionInsightObject & { kind: 'resource' } }) {
  const { data: resourceAccess, isLoading, error: accessError } = useIamResourceAccess(
    identityOrg,
    { type: selected.resourceType, id: selected.id },
  );

  const entitlements = resourceAccess?.entitlements || [];
  const directGrants = entitlements.filter((e) => e.sourceType === 'DIRECT_GRANT');
  const inheritedGrants = entitlements.filter((e) => e.sourceType !== 'DIRECT_GRANT');

  return (
    <Tabs defaultValue="all" className="mt-4">
      <TabsList className="h-9 w-full justify-start overflow-x-auto rounded-xl bg-muted/70 p-1">
        <TabsTrigger value="all" className="rounded-md px-3 text-xs">有权限的人和组织</TabsTrigger>
        <TabsTrigger value="direct" className="rounded-md px-3 text-xs">直接授权</TabsTrigger>
        <TabsTrigger value="inherited" className="rounded-md px-3 text-xs">继承权限</TabsTrigger>
        <TabsTrigger value="relationships" className="rounded-md px-3 text-xs">技术关系</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-3">
        {accessError ? (
          <p className="text-sm text-destructive">{(accessError as Error).message}</p>
        ) : isLoading ? (
          <p className="text-center text-sm text-muted-foreground">正在加载权限数据...</p>
        ) : (
          <EntitlementList
            entitlements={entitlements}
            emptyText="当前资源没有有效授权。"
            showSubject
          />
        )}
      </TabsContent>

      <TabsContent value="direct" className="mt-3">
        <EntitlementList
          entitlements={directGrants}
          emptyText="当前资源没有直接授权。"
          showSubject
        />
      </TabsContent>

      <TabsContent value="inherited" className="mt-3">
        <EntitlementList
          entitlements={inheritedGrants}
          emptyText="当前资源没有继承权限。"
          showSubject
        />
      </TabsContent>

      <TabsContent value="relationships" className="mt-3">
        <RelationshipDetails mode="resource" resourceType={selected.resourceType} resourceId={selected.id} />
      </TabsContent>
    </Tabs>
  );
}

export function PermissionInsightPage({ identityOrg }: { identityOrg: string }) {
  const [selected, setSelected] = useState<PermissionInsightObject | null>(null);

  // Read URL params for pre-selection (e.g. from groups-page "查看权限" button)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const subjectType = params.get('subject_type');
    const subjectId = params.get('subject_id');
    if (subjectType === 'user' && subjectId) {
      setSelected({ kind: 'user', id: subjectId, label: subjectId });
    }
  }, []);

  return (
    <section className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold">权限视图</h2>
        <p className="text-sm text-muted-foreground">
          搜索人员、组织或资源，查看当前有效权限、来源路径和技术关系。
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ObjectSearch identityOrg={identityOrg} onSelect={setSelected} />

          {selected ? (
            <div className="mt-4 space-y-3">
              <SelectedObjectHeader selected={selected} />
              {selected.kind === 'user' && (
                <UserView identityOrg={identityOrg} selected={selected} />
              )}
              {selected.kind === 'group' && (
                <GroupPermissionPanel
                  identityOrg={identityOrg}
                  groupId={selected.id}
                  groupLabel={selected.label}
                />
              )}
              {selected.kind === 'resource' && (
                <ResourceView identityOrg={identityOrg} selected={selected} />
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              在左侧搜索并选择对象后，这里会展示权限结果。
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
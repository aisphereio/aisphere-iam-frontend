'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIamExternalUsers, useIamResourceAccess, useIamSubjectEntitlements } from '@/hooks/use-iam';
import { EntitlementList } from './entitlement-list';
import { RelationshipDetails } from './relationship-details';

interface GroupPermissionPanelProps {
  identityOrg: string;
  groupId: string;
  groupLabel: string;
}

export function GroupPermissionPanel({
  identityOrg,
  groupId,
  groupLabel,
}: GroupPermissionPanelProps) {
  const { data: subjectEntitlements, isLoading: loadingSubject, error: subjectError } = useIamSubjectEntitlements(
    identityOrg,
    { type: 'group', id: groupId },
  );

  const { data: resourceAccess, isLoading: loadingResource, error: resourceError } = useIamResourceAccess(
    identityOrg,
    { type: 'group', id: groupId },
  );

  const { data: membersData } = useIamExternalUsers(identityOrg, { groupId, pageSize: 500 });

  return (
    <Tabs defaultValue="as-subject" className="mt-4">
      <TabsList className="h-9 w-full justify-start overflow-x-auto rounded-xl bg-muted/70 p-1">
        <TabsTrigger value="as-subject" className="rounded-md px-3 text-xs">
          组织作为权限主体
        </TabsTrigger>
        <TabsTrigger value="as-resource" className="rounded-md px-3 text-xs">
          组织作为可管理资源
        </TabsTrigger>
        <TabsTrigger value="members" className="rounded-md px-3 text-xs">
          成员影响
        </TabsTrigger>
        <TabsTrigger value="relationships" className="rounded-md px-3 text-xs">
          技术关系
        </TabsTrigger>
      </TabsList>

      <TabsContent value="as-subject" className="mt-3">
        {subjectError ? (
          <p className="text-sm text-destructive">{(subjectError as Error).message}</p>
        ) : loadingSubject ? (
          <p className="py-4 text-center text-sm text-muted-foreground">正在加载权限数据...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              组织 <strong>{groupLabel}</strong> 在以下资源上拥有权限，成员会继承这些授权。
            </p>
            <EntitlementList
              entitlements={subjectEntitlements?.entitlements || []}
              emptyText="该组织没有资源权限。"
            />
          </div>
        )}
      </TabsContent>

      <TabsContent value="as-resource" className="mt-3">
        {resourceError ? (
          <p className="text-sm text-destructive">{(resourceError as Error).message}</p>
        ) : loadingResource ? (
          <p className="py-4 text-center text-sm text-muted-foreground">正在加载权限数据...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              以下人员或组织可以管理组织 <strong>{groupLabel}</strong>、管理成员或管理权限。
            </p>
            <EntitlementList
              entitlements={resourceAccess?.entitlements || []}
              emptyText="没有找到可管理该组织的主体。"
              showSubject
            />
          </div>
        )}
      </TabsContent>

      <TabsContent value="members" className="mt-3">
        {membersData?.users?.length ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              成员会继承"组织作为权限主体"中的 group 授权。
            </p>
            <div className="flex flex-wrap gap-2">
              {membersData.users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-md border bg-card px-3 py-1.5 text-sm"
                >
                  {u.displayName || u.username}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            该组织没有成员。
          </p>
        )}
      </TabsContent>

      <TabsContent value="relationships" className="mt-3">
        <RelationshipDetails mode="group" groupId={groupId} />
      </TabsContent>
    </Tabs>
  );
}
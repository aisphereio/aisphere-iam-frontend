'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { GrantEditor } from '@/components/access-control/grant-editor';
import { AdvancedGovernance } from '@/components/access-control/advanced-governance';
import { PermissionDiagnosis } from '@/components/access-control/permission-diagnosis';
import { PlatformGovernance } from '@/components/access-control/platform-governance';
import { ResourcePermissions } from '@/components/access-control/resource-permissions';
import { UserPermissions } from '@/components/access-control/user-permissions';
import { RoleLibrary } from '@/components/access-control/role-library';
import { IamPage } from '@/components/pages/iam-page';
import { ExternalUsersPage } from '@/components/pages/users-page';
import { GroupsPage } from '@/components/pages/groups-page';
import type { Tab } from '@/lib/api/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageRouter({ tab, identityOrg, onTabChange }: { tab: Tab; identityOrg: string; onTabChange: (tab: Tab) => void }) {
  if (tab === 'users') return <ExternalUsersPage identityOrg={identityOrg} />;
  if (tab === 'groups') return <GroupsPage identityOrg={identityOrg} />;
  if (tab === 'permissions' || tab === 'grants') return <GrantEditor identityOrg={identityOrg} />;
  if (tab === 'roles') return <RoleLibrary onAssign={() => onTabChange('grants')} />;
  if (tab === 'permission-diagnosis') return <PermissionDiagnosis identityOrg={identityOrg} />;
  if (tab === 'permissions-center') return <AdvancedGovernance />;
  if (tab === 'platform-governance') return <PlatformGovernance />;
  if (tab === 'resource-permissions') return <ResourcePermissions identityOrg={identityOrg} onNavigate={(t) => onTabChange(t as Tab)} />;
  if (tab === 'user-permissions') return <UserPermissions identityOrg={identityOrg} />;
  return <IamPage tab={tab} />;
}

export default function IamConsole() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        {(tab, identityOrg, setTab) => <PageRouter tab={tab} identityOrg={identityOrg} onTabChange={setTab} />}
      </AppShell>
    </QueryClientProvider>
  );
}
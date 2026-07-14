'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { AccessControlPage } from '@/components/access-control/access-control-page';
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

function PageRouter({ tab, identityOrg }: { tab: Tab; identityOrg: string }) {
  if (tab === 'users') return <ExternalUsersPage identityOrg={identityOrg} />;
  if (tab === 'groups') return <GroupsPage identityOrg={identityOrg} />;
  if (tab === 'permissions') return <AccessControlPage identityOrg={identityOrg} />;
  if (tab === 'grants') return <AccessControlPage identityOrg={identityOrg} initialView="assignments" />;
  if (tab === 'permissions-center') return <AccessControlPage identityOrg={identityOrg} initialView="advanced" />;
  return <IamPage tab={tab} />;
}

export default function IamConsole() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        {(tab, identityOrg) => <PageRouter tab={tab} identityOrg={identityOrg} />}
      </AppShell>
    </QueryClientProvider>
  );
}

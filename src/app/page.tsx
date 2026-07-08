'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
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

function PageRouter({ tab }: { tab: Tab }) {
  if (tab === 'users') return <ExternalUsersPage />;
  if (tab === 'groups') return <GroupsPage />;
  return <IamPage tab={tab} />;
}

export default function IamConsole() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        {(tab) => <PageRouter tab={tab} />}
      </AppShell>
    </QueryClientProvider>
  );
}

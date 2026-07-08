'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { useMe, useLogout } from '@/hooks/use-auth';
import type { Tab } from '@/lib/api/types';
import { LoginPage } from './login-page';

interface AppShellProps {
  children: (tab: Tab) => React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // In Gateway-only OIDC mode, the Envoy Gateway handles authentication.
  // If the user is not authenticated, the Gateway redirects to Casdoor
  // before the request reaches the frontend. So we always assume the user
  // is authenticated when the page loads.
  const { data: principal, error: principalError } = useMe();
  const logout = useLogout();

  if (principalError) {
    return (
      <TooltipProvider>
        <LoginPage />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar
          activeTab={tab}
          onTabChange={setTab}
          collapsed={!sidebarOpen}
          onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
          principal={principal || null}
          onLogout={logout}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            activeTab={tab}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />

          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {children(tab)}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r flex flex-col"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2 }}
            >
              <Sidebar
                activeTab={tab}
                onTabChange={(t) => { setTab(t); setMobileSidebarOpen(false); }}
                collapsed={false}
                onToggleCollapse={() => {}}
                principal={principal || null}
                onLogout={logout}
              />
            </motion.div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

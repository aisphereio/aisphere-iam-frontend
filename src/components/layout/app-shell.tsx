'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { getToken, onAuthEvent } from '@/lib/api/client';
import { useMe, useLogout } from '@/hooks/use-auth';
import { LoginPage } from '@/components/auth/login-page';
import type { Tab } from '@/lib/api/types';

interface AppShellProps {
  children: (tab: Tab) => React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Defer auth check to client to avoid SSR/CSR hydration mismatch.
  useEffect(() => {
    queueMicrotask(() => setAuthed(Boolean(getToken())));
  }, []);

  // useMe is enabled only when authed so the principal is fetched lazily after login.
  const { data: principal } = useMe();
  const logout = useLogout();

  // Listen for forced-logout events (401, refresh failure) so the UI flips back to LoginPage.
  useEffect(() => {
    if (!authed) return;
    const off = onAuthEvent((reason) => {
      if (reason === 'expired' || reason === 'logout') {
        setAuthed(false);
      }
    });
    return off;
  }, [authed]);

  // Re-check token presence on focus / storage events so multiple tabs stay in sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      const hasToken = Boolean(getToken());
      setAuthed((cur) => (cur !== hasToken ? hasToken : cur));
    };
    window.addEventListener('storage', check);
    window.addEventListener('focus', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthed(false);
    await logout();
  }, [logout]);

  if (authed === null) {
    return <div className="flex items-center justify-center min-h-screen bg-background" />;
  }

  if (!authed) {
    return <LoginPage />;
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
          onLogout={handleLogout}
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
                onLogout={handleLogout}
              />
            </motion.div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
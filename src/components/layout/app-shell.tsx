'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { useMe, useLogout } from '@/hooks/use-auth';
import type { Tab } from '@/lib/api/types';
import { LoginPage } from './login-page';
import {
  clearGatewayLoginStarted,
  clearGatewaySessionConfirmed,
  consumeGatewayAuthReturn,
  markGatewaySessionConfirmed,
  shouldProbePrincipal,
} from '@/lib/api/client';

interface AppShellProps {
  children: (tab: Tab, identityOrg: string) => React.ReactNode;
}

const LOGIN_CONFIRM_WINDOW_MS = 30_000;

function isRecentLoginAttempt(startedAt: number | null): startedAt is number {
  return startedAt !== null && Date.now() - startedAt < LOGIN_CONFIRM_WINDOW_MS;
}

const IDENTITY_ORG_KEY = 'aisphere_iam_identity_org';

function loadIdentityOrg(): string {
  if (typeof window === 'undefined') return 'aisphere';
  try {
    return window.localStorage.getItem(IDENTITY_ORG_KEY) || 'aisphere';
  } catch {
    return 'aisphere';
  }
}

function saveIdentityOrg(org: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IDENTITY_ORG_KEY, org);
  } catch {
    // Ignore unavailable storage.
  }
}

export function AppShell({ children }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [identityOrg, setIdentityOrg] = useState(loadIdentityOrg);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginStartedAt, setLoginStartedAt] = useState<number | null>(null);
  const [loginConfirmExpired, setLoginConfirmExpired] = useState(false);
  const [canProbePrincipal, setCanProbePrincipal] = useState(false);

  // In local cross-origin Gateway development, probing /me before explicit
  // login triggers Envoy OIDC redirects inside XHR. Only render protected
  // console content after /me confirms the Gateway session.
  const { data: principal, error: principalError } = useMe(canProbePrincipal);
  const logout = useLogout();

  useEffect(() => {
    const returnedAt = consumeGatewayAuthReturn();

    if (isRecentLoginAttempt(returnedAt)) {
      setLoginStartedAt(returnedAt);
      setCanProbePrincipal(true);
      return;
    }

    clearGatewayLoginStarted();
    setCanProbePrincipal(shouldProbePrincipal());
  }, []);

  useEffect(() => {
    if (!principal) return;
    markGatewaySessionConfirmed();
    clearGatewayLoginStarted();
    setLoginStartedAt(null);
    setLoginConfirmExpired(false);
  }, [principal]);

  useEffect(() => {
    if (!loginStartedAt || !principalError || loginConfirmExpired) return;
    clearGatewayLoginStarted();
    clearGatewaySessionConfirmed();
    setLoginConfirmExpired(true);
    setLoginStartedAt(null);
  }, [loginConfirmExpired, loginStartedAt, principalError]);

  useEffect(() => {
    if (!principalError || loginStartedAt) return;
    clearGatewaySessionConfirmed();
  }, [loginStartedAt, principalError]);

  if (!canProbePrincipal) {
    return (
      <TooltipProvider>
        <LoginPage />
      </TooltipProvider>
    );
  }

  if (loginStartedAt && !principal && !principalError && !loginConfirmExpired) {
    return (
      <TooltipProvider>
        <LoginPage state="checking" />
      </TooltipProvider>
    );
  }

  if (!principal && !principalError) {
    return (
      <TooltipProvider>
        <LoginPage state="checking" />
      </TooltipProvider>
    );
  }

  if (principalError) {
    return (
      <TooltipProvider>
        <LoginPage state={loginConfirmExpired ? 'error' : 'idle'} />
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
            identityOrg={identityOrg}
            onIdentityOrgChange={(org) => {
              setIdentityOrg(org);
              saveIdentityOrg(org);
            }}
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
                {children(tab, identityOrg)}
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

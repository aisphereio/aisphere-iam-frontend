'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Fingerprint, Shield, ExternalLink, MapPin, Users } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { useMe, useLogout } from '@/hooks/use-auth';
import type { Tab } from '@/lib/api/types';
import { LoginPage } from './login-page';
import { buildGatewayLoginUrl } from '@/lib/api/client';

interface AppShellProps {
  children: (tab: Tab, identityOrg: string, setTab: (tab: Tab) => void) => React.ReactNode;
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

const validTabs: Tab[] = ['users', 'groups', 'projects', 'grants', 'roles', 'resources', 'permission-diagnosis', 'permissions-center', 'capabilities', 'resource-permissions', 'user-permissions', 'platform-governance'];

function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'resource-permissions';
  try {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as Tab;
    if (t && validTabs.includes(t)) return t;
  } catch {
    // ignore
  }
  return 'resource-permissions';
}

export function AppShell({ children }: AppShellProps) {
  const [tab, setTabState] = useState<Tab>(getInitialTab);
  const setTab = useCallback((newTab: Tab) => {
    setTabState(newTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [identityOrg, setIdentityOrg] = useState(loadIdentityOrg);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // In production (same-origin), /me can be probed immediately.
  // In local cross-origin development, only probe after the user has logged in.
  const { data: principal, error: principalError, isLoading } = useMe(true);
  const logout = useLogout();

  // Loading state
  if (isLoading && !principal && !principalError) {
    return (
      <TooltipProvider>
        <LoginPage state="checking" />
      </TooltipProvider>
    );
  }

  // Not authenticated — show login page
  if (!principal || principalError) {
    return (
      <TooltipProvider>
        <LoginPage
          state="idle"
          onLogin={() => { window.location.assign(buildGatewayLoginUrl()); }}
        />
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
          onOpenProfile={() => setProfileOpen(true)}
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

          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {children(tab, identityOrg, setTab)}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-72 max-w-[86vw] bg-sidebar border-r flex flex-col [&>aside]:!flex [&>aside]:!w-full"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.2 }}
            >
              <Sidebar
                activeTab={tab}
                onTabChange={(t) => { setTab(t); setMobileSidebarOpen(false); }}
                collapsed={false}
                onToggleCollapse={() => setMobileSidebarOpen(false)}
                principal={principal || null}
                onLogout={logout}
                onOpenProfile={() => { setProfileOpen(true); setMobileSidebarOpen(false); }}
              />
            </motion.div>
          </div>
        )}
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              当前用户
            </DialogTitle>
            <DialogDescription>
              已通过 Gateway OIDC 认证的身份信息。
            </DialogDescription>
          </DialogHeader>

          {principal ? (
            <div className="space-y-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-border">
                  {principal.avatar || principal.picture ? (
                    <img src={(principal.avatar || principal.picture) as string} alt={(principal.displayName || principal.name || principal.username) as string} className="h-full w-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-sm font-bold text-violet-600 dark:text-violet-400">
                    {((principal.displayName || principal.name || principal.username || 'U') as string).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{(principal.displayName || principal.name || principal.username) as string}</div>
                  <div className="text-xs text-muted-foreground font-mono">@{(principal.username || principal.subjectId) as string}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '用户 ID', value: principal.subjectId, icon: Fingerprint },
                  { label: '邮箱', value: principal.email, icon: Mail },
                  { label: '电话', value: principal.phone, icon: Phone },
                  { label: '组织', value: principal.orgId, icon: MapPin },
                  { label: '身份源', value: principal.issuer, icon: ExternalLink },
                  { label: '认证方式', value: principal.authMethod, icon: Shield },
                ].filter((item) => item.value).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {item.label}
                      </div>
                      <div className="text-xs font-medium truncate" title={String(item.value)}>
                        {String(item.value)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(principal.roles as string[] | undefined)?.length ? (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground">角色</div>
                  <div className="flex flex-wrap gap-1">
                    {(principal.roles as string[]).map((role: string) => (
                      <Badge key={role} variant="secondary" className="text-[10px]">{role}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">未获取到用户信息</div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Database,
  Folder,
  GitBranch,
  Key,
  Layers3,
  LogOut,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { Tab } from '@/lib/api/types';

type NavItem = { key: Tab; labelKey: string; hintKey: string; icon: React.ReactNode };
type NavSection = { titleKey: string; icon: React.ReactNode; items: NavItem[] };

const navSections: NavSection[] = [
  {
    titleKey: 'nav.section.identity',
    icon: <Users className="h-3.5 w-3.5" />,
    items: [
      { key: 'users', labelKey: 'nav.users', hintKey: 'nav.users.hint', icon: <Users className="h-4 w-4" /> },
      { key: 'groups', labelKey: 'nav.groups', hintKey: 'nav.groups.hint', icon: <GitBranch className="h-4 w-4" /> },
    ],
  },
  {
    titleKey: 'nav.section.resource',
    icon: <Layers3 className="h-3.5 w-3.5" />,
    items: [
      { key: 'projects', labelKey: 'nav.projects', hintKey: 'nav.projects.hint', icon: <Folder className="h-4 w-4" /> },
      { key: 'resources', labelKey: 'nav.resources', hintKey: 'nav.resources.hint', icon: <Database className="h-4 w-4" /> },
    ],
  },
  {
    titleKey: 'nav.section.access',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    items: [
      { key: 'grants', labelKey: 'nav.grants', hintKey: 'nav.grants.hint', icon: <Key className="h-4 w-4" /> },
      { key: 'permissions', labelKey: 'nav.permissions', hintKey: 'nav.permissions.hint', icon: <ShieldCheck className="h-4 w-4" /> },
    ],
  },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  principal: Record<string, unknown> | null;
  onLogout: () => void | Promise<void>;
  onOpenProfile?: () => void;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getRoleLabel(principal: Record<string, unknown> | null, t?: (key: string) => string): string {
  const roles = (principal?.roles as string[]) || [];
  if (roles.includes('admin') || roles.includes('role:admin')) return 'admin';
  if (roles.length > 0) return roles[0];
  return t ? t('common.member') : 'member';
}

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  principal,
  onLogout,
  onOpenProfile,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const username = (principal?.subjectId || principal?.username || 'user') as string;
  const displayName = (principal?.displayName || principal?.name || username) as string;
  const avatar = (principal?.avatar || principal?.picture) as string | undefined;
  const initials = getInitials(displayName || username);
  const role = getRoleLabel(principal, t);

  return (
    <motion.aside
      className="hidden md:flex flex-col border-r bg-sidebar h-full shrink-0"
      animate={{ width: collapsed ? 56 : 268 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 h-12 border-b shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shrink-0 shadow-sm shadow-violet-500/30">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <div className="font-semibold text-sm tracking-tight leading-tight">{t('app.name')}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{t('app.subtitle')}</div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2 scrollbar-thin">
        <nav className="flex flex-col gap-2 px-2">
          {navSections.map((section) => {
            const sectionActive = section.items.some((item) => item.key === activeTab);
            return (
              <div key={section.titleKey} className={cn('rounded-lg', !collapsed && sectionActive && 'bg-muted/40 py-1')}>
                {!collapsed ? (
                  <div className="mb-0.5 flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                    <span className={cn(sectionActive && 'text-violet-600 dark:text-violet-400')}>{section.icon}</span>
                    <span className="truncate">{t(section.titleKey)}</span>
                    <ChevronDown className="ml-auto h-3 w-3 opacity-50" />
                  </div>
                ) : null}

                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive = activeTab === item.key;
                    return (
                      <Tooltip key={item.key} delayDuration={collapsed ? 0 : 999}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onTabChange(item.key)}
                            className={cn(
                              'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-150 w-full text-left group',
                              !collapsed && 'ml-1 w-[calc(100%-0.25rem)]',
                              isActive
                                ? 'text-foreground font-medium bg-accent shadow-sm'
                                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-indicator"
                                className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              />
                            )}
                            <span className={cn('shrink-0', isActive && 'text-violet-600 dark:text-violet-400')}>
                              {item.icon}
                            </span>
                            {!collapsed && (
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px]">{t(item.labelKey)}</div>
                                {isActive ? <div className="truncate text-[10px] font-normal text-muted-foreground">{t(item.hintKey)}</div> : null}
                              </div>
                            )}
                          </button>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right" className="flex flex-col gap-0.5">
                            <p className="font-medium">{t(item.labelKey)}</p>
                            <p className="text-xs text-muted-foreground">{t(item.hintKey)}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Status footer */}
      {!collapsed && (
        <div className="px-3 pb-1.5">
          <div className="rounded-md border bg-card/50 px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse-soft shrink-0" />
            <span className="text-[10px] text-muted-foreground">{t('app.systemOk')}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">{t('app.version')}</span>
          </div>
        </div>
      )}

      {/* User profile section */}
      <div className="border-t px-2 py-2">
        <div className="flex items-center gap-2 px-1.5 py-1">
          <button
            onClick={onOpenProfile}
            className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 rounded-full"
            title={t('user.openProfile')}
          >
            <Avatar className="h-7 w-7 ring-1 ring-border">
              {avatar ? (
                <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          {!collapsed && (
            <button
              onClick={onOpenProfile}
              className="flex-1 min-w-0 text-left rounded-sm hover:bg-accent/60 px-1 py-0.5 transition-colors"
            >
              <div className="text-xs font-medium truncate">{displayName}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 capitalize">{role}</Badge>
                <span className="text-[10px] text-muted-foreground/70 truncate font-mono">@{username}</span>
              </div>
            </button>
          )}
          {!collapsed && (
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onLogout}
                title={t('user.logout')}
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {collapsed && (
          <div className="flex items-center justify-center mt-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={onLogout}
                >
                  <LogOut className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('user.logout')}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center h-8 border-t text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <span className={cn('transition-transform', collapsed ? 'rotate-180' : '')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
    </motion.aside>
  );
}

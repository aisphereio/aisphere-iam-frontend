'use client';

import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useT } from '@/lib/i18n';
import { LanguageToggle } from './language-toggle';
import type { Tab } from '@/lib/api/types';

interface TopbarProps {
  activeTab: Tab;
  onMenuClick: () => void;
}

const tabLabels: Record<Tab, string> = {
  users: 'nav.users',
  groups: 'nav.groups',
  organizations: 'nav.organizations',
  projects: 'nav.projects',
  grants: 'nav.grants',
  resources: 'nav.resources',
  permissions: '权限控制台',
};

export function Topbar({ activeTab, onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const t = useT();

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b bg-background shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium text-foreground">
          {t(tabLabels[activeTab] || '')}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <LanguageToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

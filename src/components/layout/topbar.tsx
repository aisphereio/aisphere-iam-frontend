'use client';

import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { useT } from '@/lib/i18n';
import { LanguageToggle } from './language-toggle';
import type { Tab } from '@/lib/api/types';

interface TopbarProps {
  activeTab: Tab;
  onMenuClick: () => void;
  identityOrg: string;
  onIdentityOrgChange: (org: string) => void;
}

const tabLabels: Record<string, string> = {
  users: '身份目录',
  groups: '多级用户组',
  organizations: '多级用户组',
  projects: 'nav.projects',
  grants: 'nav.grants',
  resources: 'nav.resources',
  permissions: '访问权限',
};

const identityTabs = new Set(['users', 'groups', 'permissions']);

const identityOrgs = [
  { value: 'aisphere', label: 'aisphere' },
];

const defaultIdentityOrg = 'aisphere';

export function Topbar({ activeTab, onMenuClick, identityOrg, onIdentityOrgChange }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useT();
  const isDark = mounted && theme === 'dark';

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

      <div className="flex items-center gap-2">
        {identityTabs.has(activeTab) ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Casdoor 组织</span>
            <Select value={identityOrg || defaultIdentityOrg} onValueChange={onIdentityOrgChange}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {identityOrgs.map((org) => (
                  <SelectItem key={org.value} value={org.value}>{org.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <LanguageToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

'use client';

import { Search, Users, Building2, Database } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIamDirectoryGroups, useIamExternalUsers, useIamResources } from '@/hooks/use-iam';

export type PermissionInsightObject =
  | { kind: 'user'; id: string; label: string; subtitle?: string }
  | { kind: 'group'; id: string; label: string; subtitle?: string }
  | { kind: 'resource'; resourceType: string; id: string; label: string; subtitle?: string };

interface ObjectSearchProps {
  identityOrg: string;
  onSelect: (obj: PermissionInsightObject) => void;
}

export function ObjectSearch({ identityOrg, onSelect }: ObjectSearchProps) {
  const [query, setQuery] = useState('');

  const { data: usersData } = useIamExternalUsers(identityOrg, { pageSize: 500 });
  const { data: groupsData } = useIamDirectoryGroups(identityOrg);
  const { data: resourcesData } = useIamResources(identityOrg);

  const q = query.toLowerCase().trim();

  const users: PermissionInsightObject[] = (usersData?.users || [])
    .filter(
      (u) =>
        !q ||
        (u.id || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    )
    .map((u) => ({
      kind: 'user' as const,
      id: u.id || '',
      label: u.displayName || u.username || u.id || '',
      subtitle: u.email || u.id || undefined,
    }));

  const groups: PermissionInsightObject[] = (groupsData?.groups || [])
    .filter(
      (g) =>
        !q ||
        (g.id || '').toLowerCase().includes(q) ||
        (g.name || '').toLowerCase().includes(q) ||
        (g.displayName || '').toLowerCase().includes(q),
    )
    .map((g) => ({
      kind: 'group' as const,
      id: g.id || '',
      label: g.displayName || g.name || g.id || '',
      subtitle: g.path || g.id || undefined,
    }));

  const resources: PermissionInsightObject[] = (resourcesData?.resources || [])
    .filter(
      (r) =>
        !q ||
        ((r.ref && r.ref.id) || '').toLowerCase().includes(q) ||
        ((r.ref && r.ref.type) || '').toLowerCase().includes(q) ||
        (r.displayName || '').toLowerCase().includes(q),
    )
    .map((r) => ({
      kind: 'resource' as const,
      resourceType: (r.ref && r.ref.type) || 'unknown',
      id: (r.ref && r.ref.id) || '',
      label: r.displayName || (r.ref && r.ref.id) || '',
      subtitle: (r.ref && r.ref.type) || undefined,
    }));

  const hasResults = users.length > 0 || groups.length > 0 || resources.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="搜索人员、组织或资源"
          aria-label="搜索人员、组织或资源"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query && !hasResults && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          未找到匹配的结果
        </p>
      )}

      <ScrollArea className="max-h-[400px]">
        {users.length > 0 && (
          <div className="space-y-1">
            <p className="px-1 text-[11px] font-medium uppercase text-muted-foreground">
              人员
            </p>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => onSelect(u)}
              >
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{u.label}</span>
                {u.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">
                    {u.subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-1">
            <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">
              组织
            </p>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => onSelect(g)}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{g.label}</span>
                {g.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">
                    {g.subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {resources.length > 0 && (
          <div className="space-y-1">
            <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">
              资源
            </p>
            {resources.map((r) => (
              <button
                key={`resource:${r.id}`}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => onSelect(r)}
              >
                <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{r.label}</span>
                {r.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">
                    {r.subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
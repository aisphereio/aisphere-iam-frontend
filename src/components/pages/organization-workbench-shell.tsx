'use client';

import type { ReactNode } from 'react';
import { ChevronRight, Network, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OrganizationPathItem } from './organization-workbench-model';

export function OrganizationWorkbenchShell({
  path,
  organizationCount,
  memberCount,
  refreshing = false,
  onSelectPath,
  onCreate,
  onRefresh,
  navigator,
  children,
}: {
  path: OrganizationPathItem[];
  organizationCount: number;
  memberCount: number;
  refreshing?: boolean;
  onSelectPath: (item: OrganizationPathItem) => void;
  onCreate: () => void;
  onRefresh: () => void;
  navigator: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border bg-card px-5 py-5 shadow-sm sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-cyan-500" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              <Network className="h-3.5 w-3.5" />
              Identity directory
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">组织工作台</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                在同一张组织结构中定位团队、管理成员，并调整上下级关系。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full px-2.5 font-normal">{organizationCount} 个组织</Badge>
              <Badge variant="secondary" className="rounded-full px-2.5 font-normal">{memberCount} 名成员</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              新建组织
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[680px] overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside aria-label="组织层级导航" className="max-h-[430px] min-w-0 overflow-y-auto border-b bg-muted/20 scrollbar-thin lg:max-h-none lg:overflow-visible lg:border-b-0 lg:border-r">
          {navigator}
        </aside>
        <main className="min-w-0 bg-background/35">
          <nav aria-label="当前组织路径" className="flex min-h-12 items-center gap-1 overflow-x-auto border-b bg-card/80 px-4 py-2 scrollbar-thin sm:px-5">
            {path.map((item, index) => {
              const current = index === path.length - 1;
              return (
                <div key={`${item.kind}:${item.id}`} className="flex shrink-0 items-center gap-1">
                  {index > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  <button
                    type="button"
                    aria-current={current ? 'page' : undefined}
                    className={`rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      current
                        ? 'bg-violet-500/10 font-semibold text-violet-700 dark:text-violet-300'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    onClick={() => onSelectPath(item)}
                  >
                    {item.label}
                  </button>
                </div>
              );
            })}
          </nav>
          <div className="p-4 sm:p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </section>
  );
}

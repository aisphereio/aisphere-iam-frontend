'use client';

import { useState } from 'react';
import { Braces, KeyRound, Route, SearchCheck, ShieldCheck } from 'lucide-react';
import { AccessAssignments } from './access-assignments';
import { AdvancedGovernance } from './advanced-governance';
import { PermissionDiagnosis } from './permission-diagnosis';
import { RoleLibrary } from './role-library';
import { ScopeRail } from './scope-rail';
import { cn } from '@/lib/utils';

export type AccessControlView = 'roles' | 'assignments' | 'diagnosis' | 'advanced';

const views = [
  { key: 'roles', label: '角色库', hint: '先定义谁能做什么', icon: KeyRound },
  { key: 'assignments', label: '访问分配', hint: '把角色给到人员和资源', icon: Route },
  { key: 'diagnosis', label: '权限排查', hint: '解释一次访问结果', icon: SearchCheck },
  { key: 'advanced', label: '高级治理', hint: 'Schema 与原始关系', icon: Braces },
] as const;

export function AccessControlPage({
  identityOrg,
  initialView = 'roles',
}: {
  identityOrg: string;
  initialView?: AccessControlView;
}) {
  // `initialView` seeds the internal view state from the outer Tab router
  // (e.g. `grants`→assignments, `permissions-center`→advanced). Once mounted,
  // the four-way nav owns the view; the sidebar only exposes `permissions` as a
  // nav entry, so `grants`/`permissions-center` act as deep-link seeds, not
  // synced state. If Tab↔view sync is needed later, lift `view` to AppShell.
  const [view, setView] = useState<AccessControlView>(initialView);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_30%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
            <ShieldCheck className="h-4 w-4" /> IAM access graph
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">访问控制</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            先理解角色和生效范围，再把访问权分配给人员或用户组。普通操作无需接触 SpiceDB tuple。
          </p>
        </header>

        <nav aria-label="访问控制能力" className="grid gap-2 rounded-xl border bg-card/80 p-2 shadow-sm backdrop-blur md:grid-cols-4">
          {views.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={cn(
                  'flex min-h-14 items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
                  active ? 'bg-violet-600 text-white shadow-sm' : 'hover:bg-muted',
                )}
              >
                <span className={cn('grid h-8 w-8 place-items-center rounded-md', active ? 'bg-white/15' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400')}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className={cn('block truncate text-[11px]', active ? 'text-violet-100' : 'text-muted-foreground')}>{item.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {view === 'roles' && <RoleLibrary onAssign={() => setView('assignments')} />}
        {view === 'assignments' && <AccessAssignments identityOrg={identityOrg} />}
        {view === 'diagnosis' && <PermissionDiagnosis identityOrg={identityOrg} scopeRail={<ScopeRail />} />}
        {view === 'advanced' && <AdvancedGovernance />}
      </div>
    </div>
  );
}

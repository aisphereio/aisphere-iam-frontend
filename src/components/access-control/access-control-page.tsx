'use client';

import { useState } from 'react';
import { Braces, KeyRound, Route, SearchCheck, ShieldCheck } from 'lucide-react';
import { AccessAssignments } from './access-assignments';
import { AdvancedGovernance } from './advanced-governance';
import { PermissionDiagnosis } from './permission-diagnosis';
import { RoleLibrary } from './role-library';
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
  const [view, setView] = useState<AccessControlView>(initialView);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_30%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
              <ShieldCheck className="h-4 w-4" /> IAM access graph
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">访问控制</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              先理解角色和生效范围，再把访问权分配给人员或用户组。普通操作无需接触 SpiceDB tuple。
            </p>
          </div>
          <ScopeRail />
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
        {view === 'diagnosis' && <PermissionDiagnosis identityOrg={identityOrg} />}
        {view === 'advanced' && <AdvancedGovernance />}
      </div>
    </div>
  );
}

function ScopeRail() {
  const scopes = [
    { label: '平台', note: '显式平台管理员' },
    { label: '组织', note: '继承管理用户组' },
    { label: '用户组', note: '直属组管理员' },
    { label: '资源', note: 'Skill 等实例' },
  ];
  return (
    <div className="hidden min-w-[520px] items-center rounded-xl border bg-card/75 px-4 py-3 shadow-sm backdrop-blur xl:flex">
      {scopes.map((scope, index) => (
        <div key={scope.label} className="contents">
          <div className="min-w-24">
            <div className="font-mono text-xs font-semibold text-foreground">{scope.label}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{scope.note}</div>
          </div>
          {index < scopes.length - 1 && <div className="mx-2 h-px flex-1 bg-gradient-to-r from-violet-500/70 to-cyan-500/40" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

/**
 * Inheritance scope rail: visualises the platform → organization → group →
 * resource chain. Lives in the permission-diagnosis view where the inheritance
 * explanation is most useful, rather than crowding the page header.
 */
export function ScopeRail() {
  const scopes = [
    { label: '平台', note: '显式平台管理员' },
    { label: '组织', note: '继承管理用户组' },
    { label: '用户组', note: '直属组管理员' },
    { label: '资源', note: 'Skill 等实例' },
  ];
  return (
    <div className="flex flex-wrap items-center rounded-xl border bg-card/75 px-4 py-3 shadow-sm backdrop-blur">
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

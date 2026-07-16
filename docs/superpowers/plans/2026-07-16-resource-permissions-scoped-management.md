# Resource Permissions Scoped Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将资源权限页改造成“先选资源类型，再选具体资源，并在当前资源内添加成员”的上下文收敛管理界面。

**Architecture:** `ResourcePermissions` 管理资源类型、资源实例和详情状态；纯函数模型负责选择与 URL；独立 `ResourceMemberDialog` 对当前锁定资源执行 Grant。后端接口和权限模型保持不变。

**Tech Stack:** Next.js 16、React 19、TypeScript、TanStack Query、Radix UI、Vitest、Testing Library。

---

## File Map

- Create: `src/components/access-control/resource-permissions-model.ts`
- Create: `src/components/access-control/resource-permissions-model.test.ts`
- Create: `src/components/access-control/resource-member-dialog.tsx`
- Create: `src/components/access-control/resource-member-dialog.test.tsx`
- Create: `src/components/access-control/resource-permissions.test.tsx`
- Modify: `src/components/access-control/resource-permissions.tsx`
- Modify: `src/app/page.tsx`
- Preserve: `src/lib/api/index.ts` — 当前已有并行修改，不得编辑或提交。

## Confirmed Test Seams

- 纯模型：输入目录和 URL，观察选择结果与新 URL。
- 成员对话框：操作可见表单，观察 Grant 请求。
- 资源权限页：操作类型和资源列表，观察 AccessQuery 与对话框的 `{type, id}`。

### Task 1: Resource selection model

**Files:**
- Create: `src/components/access-control/resource-permissions-model.test.ts`
- Create: `src/components/access-control/resource-permissions-model.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  eligibleResourceTypes,
  permissionResourceOptions,
  readResourcePermissionLocation,
  resolveResourceSelection,
  writeResourcePermissionLocation,
} from './resource-permissions-model';

describe('resource permission selection model', () => {
  it('defaults to project and excludes non-grantable types', () => {
    const project = { type: 'project', displayName: '项目', grantable: true };
    const skill = { type: 'skill', displayName: 'Skill', grantable: true };
    expect(eligibleResourceTypes([skill, project, { type: 'deployment', grantable: false }], '')).toEqual({
      types: [project, skill], selectedType: 'project',
    });
  });

  it('uses project directory records for project options', () => {
    expect(permissionResourceOptions('project', [
      { id: 'p1', orgId: 'aisphere', slug: 'agent', displayName: 'AI 助手平台' },
    ], [])).toEqual([{ type: 'project', id: 'p1', label: 'AI 助手平台', path: 'agent' }]);
  });

  it('filters resource records by selected type', () => {
    expect(permissionResourceOptions('skill', [], [
      { ref: { type: 'skill', id: 's1' }, displayName: '代码审查助手', path: '项目 / 空间 / Skill' },
      { ref: { type: 'tool', id: 't1' }, displayName: '检索工具' },
    ])).toEqual([{ type: 'skill', id: 's1', label: '代码审查助手', path: '项目 / 空间 / Skill' }]);
  });

  it('restores a valid resource and falls back for an invalid id', () => {
    const rows = [{ type: 'project', id: 'p1', label: '项目一' }, { type: 'project', id: 'p2', label: '项目二' }];
    expect(resolveResourceSelection(rows, 'p2')?.id).toBe('p2');
    expect(resolveResourceSelection(rows, 'missing')?.id).toBe('p1');
  });

  it('preserves unrelated query parameters', () => {
    expect(readResourcePermissionLocation('?tab=resource-permissions&resourceType=skill&resourceId=s1')).toEqual({ resourceType: 'skill', resourceId: 's1' });
    expect(writeResourcePermissionLocation('?tab=resource-permissions&foo=bar', 'project', 'p1')).toBe('?tab=resource-permissions&foo=bar&resourceType=project&resourceId=p1');
  });
});
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run src/components/access-control/resource-permissions-model.test.ts`

Expected: FAIL because the model module is missing.

- [ ] **Step 3: Implement the model**

```ts
import type { IamProject, IamResource, IamResourceType } from '@/lib/api/types';

export interface PermissionResourceOption { type: string; id: string; label: string; path?: string }

export function eligibleResourceTypes(resourceTypes: IamResourceType[], requestedType: string) {
  const types = resourceTypes.filter((item) => item.grantable !== false).sort((a, b) => {
    if (a.type === 'project') return -1;
    if (b.type === 'project') return 1;
    return (a.displayName || a.type).localeCompare(b.displayName || b.type, 'zh-CN');
  });
  const selectedType = types.some((item) => item.type === requestedType)
    ? requestedType
    : types.find((item) => item.type === 'project')?.type || types[0]?.type || '';
  return { types, selectedType };
}

export function permissionResourceOptions(resourceType: string, projects: IamProject[], resources: IamResource[]): PermissionResourceOption[] {
  if (resourceType === 'project') return projects.map((item) => ({
    type: 'project', id: item.id, label: item.displayName || item.slug || item.id, path: item.slug || undefined,
  }));
  return resources.filter((item) => item.ref.type === resourceType).map((item) => ({
    type: item.ref.type, id: item.ref.id, label: item.displayName || item.slug || item.ref.id, path: item.path || item.slug || undefined,
  }));
}

export function resolveResourceSelection(rows: PermissionResourceOption[], requestedId: string) {
  return rows.find((item) => item.id === requestedId) || rows[0] || null;
}

export function readResourcePermissionLocation(search: string) {
  const params = new URLSearchParams(search);
  return { resourceType: params.get('resourceType') || '', resourceId: params.get('resourceId') || '' };
}

export function writeResourcePermissionLocation(search: string, resourceType: string, resourceId: string) {
  const params = new URLSearchParams(search);
  resourceType ? params.set('resourceType', resourceType) : params.delete('resourceType');
  resourceId ? params.set('resourceId', resourceId) : params.delete('resourceId');
  return `?${params.toString()}`;
}
```

- [ ] **Step 4: Verify green and commit**

Run: `npx vitest run src/components/access-control/resource-permissions-model.test.ts`

Expected: 5 tests PASS.

```powershell
git add src/components/access-control/resource-permissions-model.ts src/components/access-control/resource-permissions-model.test.ts
git commit -m "feat(iam-front): model scoped resource permission selection"
```

### Task 2: Locked resource member dialog

**Files:**
- Create: `src/components/access-control/resource-member-dialog.test.tsx`
- Create: `src/components/access-control/resource-member-dialog.tsx`

- [ ] **Step 1: Write failing public behavior tests**

Mock IAM hooks with one user, one group, project roles and `grantAccess = vi.fn()`. Render:

```tsx
<ResourceMemberDialog open onOpenChange={vi.fn()} identityOrg="aisphere"
  resource={{ type: 'project', id: 'p1', label: 'AI 助手平台' }} onGranted={vi.fn()} />
```

Assert the locked scope and absence of resource selectors:

```ts
expect(screen.getByText('AI 助手平台')).toBeInTheDocument();
expect(screen.getByText('project:p1')).toBeInTheDocument();
expect(screen.queryByLabelText('资源类型')).not.toBeInTheDocument();
expect(screen.queryByLabelText('具体资源')).not.toBeInTheDocument();
```

Mock Radix Select as native `<select>` controls. Select `user-1` and `developer`, submit, and assert:

```ts
expect(grantAccess).toHaveBeenCalledWith({
  resource: { type: 'project', id: 'p1' },
  role_key: 'developer',
  subject: { type: 'user', id: 'user-1', relation: undefined },
  source: 'iam_console', reason: undefined, expires_at: undefined,
});
```

Also assert Skill roles are absent when the resource type is `project`.

- [ ] **Step 2: Verify red**

Run: `npx vitest run src/components/access-control/resource-member-dialog.test.tsx`

Expected: FAIL because the dialog is missing.

- [ ] **Step 3: Implement the dialog**

Public props:

```ts
interface ResourceMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identityOrg: string;
  resource: PermissionResourceOption | null;
  onGranted: () => void | Promise<void>;
}
```

Filter roles and submit exactly as follows:

```ts
const roles = (rolesQuery.data?.roleTemplates || []).filter(
  (role) => role.enabled !== false && role.resourceType === resource?.type,
);

await grantAccess.mutateAsync({
  resource: { type: resource.type, id: resource.id }, role_key: roleKey,
  subject: { type: subjectType, id: subjectId, relation: subjectType === 'group' ? 'member' : undefined },
  source: 'iam_console', reason: reason.trim() || undefined,
  expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
});
await onGranted();
onOpenChange(false);
```

Render one Radix Dialog with a read-only resource card, user/group choice, subject select, filtered role select, optional expiration/reason, and “添加成员”. Disable submit until subject and role exist. If no roles exist, show “当前资源类型尚未配置可分配角色”. On failure keep the dialog open and render the error.

- [ ] **Step 4: Verify green and commit**

Run: `npx vitest run src/components/access-control/resource-member-dialog.test.tsx`

Expected: all tests PASS.

```powershell
git add src/components/access-control/resource-member-dialog.tsx src/components/access-control/resource-member-dialog.test.tsx
git commit -m "feat(iam-front): add scoped resource member dialog"
```

### Task 3: Resource type filter and scoped resource list

**Files:**
- Create: `src/components/access-control/resource-permissions.test.tsx`
- Modify: `src/components/access-control/resource-permissions.tsx`

- [ ] **Step 1: Write failing page tests**

Mock IAM hooks and `ResourceMemberDialog`. Verify:

```ts
expect(screen.getByRole('combobox', { name: '资源类型' })).toHaveValue('project');
expect(screen.getByRole('button', { name: /AI 助手平台/ })).toHaveAttribute('aria-selected', 'true');
expect(useIamResourceAccess).toHaveBeenLastCalledWith('aisphere', { type: 'project', id: 'p1' });
```

After changing the native test Select to `skill`, assert “代码审查助手” exists and unrelated “检索工具” does not. Click “添加成员” and assert the dialog probe contains `project:p1`, while the “资源权限” heading remains present.

- [ ] **Step 2: Verify red**

Run: `npx vitest run src/components/access-control/resource-permissions.test.tsx`

Expected: FAIL because the current page renders a mixed tree and navigates away.

- [ ] **Step 3: Replace tree state with type and resource state**

Use:

```ts
const initialLocation = useMemo(() => readResourcePermissionLocation(typeof window === 'undefined' ? '' : window.location.search), []);
const [resourceType, setResourceType] = useState(initialLocation.resourceType || 'project');
const [requestedResourceId, setRequestedResourceId] = useState(initialLocation.resourceId);
const [searchQuery, setSearchQuery] = useState('');
const [memberDialogOpen, setMemberDialogOpen] = useState(false);
const { types: grantableTypes, selectedType } = useMemo(() => eligibleResourceTypes(resourceTypes, resourceType), [resourceType, resourceTypes]);
const resourceOptions = useMemo(() => permissionResourceOptions(selectedType, projects, resources), [projects, resources, selectedType]);
const selectedResource = useMemo(() => resolveResourceSelection(resourceOptions, requestedResourceId), [requestedResourceId, resourceOptions]);
```

Delete `TreeNode`, `resourceTree`, `filteredTree` and `ResourceTreeNodes`. Render:

- Labeled resource type Select containing only `grantableTypes`.
- Search input and flat scrollable list containing only `selectedType` resources.
- `aria-selected` on resource rows, with name and optional path.
- Loading, failure with retry, and empty states.
- Existing direct/effective detail tabs for `selectedResource`.

Type change must clear resource ID and search. Resource click must set only that resource ID.

- [ ] **Step 4: Open member assignment inline and refresh details**

```tsx
<Button size="sm" onClick={() => setMemberDialogOpen(true)} disabled={!selectedResource}>
  <Users className="mr-1.5 h-3.5 w-3.5" />添加成员
</Button>

<ResourceMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}
  identityOrg={identityOrg} resource={selectedResource}
  onGranted={async () => { await accessQuery.refetch(); }} />
```

Do not navigate to `grants`. Keep revoke and AccessQuery behavior. Resolve user/group display names when directory data exists, falling back to subject IDs.

- [ ] **Step 5: Synchronize the valid context to URL**

```ts
const search = writeResourcePermissionLocation(window.location.search, selectedType, selectedResource?.id || '');
window.history.replaceState({}, '', `${window.location.pathname}${search}${window.location.hash}`);
```

Guard effects so state is only updated when normalized type or resource ID differs.

- [ ] **Step 6: Verify green and commit**

Run: `npx vitest run src/components/access-control/resource-permissions.test.tsx`

Expected: all page tests PASS.

```powershell
git add src/components/access-control/resource-permissions.tsx src/components/access-control/resource-permissions.test.tsx
git commit -m "feat(iam-front): scope resource permissions by resource type"
```

### Task 4: Remove obsolete navigation and verify restored context

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/access-control/resource-permissions.test.tsx`

- [ ] **Step 1: Add restore and refresh tests**

Set `/?tab=resource-permissions&resourceType=skill&resourceId=s1` before render and assert Skill plus `s1` are selected. Make the dialog mock call `onGranted`; assert `accessRefetch` runs once and selection remains `skill:s1`.

- [ ] **Step 2: Remove the obsolete prop**

```tsx
if (tab === 'resource-permissions') return <ResourcePermissions identityOrg={identityOrg} />;
```

Remove `onNavigate` from `ResourcePermissionsProps`. Keep global `GrantEditor` unchanged for advanced cross-resource assignments.

- [ ] **Step 3: Run focused tests and commit**

Run:

```powershell
npx vitest run src/components/access-control/resource-permissions-model.test.ts src/components/access-control/resource-member-dialog.test.tsx src/components/access-control/resource-permissions.test.tsx
```

Expected: all focused tests PASS.

```powershell
git add src/app/page.tsx src/components/access-control/resource-permissions.test.tsx
git commit -m "refactor(iam-front): keep resource member flow in context"
```

### Task 5: Full verification and browser smoke check

- [ ] **Step 1: Run repository gates**

```powershell
npm test -- --run
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

Expected: all commands exit 0. If `next build` reports `EBUSY`, stop only the stale local `.next/standalone/server.js --port 3001` process and rerun.

- [ ] **Step 2: Verify visible behavior**

Confirm in the browser: default project; switching type replaces the list; selected resource updates header and URL; add-member stays on page with locked resource; roles match type; cancel preserves context; success refreshes permissions; keyboard focus remains visible.

- [ ] **Step 3: Inspect scope and preserve unrelated work**

```powershell
git status --short
git diff --check
git diff origin/main...HEAD -- src/components/access-control src/app/page.tsx docs/superpowers
```

Expected: only scoped implementation and docs are committed. The pre-existing `src/lib/api/index.ts` modification remains separate unless its owner committed it independently. Do not create an empty verification commit.

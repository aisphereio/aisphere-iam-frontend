# IAM Organization Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense organization-management page with a responsive hierarchy-and-context workbench while preserving every existing directory mutation.

**Architecture:** Keep data fetching, mutations, and selection ownership in `GroupsPage`. Extract pure hierarchy/path helpers into a tested model module and render focused presentational sections for the navigator, context spine, root overview, group tabs, member profile, and dialogs. Reuse existing shadcn primitives and React Query hooks; add no dependencies or backend contracts.

**Tech Stack:** Next.js 16 Client Components, React 19, TypeScript, Tailwind CSS 4, shadcn/Radix UI, TanStack Query, Vitest, React Testing Library.

---

### Task 1: Extract the organization workbench model

**Files:**
- Create: `src/components/pages/organization-workbench-model.ts`
- Create: `src/components/pages/organization-workbench-model.test.ts`
- Modify: `src/components/pages/groups-page.tsx`

- [ ] **Step 1: Write failing path and summary tests**

```ts
expect(buildOrganizationPath(child, groupMap, 'Aisphere').map((item) => item.label))
  .toEqual(['Aisphere', 'Engineering', 'Platform']);
expect(summarizeOrganization(engineering, childrenMap, groupUsersMap)).toEqual({
  directMembers: 2,
  directChildren: 1,
  allDescendants: 2,
});
```

- [ ] **Step 2: Run `npm test -- --run src/components/pages/organization-workbench-model.test.ts` and verify missing exports fail**
- [ ] **Step 3: Move ID, label, map, path, descendant and membership helpers into the model module with cycle protection**
- [ ] **Step 4: Re-run the targeted test and verify it passes**
- [ ] **Step 5: Update `GroupsPage` imports without changing behavior and run the full suite**

### Task 2: Build the navigator and context spine

**Files:**
- Create: `src/components/pages/organization-workbench-shell.tsx`
- Create: `src/components/pages/organization-workbench-shell.test.tsx`
- Modify: `src/components/pages/groups-page.tsx`

- [ ] **Step 1: Write a failing component test for the workbench heading, selected path, create action, and root navigation**

```tsx
render(<OrganizationWorkbenchShell path={path} title="平台研发" onSelectPath={onSelectPath}>content</OrganizationWorkbenchShell>);
expect(screen.getByRole('heading', { name: '组织工作台' })).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: 'Aisphere' }));
expect(onSelectPath).toHaveBeenCalledWith('root');
```

- [ ] **Step 2: Run the targeted test and verify the component is missing**
- [ ] **Step 3: Implement the two-column shell, restrained header, searchable navigator slot, and clickable path spine using existing tokens**
- [ ] **Step 4: Add visible focus, `role="tree"`, `role="treeitem"`, `aria-selected`, and `aria-expanded` to the existing recursive tree**
- [ ] **Step 5: Run the targeted test and full suite**

### Task 3: Recompose root, organization, and member workspaces

**Files:**
- Create: `src/components/pages/organization-workspace.tsx`
- Create: `src/components/pages/organization-workspace.test.tsx`
- Modify: `src/components/pages/groups-page.tsx`

- [ ] **Step 1: Write failing tests proving group selection exposes `概览`, `成员`, and `组织设置`, while member selection exposes identity details and memberships**
- [ ] **Step 2: Run targeted tests and verify the new workspace components are missing**
- [ ] **Step 3: Implement the root overview from reliable counts and top-level organization links**
- [ ] **Step 4: Implement organization tabs: child overview, member management, and settings**
- [ ] **Step 5: Implement the member profile and membership navigation without fabricating role data**
- [ ] **Step 6: Wire existing create/update/delete/assign/remove handlers into the focused components**
- [ ] **Step 7: Run targeted and full tests**

### Task 4: Separate creation, editing, and destructive actions

**Files:**
- Create: `src/components/pages/organization-dialogs.tsx`
- Create: `src/components/pages/organization-dialogs.test.tsx`
- Modify: `src/components/pages/groups-page.tsx`

- [ ] **Step 1: Write failing tests for default child parent, disabled empty-name submission, and explicit destructive confirmation copy**
- [ ] **Step 2: Run the targeted tests and verify the dialogs are missing**
- [ ] **Step 3: Move the existing dirty-tree `CreateGroupDialog` into the dialog module without losing its duplicate warning and preview**
- [ ] **Step 4: Add a focused edit dialog with parent picker and keep delete in `AlertDialog`**
- [ ] **Step 5: Run targeted and full tests**

### Task 5: Visual critique, responsive verification, and completion gates

**Files:**
- Modify only files from Tasks 1-4 when the rendered critique finds a concrete issue.

- [ ] **Step 1: Run `npm test -- --run` and require all tests to pass**
- [ ] **Step 2: Run `npx tsc --noEmit` and require exit code 0**
- [ ] **Step 3: Run `npm run lint` and record errors separately from existing warnings**
- [ ] **Step 4: Run `npm run build` and require a successful production build**
- [ ] **Step 5: Render at desktop and mobile widths; verify hierarchy visibility, path navigation, focused actions, dark mode, keyboard focus, and reduced-motion behavior**
- [ ] **Step 6: Run `git diff --check` and review that existing user changes were incorporated rather than overwritten**

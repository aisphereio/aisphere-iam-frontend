'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, GitBranch, Plus, RefreshCw, Save, Trash2, X,
  ChevronDown, ChevronRight, Folder, FolderOpen,
  UserMinus, UserPlus, CornerDownRight, Network, Layers,
  AlertTriangle, Bug, UserRound, Mail, Phone, Fingerprint,
  Tag, ExternalLink, MapPin, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useMe } from '@/hooks/use-auth';
import {
  useIamAssignUserToGroup, useIamCreateGroup, useIamDeleteGroup,
  useIamDirectoryGroups, useIamDirectoryOrganization,
  useIamExternalUsers, useIamRemoveUserFromGroup, useIamUpdateGroup,
} from '@/hooks/use-iam';
import type { IamGroup, IamPrincipal, IamUser } from '@/lib/api/types';
import { GroupTreePicker } from './group-tree-picker';

type OrganizationForm = {
  name: string;
  displayName: string;
  type: string;
  parentId: string;
};

const emptyForm: OrganizationForm = { name: '', displayName: '', type: 'Physical', parentId: '' };

type SelectionKind = 'root' | 'group' | 'user';
type Selection =
  | { kind: 'root' }
  | { kind: 'group'; group: IamGroup }
  | { kind: 'user'; user: IamUser; groupId: string };

function defaultZoneFromPrincipal(principal?: IamPrincipal): string {
  const candidates = [
    process.env.NEXT_PUBLIC_CASDOOR_ORG,
    process.env.NEXT_PUBLIC_DEFAULT_ORG_ID,
    principal?.orgId,
    principal?.tenantId,
    'aisphere',
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return 'aisphere';
}

function groupID(group?: IamGroup | null): string {
  return group?.id || group?.externalId || group?.name || '';
}

function userID(user?: IamUser | null): string {
  return user?.id || user?.externalId || user?.username || '';
}

function userLabel(user?: IamUser | null): string {
  if (!user) return '';
  return user.displayName || user.username || user.email || user.id || user.externalId || '';
}

function userInitial(user?: IamUser | null): string {
  const label = userLabel(user);
  return label ? label.charAt(0).toUpperCase() : '?';
}

function groupLabel(group?: IamGroup | null): string {
  if (!group) return '';
  return group.displayName || group.name || group.id || '';
}

function parentKey(group: IamGroup, userSourceId: string): string {
  const parent = group.parentId?.trim();
  return (!parent || parent === userSourceId) ? '' : parent;
}

function isTopLevelOrganization(group: IamGroup, userSourceId: string): boolean {
  return parentKey(group, userSourceId) === '';
}

function buildChildrenMap(groups: IamGroup[], userSourceId: string): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  for (const group of groups) {
    const parent = parentKey(group, userSourceId);
    const bucket = map.get(parent) || [];
    bucket.push(group);
    map.set(parent, bucket);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
  }
  return map;
}

function buildGroupMap(groups: IamGroup[]): Map<string, IamGroup> {
  const map = new Map<string, IamGroup>();
  for (const group of groups) {
    const id = groupID(group);
    if (id) map.set(id, group);
  }
  return map;
}

function buildGroupPath(group: IamGroup | null, groupMap: Map<string, IamGroup>, rootLabel: string): string[] {
  if (!group) return [rootLabel];
  const path: string[] = [];
  const seen = new Set<string>();
  let current: IamGroup | undefined = group;
  while (current) {
    const id = groupID(current);
    if (!id || seen.has(id)) break;
    seen.add(id);
    path.unshift(groupLabel(current));
    current = current.parentId ? groupMap.get(current.parentId) : undefined;
  }
  return [rootLabel, ...path];
}

/** Collect all descendants of the given group id (DFS) with cycle protection. */
function collectDescendants(
  groupId: string,
  childrenMap: Map<string, IamGroup[]>,
): Array<{ group: IamGroup; depth: number }> {
  const out: Array<{ group: IamGroup; depth: number }> = [];
  const seen = new Set<string>();
  const stack: Array<{ id: string; depth: number }> = [{ id: groupId, depth: 0 }];
  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    if (seen.has(id)) continue; // cycle guard
    seen.add(id);
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      out.push({ group: child, depth: depth + 1 });
      stack.push({ id: groupID(child), depth: depth + 1 });
    }
  }
  return out;
}

/** Collect all descendant IDs of the given group id (cycle-safe). Used for move-cycle prevention. */
function collectDescendantIds(
  groupId: string,
  childrenMap: Map<string, IamGroup[]>,
): Set<string> {
  const out = new Set<string>();
  const stack = [groupId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      const cid = groupID(child);
      if (!cid || out.has(cid)) continue; // cycle guard
      out.add(cid);
      stack.push(cid);
    }
  }
  return out;
}

/** Build a map from group ID -> list of users belonging to that group. */
function buildGroupUsersMap(
  groups: IamGroup[],
  userById: Map<string, IamUser>,
  allUsers: IamUser[],
): Map<string, IamUser[]> {
  const map = new Map<string, IamUser[]>();
  // Seed from group.users (group-side membership, may contain usernames or IDs)
  for (const group of groups) {
    const gid = groupID(group);
    if (!gid) continue;
    const users: IamUser[] = [];
    for (const id of group.users || []) {
      const u = userById.get(id);
      if (u && !users.includes(u)) users.push(u);
    }
    map.set(gid, users);
  }
  // Also join from user.groups (user-side membership) to catch memberships not
  // reflected in group.users (e.g. users assigned via Casdoor directly).
  for (const user of allUsers) {
    for (const gid of user.groups || []) {
      const existing = map.get(gid) || [];
      if (!existing.includes(user)) {
        existing.push(user);
        map.set(gid, existing);
      }
    }
  }
  return map;
}

// ─── Unified tree row: renders a group with its inline members, then its sub-groups ─
function UnifiedTreeRows({
  parentId,
  depth,
  childrenMap,
  groupUsersMap,
  selection,
  onSelectGroup,
  onSelectUser,
  expandedIds,
  onToggle,
}: {
  parentId: string;
  depth: number;
  childrenMap: Map<string, IamGroup[]>;
  groupUsersMap: Map<string, IamUser[]>;
  selection: Selection;
  onSelectGroup: (group: IamGroup) => void;
  onSelectUser: (user: IamUser, groupId: string) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const rows = childrenMap.get(parentId) || [];
  return (
    <>
      {rows.map((group, idx) => {
        const id = groupID(group);
        const isGroupSelected = selection.kind === 'group' && groupID(selection.group) === id;
        const childCount = childrenMap.get(id)?.length || 0;
        const isExpanded = expandedIds.has(id);
        const isLast = idx === rows.length - 1;
        const members = groupUsersMap.get(id) || [];
        const memberCount = members.length;

        return (
          <div key={id} className="relative">
            {/* Organization node */}
            <button
              className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                isGroupSelected
                  ? 'bg-accent text-foreground shadow-sm ring-1 ring-violet-500/30'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
              style={{ paddingLeft: 8 + depth * 22 }}
              onClick={() => onSelectGroup(group)}
            >
              {childCount > 0 ? (
                <span
                  className="h-4 w-4 flex items-center justify-center shrink-0 cursor-pointer rounded hover:bg-accent"
                  onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                >
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3 transition-transform" />
                    : <ChevronRight className="h-3 w-3 transition-transform" />}
                </span>
              ) : (
                <span className="w-4 shrink-0 flex items-center justify-center">
                  <CornerDownRight className="h-3 w-3 text-muted-foreground/50" />
                </span>
              )}
              {childCount > 0 ? (
                isExpanded
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              )}
              <span className="truncate font-medium">{groupLabel(group)}</span>
              {group.type ? <Badge variant="outline" className="text-[9px] ml-1">{group.type}</Badge> : null}
              <div className="ml-auto flex items-center gap-1">
                {memberCount > 0 ? (
                  <Badge variant="secondary" className="text-[9px] tabular-nums gap-0.5">
                    <UserRound className="h-2.5 w-2.5" />
                    {memberCount}
                  </Badge>
                ) : null}
                {childCount > 0 ? (
                  <Badge variant="secondary" className="text-[9px] tabular-nums">{childCount}</Badge>
                ) : null}
              </div>
            </button>

            {/* Expanded content: members first, then sub-groups */}
            {isExpanded && (childCount > 0 || memberCount > 0) ? (
              <div>
                {/* Members inline under this group */}
                {memberCount > 0 ? (
                  <div className="space-y-0.5">
                    {members.map((user) => {
                      const uid = userID(user);
                      const isUserSelected = selection.kind === 'user' && selection.user && userID(selection.user) === uid && selection.groupId === id;
                      return (
                        <button
                          key={uid}
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors ${
                            isUserSelected
                              ? 'bg-accent text-foreground ring-1 ring-violet-500/30'
                              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                          }`}
                          style={{ paddingLeft: 8 + (depth + 1) * 22 + 4 }}
                          onClick={() => onSelectUser(user, id)}
                        >
                          <span className="w-4 shrink-0 flex items-center justify-center">
                            <CornerDownRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                          </span>
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-[8px] font-bold text-sky-600 dark:text-sky-400">
                              {userInitial(user)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">{userLabel(user)}</span>
                          {user.username && user.username !== userLabel(user) ? (
                            <span className="text-[10px] text-muted-foreground/70 truncate">@{user.username}</span>
                          ) : null}
                          <Badge variant="outline" className="ml-auto text-[9px]">成员</Badge>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Sub-groups */}
                {childCount > 0 ? (
                  <UnifiedTreeRows
                    parentId={id}
                    depth={depth + 1}
                    childrenMap={childrenMap}
                    groupUsersMap={groupUsersMap}
                    selection={selection}
                    onSelectGroup={onSelectGroup}
                    onSelectUser={onSelectUser}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                  />
                ) : null}
              </div>
            ) : null}

            {/* Vertical connector line for siblings below */}
            {!isLast && depth > 0 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-muted/40"
                style={{ marginLeft: 8 + (depth - 1) * 22 + 11 }}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

// ─── Member row in detail panel ────────────────────────────────────────
function MemberRow({
  user,
  onRemove,
  removePending,
}: {
  user: IamUser;
  onRemove?: (user: IamUser) => void;
  removePending?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-[10px] font-bold text-sky-600 dark:text-sky-400">
          {userInitial(user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{userLabel(user)}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {user.email ? (
            <span className="text-[10px] text-muted-foreground truncate">
              <Mail className="inline h-2.5 w-2.5 mr-0.5" />
              {user.email}
            </span>
          ) : null}
          {user.username && user.username !== userLabel(user) ? (
            <span className="text-[10px] text-muted-foreground/70 font-mono truncate">@{user.username}</span>
          ) : null}
        </div>
      </div>
      <Badge variant="outline" className="text-[9px] shrink-0">成员</Badge>
      {onRemove ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive shrink-0"
          disabled={removePending}
          onClick={() => onRemove(user)}
          title="移出当前组织"
        >
          <UserMinus className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}

// ─── Child organization card in detail panel ──────────────────────────
function ChildGroupCard({
  group,
  path,
  memberCount,
  childCount,
  onClick,
}: {
  group: IamGroup;
  path: string;
  memberCount: number;
  childCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border bg-card/40 px-2 py-1.5 text-left transition-colors hover:bg-accent/60"
    >
      {childCount > 0 ? <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <GitBranch className="h-3.5 w-3.5 text-sky-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{groupLabel(group)}</div>
        <div className="text-[10px] text-muted-foreground truncate">{path}</div>
      </div>
      {group.type ? <Badge variant="outline" className="text-[9px] shrink-0">{group.type}</Badge> : null}
      <div className="flex items-center gap-1 shrink-0">
        {memberCount > 0 ? (
          <Badge variant="secondary" className="text-[9px] tabular-nums gap-0.5">
            <UserRound className="h-2.5 w-2.5" />
            {memberCount}
          </Badge>
        ) : null}
        {childCount > 0 ? (
          <Badge variant="secondary" className="text-[9px] tabular-nums">{childCount}</Badge>
        ) : null}
      </div>
    </button>
  );
}

export function GroupsPage({ identityOrg: identityOrgProp }: { identityOrg?: string }) {
  const { data: me } = useMe();
  const [selection, setSelection] = useState<Selection>({ kind: 'root' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [form, setForm] = useState<OrganizationForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ groupName: string; parentName: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ groupId: string; groupName: string } | null>(null);

  const zoneId = identityOrgProp?.trim() || defaultZoneFromPrincipal(me);
  const { data: zone } = useIamDirectoryOrganization(zoneId);
  const { data, isLoading, isFetching, error, refetch } = useIamDirectoryGroups(zoneId);
  const { data: allUsersData } = useIamExternalUsers(zoneId, { pageSize: 500 });
  const createGroup = useIamCreateGroup();
  const updateGroup = useIamUpdateGroup();
  const deleteGroup = useIamDeleteGroup();
  const assignUser = useIamAssignUserToGroup();
  const removeUser = useIamRemoveUserFromGroup();

  const groups = data?.groups || [];
  const allUsers = allUsersData?.users || [];
  const userById = useMemo(() => {
    const m = new Map<string, IamUser>();
    for (const u of allUsers) {
      // Key by all possible aliases so group.users (which may contain usernames
      // from Casdoor) can resolve against user IDs and vice versa.
      for (const key of [userID(u), u.externalId, u.username]) {
        if (key) m.set(key, u);
      }
    }
    return m;
  }, [allUsers]);

  const childrenMap = useMemo(() => buildChildrenMap(groups, zoneId), [groups, zoneId]);
  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);
  const groupUsersMap = useMemo(() => buildGroupUsersMap(groups, userById, allUsers), [groups, userById, allUsers]);
  const rootGroups = childrenMap.get('') || [];
  const rootLabel = zone?.displayName || zone?.name || zoneId;

  const topLevelOrganizationCount = groups.filter((group) => isTopLevelOrganization(group, zoneId)).length;
  const childOrganizationCount = groups.length - topLevelOrganizationCount;
  const groupsWithParentId = groups.filter((g) => g.parentId && g.parentId.trim()).length;
  const groupsWithPath = groups.filter((g) => g.path && g.path.trim()).length;
  const isDataFlat = groups.length > 0 && groupsWithParentId === 0 && groupsWithPath === 0;

  // Selected group context (for member management)
  const selectedGroup = selection.kind === 'group' ? selection.group : null;
  const selectedId = selectedGroup ? groupID(selectedGroup) : '';
  const { data: selectedGroupUsersData, refetch: refetchSelectedGroupUsers } = useIamExternalUsers(
    zoneId,
    selectedId ? { groupId: selectedId, pageSize: 500 } : { pageSize: 0 },
  );
  const selectedGroupUsers = selectedGroup ? (selectedGroupUsersData?.users || []) : [];
  const selectedGroupUserIds = new Set(selectedGroupUsers.map(userID).filter(Boolean));
  const assignableUsers = allUsers.filter((user) => !selectedGroupUserIds.has(userID(user)));

  // Auto-expand root-level groups on first load so the hierarchy is visible.
  const didInitExpand = useRef(false);
  useEffect(() => {
    if (!didInitExpand.current && rootGroups.length > 0) {
      didInitExpand.current = true;
      setExpandedIds(new Set(rootGroups.map(groupID).filter(Boolean)));
    }
  }, [rootGroups]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    for (const group of groups) {
      const id = groupID(group);
      if (id && childrenMap.has(id)) all.add(id);
    }
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const handleSelectRoot = () => {
    setSelection({ kind: 'root' });
    setSelectedUserId('');
    resetForm();
  };

  const handleSelectGroup = (group: IamGroup) => {
    setSelection({ kind: 'group', group });
    setSelectedUserId('');
    setForm({
      name: group.name || '',
      displayName: group.displayName || '',
      type: group.type || 'Physical',
      parentId: group.parentId || '',
    });
    setEditing(false);
    // Auto-expand the selected group so its children are visible.
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(groupID(group));
      return next;
    });
  };

  const handleSelectUser = (user: IamUser, groupId: string) => {
    setSelection({ kind: 'user', user, groupId });
    setSelectedUserId('');
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('组织名称不能为空');
      return;
    }
    const effectiveParentId = form.parentId.trim()
      || (selectedGroup ? groupID(selectedGroup) : undefined);
    try {
      await createGroup.mutateAsync({
        orgId: zoneId,
        parentId: effectiveParentId,
        name: form.name.trim(),
        displayName: form.displayName.trim() || undefined,
        type: form.type.trim() || 'Physical',
      });
      toast.success(effectiveParentId ? '子组织已创建' : '顶级组织已创建');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建组织失败');
    }
  };

  const doUpdateGroup = async () => {
    if (!selectedGroup) return;
    const newParentId = form.parentId.trim() || undefined;
    try {
      await updateGroup.mutateAsync({
        orgId: zoneId,
        groupId: groupID(selectedGroup),
        parentId: newParentId,
        name: form.name.trim(),
        displayName: form.displayName.trim() || undefined,
        type: form.type.trim() || selectedGroup.type || 'Physical',
      });
      toast.success(newParentId !== (selectedGroup.parentId || undefined) ? '组织已移动' : '组织已更新');
      setEditing(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新组织失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    if (!form.name.trim()) {
      toast.error('组织名称不能为空');
      return;
    }
    const newParentId = form.parentId.trim() || undefined;
    if (newParentId && newParentId === groupID(selectedGroup)) {
      toast.error('不能把组织设为自己的父级');
      return;
    }
    // Cycle prevention: cannot move into one's own descendant
    if (newParentId) {
      const descendantIds = collectDescendantIds(groupID(selectedGroup), childrenMap);
      if (descendantIds.has(newParentId)) {
        toast.error('不能把组织移动到自己的下级组织下（会形成环）');
        return;
      }
    }
    // If parent is changing, ask for confirmation before mutating
    const currentParent = selectedGroup.parentId?.trim() || '';
    if ((newParentId || '') !== currentParent) {
      const parentName = newParentId
        ? groupLabel(groupMap.get(newParentId)) || newParentId
        : '顶级（无父级）';
      setPendingMove({ groupName: groupLabel(selectedGroup) || groupID(selectedGroup), parentName });
      return;
    }
    await doUpdateGroup();
  };

  const confirmMove = async () => {
    setPendingMove(null);
    await doUpdateGroup();
  };

  const doDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup.mutateAsync({ orgId: zoneId, groupId, recursive: false });
      toast.success('组织已删除');
      setSelection({ kind: 'root' });
      setSelectedUserId('');
      resetForm();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除组织失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    setPendingDelete({ groupId: groupID(selectedGroup), groupName: groupLabel(selectedGroup) || groupID(selectedGroup) });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { groupId } = pendingDelete;
    setPendingDelete(null);
    await doDeleteGroup(groupId);
  };

  const handleAssignUser = async () => {
    if (!selectedGroup || !selectedUserId) return;
    try {
      await assignUser.mutateAsync({ orgId: zoneId, groupId: selectedId, userId: selectedUserId });
      toast.success('用户已加入当前组织');
      setSelectedUserId('');
      await refetch();
      await refetchSelectedGroupUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加入组织失败');
    }
  };

  const handleRemoveUser = async (user: IamUser) => {
    if (!selectedGroup) return;
    const id = userID(user);
    if (!id) return;
    try {
      await removeUser.mutateAsync({ orgId: zoneId, groupId: selectedId, userId: id });
      toast.success('用户已移出当前组织');
      await refetch();
      await refetchSelectedGroupUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '移出组织失败');
    }
  };

  // Compute descendant rows for the detail panel's "下级组织" section
  const descendantRows = useMemo(() => {
    if (!selectedId) {
      return rootGroups.map((g) => ({ group: g, depth: 0 }));
    }
    return collectDescendants(selectedId, childrenMap);
  }, [selectedId, rootGroups, childrenMap]);

  // Compute groups this user belongs to (for the person detail panel)
  const userGroupMemberships = useMemo(() => {
    if (selection.kind !== 'user') return [];
    const uid = userID(selection.user);
    if (!uid) return [];
    return groups.filter((g) => (g.users || []).includes(uid));
  }, [selection, groups]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* ═══ LEFT: Unified tree (organizations + people) ═══ */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4" />
              组织结构（含成员）
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              用户源作为根节点。下方树里同时展示组织和成员：组织用文件夹图标，成员用头像 + 姓名。
              点击节点在右侧查看详情。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="顶级组织" value={topLevelOrganizationCount} />
              <Metric label="子组织" value={childOrganizationCount} />
              <Metric label="成员总数" value={allUsers.length} />
            </div>

            {/* 诊断警告 */}
            {isDataFlat ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-medium text-amber-700 dark:text-amber-300">
                      后端返回的组织数据未包含层级信息
                    </div>
                    <div className="text-muted-foreground leading-relaxed">
                      检测到全部 {groups.length} 个组织都没有 <code className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">parentId</code> 和
                      <code className="font-mono text-[10px] bg-background/60 px-1 py-0.5 rounded">path</code> 字段。
                      请在右侧详情卡片的"父级组织"下拉里手动指定层级。
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDebugPanel((v) => !v)}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      <Bug className="h-3 w-3" />
                      {showDebugPanel ? '收起调试面板' : '展开调试面板查看原始数据'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 调试面板 */}
            {showDebugPanel && groups.length > 0 ? (
              <div className="rounded-md border bg-card/50 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-medium">Group 字段诊断（共 {groups.length} 个）</span>
                  <span>parentId: {groupsWithParentId} · path: {groupsWithPath}</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {groups.map((g) => (
                    <div key={groupID(g)} className="rounded border bg-background/60 p-1.5 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">{groupLabel(g)}</span>
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        id: <span className="text-foreground/70">{groupID(g) || '(空)'}</span>
                      </div>
                      <div className="text-muted-foreground">
                        parentId: <span className={g.parentId ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {g.parentId || '(空)'}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        path: <span className={g.path ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {g.path || '(空)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-md border bg-muted/20 p-2">
              {/* Root node */}
              <button
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium ${
                  selection.kind === 'root'
                    ? 'bg-accent text-foreground shadow-sm ring-1 ring-violet-500/30'
                    : 'bg-muted hover:bg-accent/60'
                }`}
                onClick={handleSelectRoot}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="truncate">{rootLabel}</span>
                <Badge variant="outline" className="ml-auto text-[9px]">用户源 / Zone</Badge>
              </button>
              {groups.length > 0 || allUsers.length > 0 ? (
                <div className="flex items-center gap-1 mb-1 px-1">
                  <button onClick={expandAll} className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent/60">展开全部</button>
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <button onClick={collapseAll} className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent/60">折叠全部</button>
                  <span className="ml-auto text-[10px] text-muted-foreground/70">{expandedIds.size} 已展开</span>
                </div>
              ) : null}
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : groups.length === 0 && allUsers.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无组织和成员</div>
              ) : (
                <div className="max-h-[560px] overflow-y-auto pr-1">
                  <UnifiedTreeRows
                    parentId=""
                    depth={0}
                    childrenMap={childrenMap}
                    groupUsersMap={groupUsersMap}
                    selection={selection}
                    onSelectGroup={handleSelectGroup}
                    onSelectUser={handleSelectUser}
                    expandedIds={expandedIds}
                    onToggle={toggleExpand}
                  />
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                加载组织结构失败：{error instanceof Error ? error.message : 'unknown error'}
              </div>
            ) : null}

            <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              刷新组织结构
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ═══ RIGHT: Detail panel ═══ */}
      <div className="space-y-4">
        {/* ─── ROOT selected: show all top-level groups + all users ─── */}
        {selection.kind === 'root' ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-violet-500" />
                    {rootLabel}
                  </span>
                  <Badge variant="outline" className="text-[10px]">用户源 / Zone</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  这是身份源根节点。下方显示所有顶级组织和全部成员。点击左侧树中的组织或成员查看详情。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="顶级组织" value={topLevelOrganizationCount} />
                  <Metric label="子组织" value={childOrganizationCount} />
                  <Metric label="成员总数" value={allUsers.length} />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-amber-500" />
                    顶级组织
                  </div>
                  <div className="space-y-1.5">
                    {rootGroups.length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                        暂无顶级组织。在下方"组织管理"里新建一个顶级组织开始。
                      </div>
                    ) : rootGroups.map((group) => {
                      const gid = groupID(group);
                      const path = buildGroupPath(group, groupMap, rootLabel).join(' › ');
                      return (
                        <ChildGroupCard
                          key={gid}
                          group={group}
                          path={path}
                          memberCount={groupUsersMap.get(gid)?.length || 0}
                          childCount={childrenMap.get(gid)?.length || 0}
                          onClick={() => handleSelectGroup(group)}
                        />
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <OrganizationManagementCard
              form={form}
              setForm={setForm}
              groups={groups}
              rootLabel={rootLabel}
              rootId={zoneId}
              selectedGroup={null}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onSelectRoot={handleSelectRoot}
              createPending={createGroup.isPending}
              updatePending={updateGroup.isPending}
              deletePending={deleteGroup.isPending}
            />
          </>
        ) : null}

        {/* ─── GROUP selected: show members + sub-groups + management ─── */}
        {selection.kind === 'group' ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    {childrenMap.get(selectedId)?.length ? (
                      <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <GitBranch className="h-4 w-4 text-sky-500 shrink-0" />
                    )}
                    <span className="truncate">{groupLabel(selectedGroup)}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{selection.group.type || 'no-type'}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{groups.length}</Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs">
                  <span className="text-foreground/70">当前路径：</span>
                  <span className="font-mono text-[11px]">
                    {buildGroupPath(selectedGroup, groupMap, rootLabel).map((p, i) => (
                      <span key={i}>
                        {i > 0 ? <span className="text-muted-foreground/60"> › </span> : null}
                        {p}
                      </span>
                    ))}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 成员列表 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      成员
                      <Badge variant="secondary" className="text-[9px]">{selectedGroupUsers.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {selectedGroupUsers.length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                        当前组织暂无成员。在下方"添加成员"区域选择用户加入。
                      </div>
                    ) : selectedGroupUsers.map((user) => (
                      <MemberRow
                        key={userID(user) || user.username}
                        user={user}
                        onRemove={handleRemoveUser}
                        removePending={removeUser.isPending}
                      />
                    ))}
                  </div>
                </div>

                {/* 添加成员 */}
                <div className="rounded-md border bg-muted/20 p-2.5 space-y-2">
                  <div className="text-[10px] font-medium text-muted-foreground">添加成员</div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={assignableUsers.length === 0}>
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue placeholder={assignableUsers.length === 0 ? '没有可添加的用户' : '选择要加入的用户'} />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map((user) => {
                          const id = userID(user);
                          return id ? <SelectItem key={id} value={id}>{userLabel(user)}</SelectItem> : null;
                        })}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8" disabled={!selectedUserId || assignUser.isPending} onClick={handleAssignUser}>
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      加入当前组织
                    </Button>
                  </div>
                </div>

                {/* 子组织 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5 text-amber-500" />
                      下级组织（含子级）
                      <Badge variant="secondary" className="text-[9px]">{descendantRows.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {descendantRows.length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                        暂无下级组织。在下方"组织管理"里点击"新建子组织"开始。
                      </div>
                    ) : descendantRows.map(({ group, depth }) => {
                      const gid = groupID(group);
                      const path = buildGroupPath(group, groupMap, rootLabel).join(' › ');
                      return (
                        <div key={gid} style={{ marginLeft: Math.min(depth, 4) * 8 }}>
                          <ChildGroupCard
                            group={group}
                            path={path}
                            memberCount={groupUsersMap.get(gid)?.length || 0}
                            childCount={childrenMap.get(gid)?.length || 0}
                            onClick={() => handleSelectGroup(group)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <OrganizationManagementCard
              form={form}
              setForm={setForm}
              groups={groups}
              rootLabel={rootLabel}
              rootId={zoneId}
              selectedGroup={selectedGroup}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onSelectRoot={handleSelectRoot}
              createPending={createGroup.isPending}
              updatePending={updateGroup.isPending}
              deletePending={deleteGroup.isPending}
            />
          </>
        ) : null}

        {/* ─── USER selected: show person details + group memberships ─── */}
        {selection.kind === 'user' ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserRound className="h-4 w-4 text-sky-500" />
                成员详情
              </CardTitle>
              <CardDescription className="text-xs">
                点击左侧树的其它节点切换详情。点击下方"返回所属组织"回到组织视图。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 头像 + 基本信息 */}
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 ring-2 ring-border">
                  <AvatarFallback className="bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-base font-bold text-sky-600 dark:text-sky-400">
                    {userInitial(selection.user)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate">{userLabel(selection.user)}</div>
                  {selection.user.username && selection.user.username !== userLabel(selection.user) ? (
                    <div className="text-xs text-muted-foreground font-mono truncate">@{selection.user.username}</div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">成员</Badge>
                    {selection.user.enabled === false ? (
                      <Badge variant="destructive" className="text-[10px]">已禁用</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">活跃</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 详细字段 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { label: '用户 ID', value: selection.user.id, icon: Fingerprint },
                  { label: '外部 ID', value: selection.user.externalId, icon: ExternalLink },
                  { label: '邮箱', value: selection.user.email, icon: Mail },
                  { label: '电话', value: selection.user.phone, icon: Phone },
                  { label: '用户源', value: selection.user.orgId, icon: MapPin },
                  { label: '身份提供方', value: selection.user.provider, icon: Tag },
                ].filter((item) => item.value).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-md border bg-card/40 px-2 py-1.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {item.label}
                      </div>
                      <div className="text-xs font-medium truncate font-mono" title={String(item.value)}>
                        {String(item.value)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 所属组织 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-amber-500" />
                    所属组织
                    <Badge variant="secondary" className="text-[9px]">{userGroupMemberships.length}</Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {userGroupMemberships.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      该成员当前未归属任何组织。可在左侧树的组织节点详情里"添加成员"。
                    </div>
                  ) : userGroupMemberships.map((group) => {
                    const gid = groupID(group);
                    const path = buildGroupPath(group, groupMap, rootLabel).join(' › ');
                    return (
                      <ChildGroupCard
                        key={gid}
                        group={group}
                        path={path}
                        memberCount={groupUsersMap.get(gid)?.length || 0}
                        childCount={childrenMap.get(gid)?.length || 0}
                        onClick={() => handleSelectGroup(group)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 角色列表 */}
              {selection.user.roles && selection.user.roles.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">角色</div>
                  <div className="flex flex-wrap gap-1">
                    {selection.user.roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-[10px]">{role}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 操作 */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const parentGroup = groupMap.get(selection.groupId);
                    if (parentGroup) {
                      handleSelectGroup(parentGroup);
                    } else {
                      handleSelectRoot();
                    }
                  }}
                >
                  <Folder className="mr-1 h-3.5 w-3.5" />
                  返回所属组织
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSelectRoot}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  回到用户源根节点
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ─── Confirmation dialogs ─── */}
      <AlertDialog open={!!pendingMove} onOpenChange={(v) => !v && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移动组织</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                将「{pendingMove?.groupName}」移动到「{pendingMove?.parentName}」下
                {pendingMove?.parentName === '顶级（无父级）' ? '' : '作为子组织'}？
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>
              确认移动
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除组织</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                确定删除「{pendingDelete?.groupName}」？此操作不可撤销。
                <br />
                若该组织下存在子组织或成员，删除将失败（需先清空下级）。
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Reusable: Organization management card (form + actions) ───────────
function OrganizationManagementCard({
  form,
  setForm,
  groups,
  rootLabel,
  rootId,
  selectedGroup,
  onCreate,
  onUpdate,
  onDelete,
  onSelectRoot,
  createPending,
  updatePending,
  deletePending,
}: {
  form: OrganizationForm;
  setForm: (form: OrganizationForm) => void;
  groups: IamGroup[];
  rootLabel: string;
  rootId: string;
  selectedGroup: IamGroup | null;
  onCreate: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onSelectRoot: () => void;
  createPending: boolean;
  updatePending: boolean;
  deletePending: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            组织管理
          </span>
          <Badge variant="secondary">{groups.length}</Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {selectedGroup
            ? `编辑 ${groupLabel(selectedGroup)} 或在它下面新建子组织。也可以在"父级组织"下拉里调整层级。`
            : '未选中组织时，新建的是顶级组织；选中左侧树中的组织后，可在它下面新建子组织。'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">组织名称 *</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" placeholder="platform" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">显示名</label>
          <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-8 text-xs" placeholder="平台组织" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">组织类型</label>
          <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-8 text-xs" placeholder="Physical" />
        </div>
        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CornerDownRight className="h-3 w-3" />
            父级组织
            <span className="text-[10px] text-muted-foreground/70">
              （留空 = 顶级组织；选中组织后默认填入当前选中组织，可手动改）
            </span>
          </label>
          <GroupTreePicker
            groups={groups}
            rootLabel={rootLabel}
            rootId={rootId}
            value={form.parentId}
            onChange={(v) => setForm({ ...form, parentId: v })}
            excludeId={selectedGroup ? groupID(selectedGroup) : undefined}
            placeholder={selectedGroup
              ? `继承当前选中组织: ${groupLabel(selectedGroup)}`
              : '（顶级组织，无父级）'}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <Button size="sm" className="h-8" onClick={onCreate} disabled={createPending}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {form.parentId || selectedGroup ? '新建子组织' : '新建顶级组织'}
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={onUpdate} disabled={!selectedGroup || updatePending}>
            <Save className="mr-1 h-3.5 w-3.5" />
            更新选中组织
          </Button>
          <Button size="sm" variant="destructive" className="h-8" onClick={onDelete} disabled={!selectedGroup || deletePending}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            删除选中组织
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={onSelectRoot}>
            <X className="mr-1 h-3.5 w-3.5" />
            回到用户源根节点
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card/50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

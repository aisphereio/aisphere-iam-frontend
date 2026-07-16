import type { IamGroup, IamUser } from '@/lib/api/types';

export type OrganizationPathItem =
  | { kind: 'root'; id: string; label: string }
  | { kind: 'group'; id: string; label: string; group: IamGroup };

export function groupId(group?: IamGroup | null): string {
  return group?.id || group?.externalId || group?.name || '';
}

export function userId(user?: IamUser | null): string {
  return user?.id || user?.externalId || user?.username || '';
}

export function userLabel(user?: IamUser | null): string {
  if (!user) return '';
  return user.displayName || user.username || user.email || user.id || user.externalId || '';
}

export function userInitial(user?: IamUser | null): string {
  const label = userLabel(user);
  return label ? label.charAt(0).toUpperCase() : '?';
}

export function groupLabel(group?: IamGroup | null): string {
  if (!group) return '';
  return group.displayName || group.name || group.id || '';
}

export function parentKey(group: IamGroup, userSourceId: string): string {
  const parent = group.parentId?.trim();
  return (!parent || parent === userSourceId) ? '' : parent;
}

export function isTopLevelOrganization(group: IamGroup, userSourceId: string): boolean {
  return parentKey(group, userSourceId) === '';
}

export function buildChildrenMap(groups: IamGroup[], userSourceId: string): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  for (const group of groups) {
    const parent = parentKey(group, userSourceId);
    const bucket = map.get(parent) || [];
    bucket.push(group);
    map.set(parent, bucket);
  }
  for (const bucket of map.values()) bucket.sort((left, right) => groupLabel(left).localeCompare(groupLabel(right)));
  return map;
}

export function buildGroupMap(groups: IamGroup[]): Map<string, IamGroup> {
  const map = new Map<string, IamGroup>();
  for (const group of groups) {
    const id = groupId(group);
    if (id) map.set(id, group);
    // Also index by name so lookups by Casdoor parentId (which is the parent's
    // name, not its UUID id) resolve correctly.
    if (group.name && group.name !== id) map.set(group.name, group);
  }
  return map;
}

export function buildOrganizationPath(
  group: IamGroup | null,
  groupMap: Map<string, IamGroup>,
  root: { id: string; label: string },
): OrganizationPathItem[] {
  if (!group) return [{ kind: 'root', ...root }];
  const path: OrganizationPathItem[] = [];
  const seen = new Set<string>();
  let current: IamGroup | undefined = group;
  while (current) {
    const id = groupId(current);
    if (!id || seen.has(id)) break;
    seen.add(id);
    path.unshift({ kind: 'group', id, label: groupLabel(current), group: current });
    current = current.parentId ? groupMap.get(current.parentId) : undefined;
  }
  return [{ kind: 'root', ...root }, ...path];
}

export function buildGroupPath(group: IamGroup | null, groupMap: Map<string, IamGroup>, rootLabel: string): string[] {
  return buildOrganizationPath(group, groupMap, { id: 'root', label: rootLabel }).map((item) => item.label);
}

export function collectDescendants(
  selectedGroupId: string,
  childrenMap: Map<string, IamGroup[]>,
): Array<{ group: IamGroup; depth: number }> {
  const descendants: Array<{ group: IamGroup; depth: number }> = [];
  const seen = new Set<string>();
  const stack: Array<{ id: string; depth: number }> = [{ id: selectedGroupId, depth: 0 }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    for (const child of childrenMap.get(current.id) || []) {
      descendants.push({ group: child, depth: current.depth + 1 });
      stack.push({ id: groupId(child), depth: current.depth + 1 });
    }
  }
  return descendants;
}

export function collectDescendantIds(selectedGroupId: string, childrenMap: Map<string, IamGroup[]>): Set<string> {
  return new Set(collectDescendants(selectedGroupId, childrenMap).map(({ group }) => groupId(group)).filter(Boolean));
}

export function buildGroupUsersMap(
  groups: IamGroup[],
  userById: Map<string, IamUser>,
  allUsers: IamUser[],
): Map<string, IamUser[]> {
  const map = new Map<string, IamUser[]>();
  for (const group of groups) {
    const id = groupId(group);
    if (!id) continue;
    const members: IamUser[] = [];
    for (const memberId of group.users || []) {
      const user = userById.get(memberId);
      if (user && !members.includes(user)) members.push(user);
    }
    map.set(id, members);
  }
  for (const user of allUsers) {
    for (const id of user.groups || []) {
      const members = map.get(id) || [];
      if (!members.includes(user)) {
        members.push(user);
        map.set(id, members);
      }
    }
  }
  return map;
}

/**
 * Build the reverse map: userId → IamGroup[] (the groups a user belongs to).
 *
 * Mirrors {@link buildGroupUsersMap} in being bidirectional and alias-aware:
 * - Direction 1: Group.users[] entries are resolved through the alias-keyed
 *   userById map (Casdoor may store usernames, not canonical IDs).
 * - Direction 2: User.groups[] entries are resolved through groupMap (which
 *   also catches groups whose .users wasn't populated by the backend).
 *
 * Both directions are merged and de-duplicated so the result is reliable
 * regardless of which side the backend populated.
 */
export function buildUserGroupsMap(
  groups: IamGroup[],
  userById: Map<string, IamUser>,
  allUsers: IamUser[],
  groupMap: Map<string, IamGroup>,
): Map<string, IamGroup[]> {
  const map = new Map<string, IamGroup[]>();
  // Direction 1: Group.users → resolve member via alias map.
  for (const group of groups) {
    const gid = groupId(group);
    if (!gid) continue;
    for (const memberId of group.users || []) {
      const user = userById.get(memberId);
      if (!user) continue;
      const uid = userId(user);
      if (!uid) continue;
      const list = map.get(uid) || [];
      if (!list.some((g) => groupId(g) === gid)) {
        list.push(group);
        map.set(uid, list);
      }
    }
  }
  // Direction 2: User.groups → resolve group via groupMap.
  for (const user of allUsers) {
    const uid = userId(user);
    if (!uid) continue;
    for (const gid of user.groups || []) {
      const group = groupMap.get(gid);
      if (!group) continue;
      const list = map.get(uid) || [];
      if (!list.some((g) => groupId(g) === groupId(group))) {
        list.push(group);
        map.set(uid, list);
      }
    }
  }
  return map;
}

export function summarizeOrganization(
  group: IamGroup,
  childrenMap: Map<string, IamGroup[]>,
  groupUsersMap: Map<string, IamUser[]>,
) {
  const id = groupId(group);
  return {
    directMembers: groupUsersMap.get(id)?.length || 0,
    directChildren: childrenMap.get(id)?.length || 0,
    allDescendants: collectDescendants(id, childrenMap).length,
  };
}

export function searchDirectory(query: string, groups: IamGroup[], users: IamUser[]) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return { groups: [], users: [] };
  const includes = (...values: Array<string | undefined>) => values
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase().includes(normalized));
  return {
    groups: groups.filter((group) => includes(groupLabel(group), group.name, group.id, group.path, group.type)),
    users: users.filter((user) => includes(userLabel(user), user.username, user.email, user.phone, user.id, user.externalId)),
  };
}

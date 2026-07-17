import { describe, expect, it } from 'vitest';
import type { IamGroup, IamUser } from '@/lib/api/types';
import {
  buildChildrenMap,
  buildGroupMap,
  buildGroupUsersMap,
  buildOrganizationPath,
  buildUserGroupsMap,
  resolveGroupReferences,
  resolveUserGroupReferences,
  searchDirectory,
  summarizeOrganization,
} from './organization-workbench-model';

const groups: IamGroup[] = [
  { id: 'engineering', name: 'engineering', displayName: '工程中心', parentId: 'aisphere', users: ['alice'] },
  { id: 'platform', name: 'platform', displayName: '平台研发', parentId: 'engineering', users: ['bob'] },
  { id: 'runtime', name: 'runtime', displayName: '运行时', parentId: 'platform' },
];

const users: IamUser[] = [
  { id: 'alice', username: 'alice', displayName: 'Alice' },
  { id: 'bob', username: 'bob', displayName: 'Bob', groups: ['engineering'] },
];

describe('organization workbench model', () => {
  it('builds a clickable path from the directory root to the selected group', () => {
    const path = buildOrganizationPath(groups[1], buildGroupMap(groups), {
      id: 'aisphere',
      label: 'Aisphere',
    });

    expect(path.map((item) => [item.kind, item.id, item.label])).toEqual([
      ['root', 'aisphere', 'Aisphere'],
      ['group', 'engineering', '工程中心'],
      ['group', 'platform', '平台研发'],
    ]);
  });

  it('summarizes the selected scope without confusing direct members and descendants', () => {
    const childrenMap = buildChildrenMap(groups, 'aisphere');
    const userById = new Map(users.map((user) => [user.id, user]));
    const groupUsersMap = buildGroupUsersMap(groups, userById, users);

    expect(summarizeOrganization(groups[0], childrenMap, groupUsersMap)).toEqual({
      directMembers: 2,
      directChildren: 1,
      allDescendants: 2,
    });
  });

  it('searches organizations and members using names, identifiers, and email', () => {
    expect(searchDirectory('ping tai', groups, users).groups).toHaveLength(0);
    expect(searchDirectory('platform', groups, users).groups.map((group) => group.id)).toEqual(['platform']);
    expect(searchDirectory('alice', groups, users).users.map((user) => user.id)).toEqual(['alice']);
    expect(searchDirectory('ALICE', groups, [{ ...users[0], email: 'alice@example.com' }]).users).toHaveLength(1);
  });
});

describe('buildUserGroupsMap', () => {
  // Alias-keyed map that mirrors what groups-page.tsx builds (keys by all of
  // id, externalId, username so Casdoor usernames in group.users resolve).
  function aliasMap(list: IamUser[]): Map<string, IamUser> {
    const m = new Map<string, IamUser>();
    for (const u of list) {
      for (const key of [u.id, u.externalId, u.username]) {
        if (key) m.set(key, u);
      }
    }
    return m;
  }

  it('resolves membership when group.users holds usernames but user.id is canonical', () => {
    // Casdoor often stores the login "name" in group.users, while the
    // canonical user object has a different id.  The naive .includes(uid)
    // check would miss this — the alias map must bridge the gap.
    const groups: IamGroup[] = [
      { id: 'engineering', name: 'engineering', users: ['alice_name'] },
    ];
    const users: IamUser[] = [
      { id: 'uuid-alice', username: 'alice_name', displayName: 'Alice' },
    ];
    const map = buildUserGroupsMap(groups, aliasMap(users), users, buildGroupMap(groups));
    expect(map.get('uuid-alice')?.map((g) => g.id)).toEqual(['engineering']);
  });

  it('picks up groups listed only in user.groups (reverse direction)', () => {
    const groups: IamGroup[] = [
      { id: 'platform', name: 'platform', users: [] },
    ];
    const users: IamUser[] = [
      { id: 'bob', username: 'bob', groups: ['platform'] },
    ];
    const map = buildUserGroupsMap(groups, aliasMap(users), users, buildGroupMap(groups));
    expect(map.get('bob')?.map((g) => g.id)).toEqual(['platform']);
  });

  it('resolves a legacy membership slug through the group external ID', () => {
    const groups: IamGroup[] = [
      { id: 'grp_stable', externalId: 'engineering', name: 'grp_stable', displayName: '工程中心' },
    ];
    const users: IamUser[] = [
      { id: 'alice', username: 'alice', groups: ['engineering'] },
    ];
    const map = buildUserGroupsMap(groups, aliasMap(users), users, buildGroupMap(groups));
    expect(map.get('alice')?.map((g) => g.id)).toEqual(['grp_stable']);
  });

  it('merges both directions without duplicates for a multi-group user', () => {
    const groups: IamGroup[] = [
      { id: 'engineering', name: 'engineering', users: ['alice'] },
      { id: 'platform', name: 'platform', users: [] },
      { id: 'runtime', name: 'runtime', users: ['alice'] },
    ];
    const users: IamUser[] = [
      { id: 'alice', username: 'alice', groups: ['platform'] },
    ];
    const map = buildUserGroupsMap(groups, aliasMap(users), users, buildGroupMap(groups));
    // engineering + runtime from group.users, platform from user.groups
    expect(map.get('alice')?.map((g) => g.id).sort()).toEqual(['engineering', 'platform', 'runtime']);
  });

  it('returns empty for a user with no memberships', () => {
    const groups: IamGroup[] = [{ id: 'engineering', name: 'engineering', users: ['alice'] }];
    const users: IamUser[] = [
      { id: 'alice', username: 'alice' },
      { id: 'carol', username: 'carol' },
    ];
    const map = buildUserGroupsMap(groups, aliasMap(users), users, buildGroupMap(groups));
    expect(map.get('carol')).toBeUndefined();
  });
});

describe('resolveGroupReferences', () => {
  it('returns display labels for known groups and preserves stale references explicitly', () => {
    const groups: IamGroup[] = [
      { id: 'grp_stable', externalId: 'engineering', name: 'grp_stable', displayName: '工程中心' },
    ];

    expect(resolveGroupReferences(['engineering', 'deleted-team'], buildGroupMap(groups))).toEqual([
      { reference: 'engineering', label: '工程中心', group: groups[0], resolved: true },
      { reference: 'deleted-team', label: 'deleted-team', resolved: false },
    ]);
  });

  it('shows the actual organization from group members when the user alias is stale', () => {
    const groups: IamGroup[] = [
      { id: 'grp_stable', name: 'grp_stable', displayName: 'Engineering', users: ['alice'] },
    ];
    const users: IamUser[] = [
      { id: 'alice', username: 'alice', groups: ['legacy-engineering'] },
    ];
    const groupMap = buildGroupMap(groups);
    const userGroupsMap = buildUserGroupsMap(groups, new Map([['alice', users[0]]]), users, groupMap);

    expect(resolveUserGroupReferences(users[0], groupMap, userGroupsMap)).toEqual([
      { reference: 'grp_stable', label: 'Engineering', group: groups[0], resolved: true },
      { reference: 'legacy-engineering', label: 'legacy-engineering', resolved: false },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import type { IamGroup, IamUser } from '@/lib/api/types';
import {
  buildChildrenMap,
  buildGroupMap,
  buildGroupUsersMap,
  buildOrganizationPath,
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

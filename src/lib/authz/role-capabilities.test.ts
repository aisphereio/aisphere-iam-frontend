import { describe, expect, it } from 'vitest';
import type { IamResourceType } from '@/lib/api/types';
import { capabilitiesForResourceType, invalidRoleCapabilities, roleScopeDescription } from './role-capabilities';

const resourceTypes: IamResourceType[] = [
  {
    type: 'skill',
    displayName: 'Skill',
    grantable: true,
    permissions: ['manage', 'edit', 'review', 'publish', 'view'],
    relations: ['owner', 'editor', 'reviewer', 'viewer', 'custom_binding'],
  },
  {
    type: 'deployment',
    displayName: 'Deployment',
    grantable: true,
    permissions: ['manage', 'operate', 'view'],
    relations: ['owner', 'operator', 'viewer', 'custom_binding'],
  },
];

describe('role capabilities', () => {
  it('returns only the selected resource type capabilities', () => {
    expect(capabilitiesForResourceType(resourceTypes, 'skill').map((item) => item.key)).toEqual([
      'view',
      'edit',
      'review',
      'publish',
      'manage',
    ]);
  });

  it('rejects capabilities that do not belong to the resource type', () => {
    expect(invalidRoleCapabilities(resourceTypes, 'skill', ['view', 'operate', 'view'])).toEqual(['operate']);
  });

  it('explains direct and inherited administrator scopes', () => {
    expect(roleScopeDescription('zone_admin')).toContain('组织')
    expect(roleScopeDescription('group_manager')).toContain('直属')
  });
});

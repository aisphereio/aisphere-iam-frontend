import { afterEach, describe, expect, it, vi } from 'vitest';
import { iamGrantService, iamResourceService } from './index';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generated control-plane response normalization', () => {
  it('normalizes snake_case role template replies', async () => {
    mockJsonResponse({
      role_templates: [{
        id: 'skill_reviewer',
        resource_type: 'skill',
        role_key: 'reviewer',
        display_name: 'Skill Reviewer',
        relation: 'reviewer',
        built_in: true,
        enabled: true,
        sort_order: 30,
        permissions: ['review', 'view'],
        active_grant_count: 4,
        version: 2,
      }],
    });

    await expect(iamGrantService.listRoleTemplates()).resolves.toEqual({
      roleTemplates: [{
        id: 'skill_reviewer',
        resourceType: 'skill',
        roleKey: 'reviewer',
        displayName: 'Skill Reviewer',
        description: undefined,
        relation: 'reviewer',
        builtIn: true,
        enabled: true,
        sortOrder: 30,
        permissions: ['review', 'view'],
        activeGrantCount: 4,
        version: 2,
        metadata: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      }],
    });
  });

  it('normalizes snake_case resource type replies used by the role editor', async () => {
    mockJsonResponse({
      resource_types: [{
        type: 'skill',
        capability_id: 'hub',
        owner_service: 'aisphere-hub',
        parent_types: ['skill_space'],
        grantable: true,
        auditable: true,
        spicedb_type: 'skill',
        relations: ['owner', 'reviewer', 'custom_binding'],
        permissions: ['manage', 'review', 'view'],
        status: 'active',
      }],
    });

    await expect(iamResourceService.listResourceTypes()).resolves.toEqual({
      resourceTypes: [{
        type: 'skill',
        capabilityId: 'hub',
        ownerService: 'aisphere-hub',
        displayName: undefined,
        description: undefined,
        parentTypes: ['skill_space'],
        grantable: true,
        auditable: true,
        spicedbType: 'skill',
        relations: ['owner', 'reviewer', 'custom_binding'],
        permissions: ['manage', 'review', 'view'],
        labels: undefined,
        metadata: undefined,
        status: 'active',
        createdAt: undefined,
        updatedAt: undefined,
      }],
    });
  });
});

function mockJsonResponse(body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })));
}

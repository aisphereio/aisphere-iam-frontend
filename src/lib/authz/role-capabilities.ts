import type { IamResourceType } from '@/lib/api/types';
import { permissionLabel, resourceLabel } from '@/lib/authz/schema-summary';

export interface RoleCapabilityOption {
  key: string;
  label: string;
  category: 'read' | 'operate' | 'manage';
  description: string;
}

export const CAPABILITY_ORDER = [
  'view_zone',
  'view_users',
  'view_groups',
  'view_permissions',
  'view',
  'read',
  'list',
  'edit',
  'write',
  'review',
  'publish',
  'operate',
  'execute',
  'deploy',
  'create_groups',
  'create_child_groups',
  'manage_members',
  'manage_users',
  'manage_groups',
  'manage_permissions',
  'manage',
  'admin',
];

export function capabilitiesForResourceType(
  resourceTypes: IamResourceType[] | undefined,
  resourceType: string,
): RoleCapabilityOption[] {
  const item = (resourceTypes || []).find((candidate) => candidate.type === resourceType || candidate.spicedbType === resourceType);
  const permissions = [...new Set(item?.permissions || [])];
  return permissions
    .map((key) => ({
      key,
      label: permissionLabel(key),
      category: capabilityCategory(key),
      description: capabilityDescription(key),
    }))
    .sort((left, right) => capabilityIndex(left.key) - capabilityIndex(right.key));
}

export function invalidRoleCapabilities(
  resourceTypes: IamResourceType[] | undefined,
  resourceType: string,
  permissions: string[],
): string[] {
  const allowed = new Set(capabilitiesForResourceType(resourceTypes, resourceType).map((item) => item.key));
  return [...new Set(permissions.map((item) => item.trim()).filter(Boolean))]
    .filter((permission) => !allowed.has(permission))
    .sort();
}

export function roleScopeDescription(roleKey: string, resourceType?: string): string {
  if (roleKey.startsWith('platform_')) return '平台直属角色，可通过根作用域继承到所有组织和控制面资源。';

  // 根据 resourceType + roleKey 精确判断
  if (resourceType) {
    if (roleKey === 'owner') {
      const ownerMap: Record<string, string> = {
        zone: '组织所有者，拥有组织全部管理权限。',
        project: '项目所有者，拥有项目全部管理权限。',
        skill: 'Skill 所有者，拥有该 Skill 全部管理权限。',
        skill_space: 'Skill 空间所有者，拥有该空间全部管理权限。',
        git_repository: '仓库所有者，拥有该仓库全部管理权限。',
        git_namespace: '命名空间所有者，拥有该命名空间全部管理权限。',
        agent: 'Agent 所有者，拥有该 Agent 全部管理权限。',
        agent_space: 'Agent 空间所有者，拥有该空间全部管理权限。',
        tool: '工具所有者，拥有该工具全部管理权限。',
        tool_space: '工具空间所有者，拥有该空间全部管理权限。',
        sandbox: '沙箱所有者，拥有该沙箱全部管理权限。',
        sandbox_space: '沙箱空间所有者，拥有该空间全部管理权限。',
        runtime_environment: '运行环境所有者，拥有该环境全部管理权限。',
        deployment: '部署所有者，拥有该部署全部管理权限。',
      };
      return ownerMap[resourceType] || `${resourceLabel(resourceType)}所有者，拥有该资源全部管理权限。`;
    }
    if (roleKey === 'admin') {
      return resourceType === 'zone'
        ? '组织管理员，管理组织内用户、用户组和权限。'
        : `${resourceLabel(resourceType)}管理员，管理该资源及下级资源。`;
    }
  }

  // fallback：按 roleKey 前缀判断
  if (roleKey.startsWith('zone_') || roleKey === 'owner' || roleKey === 'admin') {
    return '组织直属角色，通过组织作用域管理其用户、用户组和下级资源。';
  }
  if (roleKey.includes('group')) return '用户组直属角色，只管理当前组及其下级组，不会成为组织管理员。';
  return '资源直属角色，只在被分配的具体资源上生效。';
}

export function permissionCategoryOf(key: string): RoleCapabilityOption['category'] {
  return capabilityCategory(key);
}

function capabilityCategory(key: string): RoleCapabilityOption['category'] {
  if (/^(view|read|list)/.test(key)) return 'read';
  if (/^(review|publish|operate|execute|deploy|edit|write)/.test(key)) return 'operate';
  return 'manage';
}

function capabilityDescription(key: string): string {
  const label = permissionLabel(key);
  if (capabilityCategory(key) === 'read') return `允许${label}，不会修改资源。`;
  if (capabilityCategory(key) === 'operate') return `允许执行“${label}”对应的业务操作。`;
  return `允许进行“${label}”范围内的管理。`;
}

function capabilityIndex(key: string): number {
  const index = CAPABILITY_ORDER.indexOf(key);
  return index === -1 ? CAPABILITY_ORDER.length : index;
}

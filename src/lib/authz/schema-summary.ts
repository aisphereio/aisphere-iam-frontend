import type { IamResourceType, IamRoleTemplate } from '@/lib/api/types';

export interface FriendlyPermission {
  key: string;
  label: string;
  expression?: string;
  description: string;
}

export interface FriendlyRelation {
  key: string;
  label: string;
  description: string;
}

export interface FriendlyRoleTemplate {
  roleKey: string;
  label: string;
  relation?: string;
  description?: string;
}

export interface FriendlyResourceModel {
  type: string;
  label: string;
  description: string;
  source: 'control-plane' | 'schema';
  relations: FriendlyRelation[];
  permissions: FriendlyPermission[];
  roles: FriendlyRoleTemplate[];
}

const RESOURCE_LABELS: Record<string, string> = {
  zone: '组织空间',
  group: '用户组',
  iam_authz: '权限控制台',
  iam: 'IAM 管理资源',
  organization: '组织',
  project: '项目',
  skill_space: 'Skill 空间',
  skill: 'Skill',
  git_namespace: 'Git 命名空间',
  git_repository: 'Git 仓库',
  agent_space: 'Agent 空间',
  agent: 'Agent',
  tool_space: '工具空间',
  tool: '工具',
  sandbox_space: '沙箱空间',
  sandbox: '沙箱',
  runtime_environment: '运行环境',
  deployment: '部署实例',
};

const RESOURCE_DESCRIPTIONS: Record<string, string> = {
  zone: '租户级根资源，用于管理本地用户、用户组和权限。',
  group: '用户集合，可作为授权主体，也可作为可管理资源。',
  iam_authz: '用于维护 SpiceDB schema、relationship 和权限诊断的全局管理资源。',
  organization: '平台组织资源。',
  project: '组织下的项目资源。',
  skill_space: '项目下的 Skill 管理空间。',
  skill: '具体 Skill 资源。',
  git_namespace: '项目下的 Git 命名空间。',
  git_repository: '具体 Git 仓库资源。',
  agent_space: '项目下的 Agent 管理空间。',
  agent: '具体 Agent 资源。',
  tool_space: '项目下的工具管理空间。',
  tool: '具体工具资源。',
  sandbox_space: '项目下的沙箱管理空间。',
  sandbox: '具体沙箱资源。',
  runtime_environment: '运行环境资源。',
  deployment: '部署实例资源。',
};

const RELATION_LABELS: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
  parent: '上级资源',
  zone: '所属组织空间',
  manager: '管理者',
  viewer: '查看者',
  editor: '编辑者',
  developer: '开发者',
  operator: '运维者',
  executor: '执行者',
  reviewer: '审核者',
  maintainer: '维护者',
  writer: '写入者',
  reader: '读取者',
  user_viewer: '用户查看员',
  user_manager: '用户管理员',
  group_viewer: '用户组查看员',
  group_manager: '用户组管理员',
  permission_admin: '权限管理员',
  schema_admin: 'Schema 管理员',
  auditor: '审计员',
  backing_skill: '关联 Skill',
  runs_agent: '运行 Agent',
  deployer: '部署者',
};

const PERMISSION_LABELS: Record<string, string> = {
  view_zone: '查看组织空间',
  view_users: '查看用户',
  manage_users: '管理用户',
  view_groups: '查看用户组',
  create_groups: '创建用户组',
  manage_groups: '管理用户组',
  view_permissions: '查看权限',
  manage_permissions: '管理权限',
  view_schema: '查看权限模型',
  publish_schema: '发布权限模型',
  view_relationships: '查看授权关系',
  repair_relationships: '修复授权关系',
  create_child_groups: '创建子用户组',
  manage_members: '管理成员',
  manage: '管理',
  edit: '编辑',
  view: '查看',
  read: '读取',
  write: '写入',
  admin: '管理',
  operate: '操作',
  execute: '执行',
  deploy: '部署',
  publish: '发布',
  review: '审核',
  list: '列表查看',
  create: '创建',
  delete: '删除',
  grant: '授权',
  revoke: '撤销授权',
  explain: '解释权限',
  upsert: '创建或更新',
  bind: '绑定',
  unbind: '解绑',
  move: '移动',
  archive: '归档',
  create_project: '创建项目',
};

export function resourceLabel(type: string, displayName?: string): string {
  return displayName || RESOURCE_LABELS[type] || humanizeKey(type);
}

export function relationLabel(key: string): string {
  return RELATION_LABELS[key] || humanizeKey(key);
}

export function permissionLabel(key: string): string {
  return PERMISSION_LABELS[key] || humanizeKey(key);
}

export function resourceDescription(type: string, description?: string): string {
  return description || RESOURCE_DESCRIPTIONS[type] || '平台资源类型。';
}

export function buildFriendlyResourceModels(
  resourceTypes: IamResourceType[] | undefined,
  roleTemplates: IamRoleTemplate[] | undefined,
  schemaText: string,
): FriendlyResourceModel[] {
  const fromControlPlane = (resourceTypes || [])
    .map((rt) => {
      const type = rt.spicedbType || rt.type;
      if (!type) return null;
      const roles = (roleTemplates || [])
        .filter((role) => role.resourceType === rt.type || role.resourceType === type)
        .map((role) => ({
          roleKey: role.roleKey,
          label: role.displayName || humanizeKey(role.roleKey),
          relation: role.relation,
          description: role.description,
        }));
      return {
        type,
        label: resourceLabel(type, rt.displayName),
        description: resourceDescription(type, rt.description),
        source: 'control-plane' as const,
        relations: (rt.relations || []).map((key) => ({ key, label: relationLabel(key), description: relationDescription(key) })),
        permissions: (rt.permissions || []).map((key) => ({ key, label: permissionLabel(key), description: permissionDescription(key) })),
        roles,
      };
    })
    .filter(Boolean) as FriendlyResourceModel[];

  if (fromControlPlane.length > 0) {
    return sortResources(fromControlPlane);
  }

  return sortResources(parseSchemaText(schemaText));
}

export function parseSchemaText(text: string): FriendlyResourceModel[] {
  if (!text.trim()) return [];
  const out: FriendlyResourceModel[] = [];
  const definitionRegex = /definition\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;
  while ((match = definitionRegex.exec(text)) !== null) {
    const [, type, body] = match;
    const relations: FriendlyRelation[] = [];
    const permissions: FriendlyPermission[] = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      const relationMatch = line.match(/^relation\s+([A-Za-z0-9_]+)\s*:/);
      if (relationMatch) {
        const key = relationMatch[1];
        relations.push({ key, label: relationLabel(key), description: relationDescription(key) });
      }
      const permissionMatch = line.match(/^permission\s+([A-Za-z0-9_]+)\s*=\s*(.+)$/);
      if (permissionMatch) {
        const key = permissionMatch[1];
        permissions.push({
          key,
          label: permissionLabel(key),
          expression: permissionMatch[2],
          description: permissionDescription(key, permissionMatch[2]),
        });
      }
    }
    out.push({
      type,
      label: resourceLabel(type),
      description: resourceDescription(type),
      source: 'schema',
      relations,
      permissions,
      roles: [],
    });
  }
  return out;
}

export function expressionToFriendlyText(expression?: string): string {
  if (!expression) return '由后端资源模型定义。';
  const parts = expression.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return expression;
  return parts.map((part) => {
    const inherited = part.match(/^([A-Za-z0-9_]+)->([A-Za-z0-9_]+)$/);
    if (inherited) {
      return `继承「${relationLabel(inherited[1])}」的「${permissionLabel(inherited[2])}」`;
    }
    return `拥有「${relationLabel(part)}」关系`;
  }).join('，或');
}

function relationDescription(key: string): string {
  switch (key) {
    case 'owner':
      return '资源最高负责人，通常拥有全部管理权限。';
    case 'admin':
      return '资源管理员，通常拥有管理权限。';
    case 'member':
      return '资源普通成员。';
    case 'viewer':
    case 'reader':
    case 'user_viewer':
    case 'group_viewer':
      return '只读查看类角色。';
    case 'manager':
    case 'user_manager':
    case 'group_manager':
    case 'permission_admin':
    case 'schema_admin':
      return '管理类角色。';
    case 'parent':
    case 'zone':
      return '用于继承上级资源权限。';
    default:
      return '可被授予或用于权限继承的关系。';
  }
}

function permissionDescription(key: string, expression?: string): string {
  if (expression) return expressionToFriendlyText(expression);
  if (key.startsWith('view') || key === 'read' || key === 'list') return '允许查看资源或列表。';
  if (key.startsWith('manage') || key === 'admin') return '允许管理资源。';
  if (key === 'write' || key === 'edit') return '允许修改资源。';
  if (key === 'execute' || key === 'operate') return '允许执行或操作资源。';
  return '资源上的可检查权限。';
}

function humanizeKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sortResources(resources: FriendlyResourceModel[]): FriendlyResourceModel[] {
  const order = ['zone', 'group', 'iam_authz', 'organization', 'project'];
  return [...resources].sort((a, b) => {
    const ai = order.indexOf(a.type);
    const bi = order.indexOf(b.type);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.type.localeCompare(b.type);
  });
}

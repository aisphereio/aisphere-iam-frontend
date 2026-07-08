import type { IamResourceType, IamRoleTemplate } from '@/lib/api/types';

export interface FriendlyPermission {
  key: string;
  label: string;
  expression?: string;
  description: string;
  sources: string[];
  inherited: string[];
}

export interface FriendlyRelation {
  key: string;
  label: string;
  description: string;
  targets?: string;
  inherited?: boolean;
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
  source: 'control-plane' | 'schema' | 'merged';
  relations: FriendlyRelation[];
  permissions: FriendlyPermission[];
  roles: FriendlyRoleTemplate[];
  inheritedRelations: FriendlyRelation[];
}

const RESOURCE_LABELS: Record<string, string> = {
  zone: '用户源 / 身份域',
  group: '组织节点',
  iam_authz: '权限控制台',
  iam: 'IAM 管理资源',
  organization: '平台组织',
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
  zone: 'Casdoor org / identity zone 映射到 SpiceDB 的根身份域，用于管理用户、组织树和权限。',
  group: '平台组织树节点，底层由 Casdoor 多级 group 承载；既是可管理资源，也可以通过 group#member 作为授权主体。',
  iam_authz: '维护 SpiceDB schema、relationships、权限诊断和修复的全局管理资源。',
  iam: 'IAM 控制面内置资源，如组织、项目、资源类型、授权模板等。',
  organization: '平台租户组织资源，和身份域不同，是业务控制面组织。',
  project: '平台组织下的项目资源。',
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
  zone: '所属用户源',
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
  group_viewer: '组织查看员',
  group_manager: '组织管理员',
  permission_admin: '权限管理员',
  schema_admin: 'Schema 管理员',
  auditor: '审计员',
  backing_skill: '关联 Skill',
  runs_agent: '运行 Agent',
  deployer: '部署者',
};

const PERMISSION_LABELS: Record<string, string> = {
  view_zone: '查看用户源',
  view_users: '查看用户',
  manage_users: '管理用户',
  view_groups: '查看组织树',
  create_groups: '创建组织',
  manage_groups: '管理组织',
  view_permissions: '查看权限',
  manage_permissions: '管理权限',
  view_schema: '查看权限模型',
  publish_schema: '发布权限模型',
  view_relationships: '查看授权关系',
  repair_relationships: '修复授权关系',
  create_child_groups: '创建子组织',
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
  const schemaResources = parseSchemaText(schemaText);
  const schemaByType = new Map(schemaResources.map((resource) => [resource.type, resource]));

  const fromControlPlane = (resourceTypes || [])
    .map((rt) => {
      const type = rt.spicedbType || rt.type;
      if (!type) return null;
      const schema = schemaByType.get(type);
      const roles = (roleTemplates || [])
        .filter((role) => role.resourceType === rt.type || role.resourceType === type)
        .map((role) => ({
          roleKey: role.roleKey,
          label: role.displayName || humanizeKey(role.roleKey),
          relation: role.relation,
          description: role.description,
        }));
      const relations = mergeRelations(
        (rt.relations || []).map((key) => ({ key, label: relationLabel(key), description: relationDescription(key) })),
        schema?.relations || [],
      );
      const permissions = mergePermissions(
        (rt.permissions || []).map((key) => ({
          key,
          label: permissionLabel(key),
          description: permissionDescription(key),
          sources: [],
          inherited: [],
        })),
        schema?.permissions || [],
      );
      return addDerivedResourceFields({
        type,
        label: resourceLabel(type, rt.displayName),
        description: resourceDescription(type, rt.description),
        source: schema ? 'merged' as const : 'control-plane' as const,
        relations,
        permissions,
        roles,
        inheritedRelations: [],
      });
    })
    .filter(Boolean) as FriendlyResourceModel[];

  const seen = new Set(fromControlPlane.map((resource) => resource.type));
  const schemaOnly = schemaResources.filter((resource) => !seen.has(resource.type));

  return sortResources([...fromControlPlane, ...schemaOnly]);
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
      const relationMatch = line.match(/^relation\s+([A-Za-z0-9_]+)\s*:\s*(.+)$/);
      if (relationMatch) {
        const key = relationMatch[1];
        const targets = relationMatch[2].trim();
        relations.push({
          key,
          label: relationLabel(key),
          description: relationDescription(key, targets),
          targets,
          inherited: isInheritanceRelation(key),
        });
      }
      const permissionMatch = line.match(/^permission\s+([A-Za-z0-9_]+)\s*=\s*(.+)$/);
      if (permissionMatch) {
        const key = permissionMatch[1];
        const expression = permissionMatch[2].trim();
        permissions.push({
          key,
          label: permissionLabel(key),
          expression,
          description: permissionDescription(key, expression),
          sources: directPermissionSources(expression),
          inherited: inheritedPermissionSources(expression),
        });
      }
    }
    out.push(addDerivedResourceFields({
      type,
      label: resourceLabel(type),
      description: resourceDescription(type),
      source: 'schema',
      relations,
      permissions,
      roles: [],
      inheritedRelations: [],
    }));
  }
  return out;
}

export function expressionToFriendlyText(expression?: string): string {
  if (!expression) return '由后端资源模型定义。';
  const parts = splitExpression(expression);
  if (parts.length === 0) return expression;
  return parts.map((part) => friendlyExpressionPart(part)).join('，或');
}

export function directPermissionSources(expression?: string): string[] {
  return splitExpression(expression).filter((part) => !part.includes('->'));
}

export function inheritedPermissionSources(expression?: string): string[] {
  return splitExpression(expression).filter((part) => part.includes('->'));
}

function mergeRelations(controlPlane: FriendlyRelation[], schema: FriendlyRelation[]): FriendlyRelation[] {
  const byKey = new Map<string, FriendlyRelation>();
  for (const relation of schema) byKey.set(relation.key, relation);
  for (const relation of controlPlane) {
    byKey.set(relation.key, { ...byKey.get(relation.key), ...relation, targets: byKey.get(relation.key)?.targets });
  }
  return sortRelations([...byKey.values()]);
}

function mergePermissions(controlPlane: FriendlyPermission[], schema: FriendlyPermission[]): FriendlyPermission[] {
  const byKey = new Map<string, FriendlyPermission>();
  for (const permission of schema) byKey.set(permission.key, permission);
  for (const permission of controlPlane) {
    const fromSchema = byKey.get(permission.key);
    byKey.set(permission.key, {
      ...permission,
      expression: fromSchema?.expression,
      description: fromSchema?.expression ? permissionDescription(permission.key, fromSchema.expression) : permission.description,
      sources: fromSchema?.sources || [],
      inherited: fromSchema?.inherited || [],
    });
  }
  return sortPermissions([...byKey.values()]);
}

function addDerivedResourceFields(resource: FriendlyResourceModel): FriendlyResourceModel {
  return {
    ...resource,
    relations: sortRelations(resource.relations),
    permissions: sortPermissions(resource.permissions),
    inheritedRelations: sortRelations(resource.relations.filter((relation) => relation.inherited || isInheritanceRelation(relation.key))),
  };
}

function relationDescription(key: string, targets?: string): string {
  const suffix = targets ? ` 可指向：${targets}` : '';
  switch (key) {
    case 'owner':
      return `资源最高负责人，通常拥有全部管理权限。${suffix}`;
    case 'admin':
      return `资源管理员，通常拥有管理权限。${suffix}`;
    case 'member':
      return `资源普通成员，也常作为 group#member 的传递成员关系。${suffix}`;
    case 'viewer':
    case 'reader':
    case 'user_viewer':
    case 'group_viewer':
      return `只读查看类关系。${suffix}`;
    case 'manager':
    case 'user_manager':
    case 'group_manager':
    case 'permission_admin':
    case 'schema_admin':
      return `管理类关系。${suffix}`;
    case 'parent':
      return `父级资源关系，用于继承父级权限。${suffix}`;
    case 'zone':
      return `所属用户源 / 身份域关系，用于继承用户源级权限。${suffix}`;
    case 'backing_skill':
      return `关联 Skill，用于让 Git 仓库继承 Skill 的编辑/查看权限。${suffix}`;
    default:
      return `可被授予或用于权限继承的关系。${suffix}`;
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

function friendlyExpressionPart(part: string): string {
  const normalized = part.replace(/^\((.*)\)$/, '$1').trim();
  const inherited = normalized.match(/^([A-Za-z0-9_]+)->([A-Za-z0-9_]+)$/);
  if (inherited) {
    return `继承「${relationLabel(inherited[1])}」的「${permissionLabel(inherited[2])}」`;
  }
  const relationToRelation = normalized.match(/^([A-Za-z0-9_]+)#([A-Za-z0-9_]+)$/);
  if (relationToRelation) {
    return `拥有「${relationLabel(relationToRelation[1])}#${relationLabel(relationToRelation[2])}」关系`;
  }
  return `拥有「${relationLabel(normalized)}」关系`;
}

function splitExpression(expression?: string): string[] {
  if (!expression) return [];
  return expression
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}

function isInheritanceRelation(key: string): boolean {
  return ['parent', 'zone', 'backing_skill', 'runs_agent'].includes(key);
}

function humanizeKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sortResources(resources: FriendlyResourceModel[]): FriendlyResourceModel[] {
  const order = ['zone', 'group', 'iam_authz', 'iam', 'organization', 'project', 'skill_space', 'skill', 'git_namespace', 'git_repository', 'agent_space', 'agent', 'tool_space', 'tool', 'sandbox_space', 'sandbox'];
  return [...resources].sort((a, b) => {
    const ai = order.indexOf(a.type);
    const bi = order.indexOf(b.type);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.type.localeCompare(b.type);
  });
}

function sortRelations(relations: FriendlyRelation[]): FriendlyRelation[] {
  const order = ['zone', 'parent', 'backing_skill', 'owner', 'admin', 'manager', 'member', 'editor', 'developer', 'operator', 'executor', 'viewer', 'reader'];
  return [...relations].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.key.localeCompare(b.key);
  });
}

function sortPermissions(permissions: FriendlyPermission[]): FriendlyPermission[] {
  const order = ['view_zone', 'view_users', 'manage_users', 'view_groups', 'create_groups', 'manage_groups', 'manage_members', 'view_permissions', 'manage_permissions', 'view', 'read', 'list', 'write', 'edit', 'operate', 'execute', 'manage', 'admin'];
  return [...permissions].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.key.localeCompare(b.key);
  });
}

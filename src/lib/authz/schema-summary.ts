// Human-readable Chinese labels for authz resources, relations and permissions.
// Only the label lookups below are used by the access-control UI; the heavier
// SpiceDB schema-parsing helpers that used to live here were only consumed by
// the now-removed presentation.ts module.

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

function humanizeKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

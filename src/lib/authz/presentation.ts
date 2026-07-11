import type { IamGroup, IamRelationship, IamResource, IamUser } from '@/lib/api/types';
import {
  permissionLabel,
  relationLabel,
  resourceLabel,
  type FriendlyPermission,
  type FriendlyResourceModel,
} from '@/lib/authz/schema-summary';

export type PermissionCategory = 'read' | 'manage' | 'operate' | 'other';
export type ResourceCategory = 'subject' | 'identity' | 'platform' | 'asset' | 'runtime' | 'system';

export interface DirectoryOption {
  value: string;
  label: string;
  description?: string;
  type: string;
}

export interface ResourceCategoryGroup {
  key: ResourceCategory;
  label: string;
  description: string;
  resources: FriendlyResourceModel[];
}

const SUBJECT_LABELS: Record<string, string> = {
  user: '用户',
  group: '用户组 / 组织节点',
  service: '服务账号',
  service_account: '服务账号',
  agent: 'Agent',
  workload: '工作负载',
  application: '应用',
};

const MODEL_LABELS: Record<string, string> = {
  user: '用户主体',
  service: '服务账号主体',
  service_account: '服务账号主体',
  workload: '工作负载主体',
  application: '应用主体',
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  user: '代表一个具体登录用户。它通常只作为“谁获得权限”的主体，不是需要被授权访问的业务资源。',
  service: '代表后端服务或自动化任务使用的机器身份，可被授予项目、资源或操作权限。',
  service_account: '代表后端服务或自动化任务使用的机器身份，可被授予项目、资源或操作权限。',
  workload: '代表 Kubernetes 工作负载或其他运行时身份，用于服务间安全调用。',
  application: '代表一个应用身份，可作为授权主体参与平台访问控制。',
};

const RESOURCE_CATEGORY_META: Record<ResourceCategory, { label: string; description: string }> = {
  subject: {
    label: '授权主体（谁）',
    description: '用户、服务账号和工作负载等可以被授予权限的身份定义。',
  },
  identity: {
    label: '身份与组织',
    description: '用户源、用户组和组织树等身份目录资源。',
  },
  platform: {
    label: '平台控制面',
    description: '平台组织、项目、空间和通用控制面资源。',
  },
  asset: {
    label: '内容与研发资产',
    description: 'Skill、Agent、工具和 Git 仓库等可协作资产。',
  },
  runtime: {
    label: '运行与部署',
    description: '沙箱、运行环境和部署实例等运行态资源。',
  },
  system: {
    label: '系统与权限管理',
    description: 'IAM 内部资源、Schema 和授权关系管理资源。',
  },
};

const CATEGORY_ORDER: ResourceCategory[] = ['subject', 'identity', 'platform', 'asset', 'runtime', 'system'];

export function subjectTypeLabel(type?: string): string {
  if (!type) return '主体';
  return SUBJECT_LABELS[type] || humanize(type);
}

export function subjectTypeDescription(type?: string): string {
  switch (type) {
    case 'user':
      return '一个具体用户，推荐使用稳定 UUID 作为授权主体。';
    case 'group':
      return '一个用户组或组织节点；常通过 group#member 把组内成员整体授权。';
    case 'service':
    case 'service_account':
      return '供后端服务或自动化任务使用的机器身份。';
    case 'agent':
      return '代表 Agent 身份执行操作的主体。';
    case 'workload':
      return 'Kubernetes 工作负载或其他运行时机器身份。';
    default:
      return '可以被授予角色或关系的身份主体。';
  }
}

export function modelDisplayLabel(resource: FriendlyResourceModel): string {
  return MODEL_LABELS[resource.type] || resource.label || resourceLabel(resource.type);
}

export function modelDisplayDescription(resource: FriendlyResourceModel): string {
  return MODEL_DESCRIPTIONS[resource.type] || resource.description || '平台权限模型中的资源定义。';
}

export function resourceCategory(type: string): ResourceCategory {
  if (['user', 'service', 'service_account', 'workload', 'application'].includes(type)) return 'subject';
  if (['zone', 'group'].includes(type)) return 'identity';
  if (['organization', 'project', 'skill_space', 'agent_space', 'tool_space', 'sandbox_space', 'git_namespace'].includes(type)) return 'platform';
  if (['skill', 'agent', 'tool', 'git_repository'].includes(type)) return 'asset';
  if (['sandbox', 'runtime_environment', 'deployment'].includes(type)) return 'runtime';
  return 'system';
}

export function groupResources(resources: FriendlyResourceModel[]): ResourceCategoryGroup[] {
  return CATEGORY_ORDER.map((key) => ({
    key,
    ...RESOURCE_CATEGORY_META[key],
    resources: resources.filter((resource) => resourceCategory(resource.type) === key),
  })).filter((group) => group.resources.length > 0);
}

export function permissionCategory(permission: FriendlyPermission | string): PermissionCategory {
  const key = typeof permission === 'string' ? permission : permission.key;
  if (/^(view|read|list|get|lookup|explain)/.test(key)) return 'read';
  if (/^(manage|create|update|delete|write|grant|revoke|bind|unbind|move|archive|publish|repair|upsert|admin)/.test(key)) return 'manage';
  if (/^(execute|operate|deploy|run|start|stop|review)/.test(key)) return 'operate';
  return 'other';
}

export function permissionCategoryLabel(category: PermissionCategory): string {
  return {
    read: '查看与查询',
    manage: '创建与管理',
    operate: '运行与操作',
    other: '其他能力',
  }[category];
}

export function roleMeaning(relation: string): string {
  switch (relation) {
    case 'owner':
      return '最高负责人，通常拥有资源的全部管理能力。';
    case 'admin':
    case 'manager':
      return '负责日常配置、成员和权限管理。';
    case 'editor':
    case 'writer':
    case 'developer':
    case 'maintainer':
      return '可以修改资源内容，但通常不能改变所有权。';
    case 'viewer':
    case 'reader':
      return '只能查看资源，不允许修改。';
    case 'member':
      return '普通成员关系，也可用于把整个用户组作为授权主体。';
    case 'operator':
    case 'executor':
    case 'deployer':
      return '可以执行、运行或部署资源。';
    case 'auditor':
      return '可以查看授权、审计和诊断信息。';
    case 'parent':
    case 'zone':
      return '资源层级关系，用于从上级资源继承权限。';
    default:
      return '该关系可以直接授予主体，并参与权限推导。';
  }
}

export function friendlyTargets(targets?: string): string {
  if (!targets) return '由后端资源模型定义';
  return targets
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [type, relation] = part.split('#');
      return relation
        ? `${subjectTypeLabel(type)}中的${relationLabel(relation)}`
        : subjectTypeLabel(type);
    })
    .join('、');
}

export function permissionSentence(permission: FriendlyPermission): string {
  if (permission.sources.length === 0 && permission.inherited.length === 0) {
    return `${permission.label}由后端权限模型计算。`;
  }
  const direct = permission.sources.map((source) => relationLabel(source));
  const inherited = permission.inherited.map((source) => friendlyInheritanceSource(source));
  const parts: string[] = [];
  if (direct.length > 0) parts.push(`直接角色：${direct.join('、')}`);
  if (inherited.length > 0) parts.push(`继承来源：${inherited.join('、')}`);
  return parts.join('；');
}

export function friendlyInheritanceSource(source: string): string {
  const [relation, permission] = source.split('->').map((part) => part.trim());
  if (!permission) return relationLabel(relation);
  return `通过“${relationLabel(relation)}”继承上级的“${permissionLabel(permission)}”`;
}

export function userDirectoryOptions(users: IamUser[]): DirectoryOption[] {
  return users.map((user) => ({
    value: user.id,
    type: 'user',
    label: user.displayName || user.username || user.email || shortId(user.id),
    description: [user.username, user.email, shortId(user.id)].filter(Boolean).join(' · '),
  }));
}

export function groupDirectoryOptions(groups: IamGroup[]): DirectoryOption[] {
  return groups.map((group) => ({
    value: group.id,
    type: 'group',
    label: group.displayName || group.name || group.path || shortId(group.id),
    description: [group.path, group.type, shortId(group.id)].filter(Boolean).join(' · '),
  }));
}

export function resourceDirectoryOptions(resources: IamResource[]): DirectoryOption[] {
  return resources.map((resource) => ({
    value: resource.ref.id,
    type: resource.ref.type,
    label: resource.displayName || resource.slug || resource.path || shortId(resource.ref.id),
    description: [resource.path, resource.projectId, shortId(resource.ref.id)].filter(Boolean).join(' · '),
  }));
}

export function resolveDirectoryLabel(
  type: string,
  id: string,
  users: IamUser[],
  groups: IamGroup[],
): { label: string; description?: string } {
  if (type === 'user') {
    const user = users.find((item) => item.id === id || item.externalId === id);
    if (user) {
      return {
        label: user.displayName || user.username || user.email || shortId(id),
        description: [user.username, user.email, id].filter(Boolean).join(' · '),
      };
    }
  }
  if (type === 'group') {
    const group = groups.find((item) => item.id === id || item.externalId === id || item.name === id);
    if (group) {
      return {
        label: group.displayName || group.name || group.path || shortId(id),
        description: [group.path, id].filter(Boolean).join(' · '),
      };
    }
  }
  return { label: id || '未指定', description: id ? `${subjectTypeLabel(type)} · ${id}` : undefined };
}

export function relationshipSummary(
  relationship: IamRelationship,
  users: IamUser[],
  groups: IamGroup[],
): string {
  const subject = resolveDirectoryLabel(relationship.subject.type, relationship.subject.id, users, groups);
  const subjectSuffix = relationship.subject.relation ? `中的${relationLabel(relationship.subject.relation)}` : '';
  return `${subject.label}${subjectSuffix} 是 ${resourceLabel(relationship.resource.type)} “${relationship.resource.id}” 的 ${relationLabel(relationship.relation)}`;
}

export function technicalRelationship(relationship: IamRelationship): string {
  const subjectRelation = relationship.subject.relation ? `#${relationship.subject.relation}` : '';
  return `${relationship.resource.type}:${relationship.resource.id}#${relationship.relation}@${relationship.subject.type}:${relationship.subject.id}${subjectRelation}`;
}

export function shortId(value?: string, head = 8, tail = 4): string {
  if (!value) return '';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function humanize(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

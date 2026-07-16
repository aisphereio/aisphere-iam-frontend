import type { IamRoleTemplate, IamRoleImpact, IamResourceType } from '../types';

type ApiRecord = Record<string, unknown>;

function asRecord(input: unknown): ApiRecord {
  if (input && typeof input === 'object' && !Array.isArray(input)) return input as ApiRecord;
  return {};
}

function valueOf(record: ApiRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function stringValue(record: ApiRecord, ...keys: string[]): string | undefined {
  const value = valueOf(record, ...keys);
  if (value === undefined || value === null) return undefined;
  return String(value).trim() || undefined;
}

function boolValue(record: ApiRecord, ...keys: string[]): boolean | undefined {
  const value = valueOf(record, ...keys);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'disabled'].includes(normalized)) return false;
  }
  return undefined;
}

function numberValue(record: ApiRecord, ...keys: string[]): number | undefined {
  const value = valueOf(record, ...keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringListValue(record: ApiRecord, ...keys: string[]): string[] | undefined {
  const value = valueOf(record, ...keys);
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === 'string') {
    const items = value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

function timestampValue(record: ApiRecord, ...keys: string[]): string | undefined {
  const value = valueOf(record, ...keys);
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === 'number') {
    const d = new Date(value * 1000);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function stringMapValue(record: ApiRecord, ...keys: string[]): Record<string, string> | undefined {
  const value = valueOf(record, ...keys);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

function recordValue(record: ApiRecord, ...keys: string[]): Record<string, unknown> | undefined {
  const value = valueOf(record, ...keys);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function normalizeIamRoleTemplate(input: unknown): IamRoleTemplate {
  const record = asRecord(input);
  return {
    id: stringValue(record, 'id') || '',
    resourceType: stringValue(record, 'resourceType', 'resource_type'),
    roleKey: stringValue(record, 'roleKey', 'role_key') || '',
    displayName: stringValue(record, 'displayName', 'display_name'),
    description: stringValue(record, 'description'),
    relation: stringValue(record, 'relation'),
    builtIn: boolValue(record, 'builtIn', 'built_in'),
    enabled: boolValue(record, 'enabled'),
    sortOrder: numberValue(record, 'sortOrder', 'sort_order'),
    permissions: stringListValue(record, 'permissions') || [],
    activeGrantCount: numberValue(record, 'activeGrantCount', 'active_grant_count'),
    version: numberValue(record, 'version'),
    metadata: recordValue(record, 'metadata'),
    createdAt: timestampValue(record, 'createdAt', 'created_at'),
    updatedAt: timestampValue(record, 'updatedAt', 'updated_at'),
  };
}

export function normalizeIamRoleTemplatesReply(input: unknown): { roleTemplates: IamRoleTemplate[] } {
  const record = asRecord(input);
  const roleTemplates = valueOf(record, 'roleTemplates', 'role_templates');
  return { roleTemplates: Array.isArray(roleTemplates) ? roleTemplates.map(normalizeIamRoleTemplate) : [] };
}

export function normalizeIamResourceType(input: unknown): IamResourceType {
  const record = asRecord(input);
  return {
    type: stringValue(record, 'type') || '',
    capabilityId: stringValue(record, 'capabilityId', 'capability_id'),
    ownerService: stringValue(record, 'ownerService', 'owner_service'),
    displayName: stringValue(record, 'displayName', 'display_name'),
    description: stringValue(record, 'description'),
    parentTypes: stringListValue(record, 'parentTypes', 'parent_types'),
    grantable: boolValue(record, 'grantable'),
    auditable: boolValue(record, 'auditable'),
    spicedbType: stringValue(record, 'spicedbType', 'spicedb_type'),
    relations: stringListValue(record, 'relations'),
    permissions: stringListValue(record, 'permissions'),
    labels: stringMapValue(record, 'labels'),
    metadata: stringMapValue(record, 'metadata'),
    status: stringValue(record, 'status'),
    createdAt: timestampValue(record, 'createdAt', 'created_at'),
    updatedAt: timestampValue(record, 'updatedAt', 'updated_at'),
  };
}

export function normalizeIamResourceTypesResponse(input: unknown): { resourceTypes: IamResourceType[] } {
  const record = asRecord(input);
  const resourceTypes = valueOf(record, 'resourceTypes', 'resource_types');
  return { resourceTypes: Array.isArray(resourceTypes) ? resourceTypes.map(normalizeIamResourceType) : [] };
}
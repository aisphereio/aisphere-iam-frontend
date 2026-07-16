import type { IamUser } from '../types';

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

export function normalizeIamUser(input: unknown): IamUser {
  const record = asRecord(input);
  const username = stringValue(record, 'username', 'userName', 'user_name', 'name') || '';
  const id = stringValue(record, 'id', 'userId', 'user_id', 'externalId', 'external_id') || username;
  const externalId = stringValue(record, 'externalId', 'external_id') || id || undefined;
  const displayName = stringValue(record, 'displayName', 'display_name', 'display', 'name') || username || undefined;

  return {
    id,
    externalId,
    provider: stringValue(record, 'provider'),
    orgId: stringValue(record, 'orgId', 'org_id', 'organization', 'owner'),
    username,
    displayName,
    email: stringValue(record, 'email'),
    phone: stringValue(record, 'phone'),
    roles: stringListValue(record, 'roles'),
    groups: stringListValue(record, 'groups'),
    enabled: boolValue(record, 'enabled', 'isEnabled', 'is_enabled'),
  };
}

export function normalizeIamUsersReply(input: unknown): { users: IamUser[]; nextPageToken?: string; next_page_token?: string } {
  const record = asRecord(input);
  const rawUsers = valueOf(record, 'users');
  const users = Array.isArray(rawUsers) ? rawUsers.map(normalizeIamUser) : [];
  const nextPageToken = stringValue(record, 'nextPageToken', 'next_page_token');
  return {
    users,
    nextPageToken,
    next_page_token: nextPageToken,
  };
}
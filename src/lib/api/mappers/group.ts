import type { IamGroup } from '../types';

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

/**
 * Normalize a single IAM Group object into the frontend IamGroup shape.
 *
 * The backend (aisphere-iam) returns groups from the Casdoor identity backend
 * via a proto-generated JSON encoder. Depending on the gateway / proto JSON
 * options, the same field can arrive as `parentId`, `parent_id`, or nested
 * under a parent object. We accept all known shapes and additionally derive
 * a parent from the `path` field as a fallback so the organization tree
 * renders with the correct hierarchy even when the backend omits parentId.
 */
export function normalizeIamGroup(input: unknown): IamGroup {
  const record = asRecord(input);
  const id = stringValue(record, 'id', 'groupId', 'group_id', 'externalId', 'external_id', 'name') || '';
  const externalId = stringValue(record, 'externalId', 'external_id') || id || undefined;
  const orgId = stringValue(record, 'orgId', 'org_id', 'organization', 'owner');
  // With the stable-ID model:
  //   id          = stable ID (e.g. "grp_01AR...")
  //   name        = machine-readable name (slug) — may be same as id if not persisted
  //   displayName = user-visible display name (may contain Chinese)
  const name = stringValue(record, 'name', 'groupName', 'group_name') || id;
  const displayName = stringValue(record, 'displayName', 'display_name', 'title') || name || undefined;
  const type = stringValue(record, 'type', 'groupType', 'group_type') || undefined;
  const path = stringValue(record, 'path', 'groupPath', 'group_path', 'fullPath', 'full_path') || undefined;
  // parentId may be present under multiple keys depending on JSON encoder
  const parentId = stringValue(record, 'parentId', 'parent_id', 'parent', 'parentNode', 'parent_node', 'parentId');
  // Derive parentId from path if missing. Casdoor typically encodes group
  // hierarchy as a slash-separated path like "/org/parent/child". We strip
  // the leading org segment and use the last segment as the child name and
  // the previous segment as the parent name. We then look up the parent by
  // name in the caller (see normalizeIamGroupsReply) to resolve to its ID.
  if (!parentId && path) {
    const segments = path.split('/').map((s) => s.trim()).filter(Boolean);
    // path like ["aisphere", "地球联盟", "美利坚", "华盛顿"]
    if (segments.length >= 2) {
      // Defer the actual ID resolution to the list-level normalizer via a
      // __parentName hint field. The list normalizer will translate it to an
      // actual parent ID once all groups have been processed.
      (record as ApiRecord).__parentName = segments[segments.length - 2];
    }
  }
  const rawUsers = valueOf(record, 'users', 'userIds', 'user_ids', 'members');
  const users = Array.isArray(rawUsers)
    ? rawUsers.map((u) => (typeof u === 'string' ? u : stringValue(asRecord(u), 'id', 'userId', 'user_id', 'username') || '')).filter(Boolean)
    : [];
  return {
    id,
    externalId,
    orgId,
    parentId: parentId || undefined,
    name,
    displayName,
    type,
    path,
    users,
  };
}

/**
 * Normalize the list-groups API response. This performs a second pass to
 * resolve path-derived parent hints to actual parent IDs, ensuring the
 * hierarchy is preserved even when the backend omits parentId.
 */
export function normalizeIamGroupsReply(input: unknown): { groups: IamGroup[] } {
  const record = asRecord(input);
  // The response might be { groups: [...] } or just an array
  const rawGroups = valueOf(record, 'groups');
  const groupArray = Array.isArray(rawGroups) ? rawGroups : (Array.isArray(input) ? input : []);
  const groups = groupArray.map(normalizeIamGroup);

  // Build a name -> id map so we can resolve path-derived parent hints
  const nameToId = new Map<string, string>();
  for (const g of groups) {
    if (g.name) nameToId.set(g.name, g.id);
    if (g.displayName && !nameToId.has(g.displayName)) nameToId.set(g.displayName, g.id);
  }

  // Resolve __parentName hints if parentId is still empty
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.parentId) continue;
    const raw = groupArray[i];
    const rawRecord = asRecord(raw);
    const parentName = stringValue(rawRecord, '__parentName');
    if (parentName && nameToId.has(parentName)) {
      const resolved = nameToId.get(parentName);
      if (resolved && resolved !== g.id) {
        groups[i] = { ...g, parentId: resolved };
      }
    }
  }

  return { groups };
}

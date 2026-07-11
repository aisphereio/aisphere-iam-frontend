# IAM Domain Concepts

This page documents the domain model and business concepts that the Aisphere IAM frontend manages. The frontend is a console for a multi-tenant IAM system backed by **Casdoor** (identity provider) and **SpiceDB** (relationship-based authorization).

## Domain Layers

```
┌─────────────────────────────────────────────┐
│            Identity Directory                │
│  (Casdoor: users, groups, organizations)     │
├─────────────────────────────────────────────┤
│            Control Plane                     │
│  (Organizations, Projects, Capabilities)     │
├─────────────────────────────────────────────┤
│            Authorization (AuthZ)             │
│  (SpiceDB schema, relationships, checks)     │
├─────────────────────────────────────────────┤
│            Grants & Roles                    │
│  (Role templates, access grants, revocations)│
├─────────────────────────────────────────────┤
│            Resources                         │
│  (Resource types, resources, bindings)       │
└─────────────────────────────────────────────┘
```

## 1. Identity Directory

Managed through `iamDirectoryApi` and `localUserApi` in `src/lib/api/index.ts`.

### Principal (`IamPrincipal`)

The authenticated user identity, fetched from `GET /v1/iam/me`. Contains:

- **Identity**: `subjectId`, `subjectType`, `username`, `displayName`, `email`, `phone`
- **Auth context**: `provider`, `issuer`, `audience`, `authMethod`, `scopes`
- **Tenancy**: `tenantId`, `orgId`, `appId`, `projectId`
- **Authorization**: `roles`, `groups`
- **Timestamps**: `issuedAt`, `expiresAt`

### Users (`IamUser`)

Directory users managed through Casdoor. Key fields: `id`, `externalId`, `provider`, `orgId`, `username`, `displayName`, `email`, `phone`, `roles`, `groups`, `enabled`.

Two user sources:
- **External users** (Casdoor): Displayed in the Users tab via `useIamExternalUsers`
- **Local users** (`/v1/users`): Managed via `localUserApi` (list, save, delete)

### Groups (`IamGroup`)

Hierarchical groups with tree structure. Key fields: `id`, `externalId`, `orgId`, `parentId`, `name`, `displayName`, `type`, `path`, `users`.

The **GroupsPage** (`src/components/pages/groups-page.tsx`) renders a tree view using `react-arborist` with:
- Expand/collapse
- Create, update, delete groups
- Assign/remove users from groups
- Search users and groups

### Organizations (`IamOrganization`)

Directory-level organizations. Key fields: `id`, `externalId`, `name`, `displayName`, `ownerId`, `parentId`, `tags`, `enabled`.

## 2. Control Plane

Managed through `iamProjectApi` and `iamResourceService` in `src/lib/api/index.ts`.

### Control Plane Organizations (`IamCpOrganization`)

Higher-level organizations that own projects. Key fields: `id`, `slug`, `displayName`, `status`, `casdoorOrg`, `plan`, `region`, `metadata`, `createdBy`, `createdAt`, `updatedAt`.

### Projects (`IamProject`)

Projects belong to control plane organizations. Key fields: `id`, `orgId`, `slug`, `displayName`, `description`, `status`, `visibility`, `labels`, `annotations`, `metadata`, `createdBy`, `owners`, `joined`, `stats`, `createdAt`, `updatedAt`.

### Capabilities (`IamCapability`, `IamProjectCapability`)

Capabilities are features that can be enabled/disabled per project. Each capability has:
- `id`, `name`, `displayName`, `ownerService`, `status`, `configSchema`
- Project bindings: `projectId`, `capabilityId`, `enabled`, `config`, `quota`

## 3. Authorization (AuthZ)

Managed through `iamAuthzAdminApi` in `src/lib/api/index.ts`. Uses **SpiceDB** as the authorization engine.

### SpiceDB Schema

The authorization model is defined as a SpiceDB schema (text-based DSL with `definition` blocks). The frontend provides:
- **View/Edit/Publish** schema via `useIamAuthzSchema`, `useIamValidateAuthzSchema`, `useIamPublishAuthzSchema`
- **Schema parsing** in `src/lib/authz/schema-summary.ts` via `parseSchemaText()`

### Relationships (`IamRelationship`)

Relationships define who has what access to which resource. Structure: `{ resource, relation, subject }`.

Managed via:
- `useIamAuthzRelationships` — list relationships
- `useIamWriteAuthzRelationship` — create/update
- `useIamDeleteAuthzRelationships` — delete

### Permission Checks

- `useIamCheckAuthzPermission` — check if a subject has a permission on a resource
- `useIamExplainAuthzPermission` — explain why a permission is allowed/denied
- `useIamEffectivePermissions` — list all effective permissions for a subject

### Schema Summary (`src/lib/authz/schema-summary.ts`)

This module provides **friendly, bilingual labels** for the SpiceDB schema:

- **`buildFriendlyResourceModels`** — Merges control-plane resource types + role templates + SpiceDB schema into unified `FriendlyResourceModel` objects
- **`parseSchemaText`** — Parses SpiceDB `definition` blocks into structured data
- **`expressionToFriendlyText`** — Converts SpiceDB permission expressions to Chinese text
- **`directPermissionSources` / `inheritedPermissionSources`** — Parse permission expressions
- **Label maps**: `RESOURCE_LABELS`, `RESOURCE_DESCRIPTIONS`, `RELATION_LABELS`, `PERMISSION_LABELS` (all bilingual)

## 4. Grants & Roles

Managed through `iamGrantService` in `src/lib/api/index.ts`.

### Role Templates (`IamRoleTemplate`)

Pre-defined role templates that can be granted to subjects. Key fields: `id`, `resourceType`, `roleKey`, `displayName`, `description`, `relation`, `builtIn`.

### Grants (`IamGrant`)

Access grants linking subjects to resources with specific roles. Key fields: `id`, `resource`, `relation`, `roleKey`, `subject`, `source`, `reason`, `expiresAt`, `createdBy`, `createdAt`, `updatedAt`, `revokedAt`, `consistencyToken`, `metadata`.

Operations:
- `useIamGrants` — list grants
- `useIamGrantAccess` — grant access
- `useIamRevokeAccess` — revoke access
- `useIamRoleTemplates` — list role templates

## 5. Resources

Managed through `iamResourceService` in `src/lib/api/index.ts`.

### Resource Types (`IamResourceType`)

Types of resources that can be managed. Key fields: `type`, `capabilityId`, `ownerService`, `displayName`, `description`, `parentTypes`, `grantable`, `auditable`, `spicedbType`, `relations`, `permissions`, `labels`, `metadata`, `status`.

### Resources (`IamResource`)

Individual resource instances. Key fields: `ref` (type + id), `orgId`, `projectId`, `parent`, `ownerService`, `slug`, `displayName`, `path`, `status`, `visibility`, `grantable`, `labels`, `annotations`, `metadata`.

### Resource Bindings (`IamResourceBinding`)

Bindings between resources and subjects/roles.

## API Service Map

| Service | Base Path | Key Operations |
|---------|-----------|----------------|
| `iamAuthApi` | `/v1/iam/me` | `getMe()` |
| `iamDirectoryApi` | `/v1/iam/orgs/{orgId}` | Users, groups, directory org CRUD |
| `iamPermissionApi` | `/v1/iam/permissions` | Check, write/delete relationships |
| `iamAuthzAdminApi` | `/v1/iam/authz` | Schema, relationships, check, explain, effective permissions |
| `iamProjectApi` | `/v1/iam/control-plane` | Organizations, projects, capabilities CRUD |
| `iamResourceService` | `/v1/iam/control-plane` | Resource types, resources, bindings |
| `iamGrantService` | `/v1/iam/control-plane` | Role templates, grants, access management |
| `localUserApi` | `/v1/users` | Local users CRUD |

## Important Notes for Future Agents

- **All API responses use snake_case** — the frontend normalizes to camelCase via `normalize*` functions in `src/lib/api/index.ts`
- **The `IamPrincipal` has many optional fields** — the `normalizePrincipal` function copies aliases for backward compatibility
- **The AuthZ schema is stored as raw text** — the frontend parses it client-side with `parseSchemaText()`
- **The PermissionsPage has four tabs** (Resource, Subject, Explain, Model) — each uses different combinations of the AuthZ hooks
- **The `buildFriendlyResourceModels` function** is the main entry point for the Permissions Console — it merges three data sources (resource types, role templates, SpiceDB schema)
- **Grants have a `revokedAt` field** — revoked grants are soft-deleted, not removed
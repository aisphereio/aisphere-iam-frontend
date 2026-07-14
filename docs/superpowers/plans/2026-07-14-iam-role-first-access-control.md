# IAM Role-First Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an understandable role-first IAM console, resource-level sharing, true custom roles, and scoped administrator inheritance without multiplying administrator relationships across every child resource.

**Architecture:** SpiceDB remains the authorization source of truth. Static hierarchy relationships connect `platform → zone → group → resource`; each administrator receives one direct relationship at the scope they administer. Built-in roles continue to map to native resource relations. Custom roles are IAM-managed capability bundles projected as `custom_role` and `role_binding` relationships. PostgreSQL stores control-plane metadata, versions, grant lifecycle, and audit history; the outbox projects every authorization mutation to SpiceDB.

**Tech Stack:** Go, protobuf/buf, Kernel `authz` and `dbx`, SpiceDB schema, PostgreSQL/GORM models, Next.js 15, React 19, TypeScript, TanStack Query, Vitest, Testing Library.

**Implementation status (2026-07-14):** Implemented on `codex/iam-role-first-permission-console` in both repositories. The delivered console keeps the planned four top-level views; the initial resource-centric assignment flow is implemented directly in `AccessAssignments`, while subject-centric inspection is handled through permission diagnosis and grant filtering rather than separate panel files.

---

## Working Agreements

- Backend repository: `E:\coding\aisphereio\aisphere-iam`
- Frontend repository: `E:\coding\aisphereio\aisphere-iam-front`
- Design source: `E:\coding\aisphereio\aisphere-iam-front\docs\superpowers\specs\2026-07-14-iam-role-first-access-control-design.md`
- Work on `codex/iam-role-first-permission-console` in both repositories. The frontend is already on that branch; create the backend branch from its current clean `main`.
- For API work, change `api/iam/grant/v1/grant.proto` first, run `make api`, and never hand-edit generated `.pb.go` files.
- Apply schema/bootstrap changes additively first. Delete legacy expanded administrator relationships only through the explicit migration flag after inheritance checks pass.
- Keep existing unrelated commit `f281bb7` and its organization request-body fix intact.

## Task 1: Establish branches and baseline gates

**Files:**

- Verify: `E:\coding\aisphereio\aisphere-iam-front\docs\superpowers\specs\2026-07-14-iam-role-first-access-control-design.md`
- Verify: `E:\coding\aisphereio\aisphere-iam\configs\spicedb\aisphere.schema.zed`
- Verify: `E:\coding\aisphereio\aisphere-iam\configs\resource\defaults.yaml`

- [ ] Verify both worktrees are clean before editing.

```powershell
git -C E:\coding\aisphereio\aisphere-iam status --short
git -C E:\coding\aisphereio\aisphere-iam-front status --short
git -C E:\coding\aisphereio\aisphere-iam-front branch --show-current
```

Expected: no status output; frontend branch is `codex/iam-role-first-permission-console`.

- [ ] Create the backend feature branch.

```powershell
git -C E:\coding\aisphereio\aisphere-iam switch -c codex/iam-role-first-permission-console
```

Expected: switched to the new branch. Do not use `.worktrees/permission-bootstrap-convergence` for this implementation.

- [ ] Run targeted baselines and record any pre-existing failure separately.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam
go test ./internal/permissionmanifest ./internal/biz/grant ./internal/biz/projection ./internal/data ./internal/service -count=1

Set-Location E:\coding\aisphereio\aisphere-iam-front
npx tsc --noEmit
```

Expected: targeted Go packages and TypeScript compile pass. If `.next` locking causes `EBUSY`, stop the local Next process or remove only the generated `.next` directory, then rerun.

## Task 2: Model one administrator relationship per scope

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\internal\permissionmanifest\manifest.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\permissionmanifest\validate.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\permissionmanifest\manifest_test.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\configs\resource\defaults.yaml`
- Modify: `E:\coding\aisphereio\aisphere-iam\configs\spicedb\aisphere.schema.zed`

- [ ] Write failing manifest tests for scoped bootstrap roles and platform resource links.

The manifest contract becomes:

```go
type BootstrapPolicy struct {
    DefaultRole      string                   `yaml:"default_role"`
    PlatformID       string                   `yaml:"platform_id"`
    Roles            map[string]BootstrapRole `yaml:"roles"`
    PlatformResources []AdminResource         `yaml:"platform_resources"`
}

type BootstrapRole struct {
    Aliases  []string `yaml:"aliases"`
    Scope    string   `yaml:"scope"` // platform or zone
    Relation string   `yaml:"relation"`
}
```

Test that:

1. `platform_owner` resolves to `platform/global/owner`.
2. `zone_admin` resolves to `zone/{subject.ZoneID}/admin`.
3. unknown scopes, missing relations, and platform resources absent from the schema fail validation.
4. aliases remain unique.

- [ ] Run the focused test and confirm it fails for the old expansion model.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam
go test ./internal/permissionmanifest -run "Test.*Bootstrap" -count=1
```

Expected: failure mentioning missing `Scope`, `PlatformID`, or `PlatformResources` behavior.

- [ ] Replace expanded bootstrap declarations in `defaults.yaml`.

```yaml
bootstrap:
  default_role: platform_owner
  platform_id: global
  roles:
    platform_owner:
      aliases: [owner]
      scope: platform
      relation: owner
    platform_admin:
      aliases: [admin]
      scope: platform
      relation: admin
    zone_owner:
      scope: zone
      relation: owner
    zone_admin:
      scope: zone
      relation: admin
    zone_user_manager:
      scope: zone
      relation: user_manager
    zone_group_manager:
      scope: zone
      relation: group_manager
    zone_permission_admin:
      scope: zone
      relation: permission_admin
  platform_resources:
    - {type: iam, id: organization}
    - {type: iam, id: user}
    - {type: iam, id: group}
    - {type: iam, id: directory}
    - {type: iam, id: settings}
    - {type: iam, id: operations}
    - {type: iam, id: audit}
    - {type: iam, id: permissions}
    - {type: iam_authz, id: global}
```

Remove `zone_relations`, `control_plane_admin`, and `admin_resources` from the manifest model and YAML.

- [ ] Add the root inheritance schema.

```zed
definition platform {
  relation owner: user | group#member | service | service_account
  relation admin: user | group#member | service | service_account

  permission manage_identity = owner + admin
  permission manage_control_plane = owner + admin
  permission manage_permissions = owner + admin
}
```

Add `relation platform: platform` to `zone`, `iam`, and `iam_authz`. Extend their permissions through the root:

```zed
permission manage_users = owner + admin + user_manager + platform->manage_identity
permission manage_groups = owner + admin + group_manager + platform->manage_identity
permission manage_permissions = owner + admin + permission_admin + platform->manage_permissions
```

For `iam` and `iam_authz`, add `platform->manage_control_plane` or `platform->manage_permissions` to the corresponding existing permission without removing existing relations.

- [ ] Implement validation against `scope` and the actual schema relation.

Use the scope definition (`platform` or `zone`) to verify `BootstrapRole.Relation`; verify every `platform_resources` type has a `platform` relation and every ID is non-empty.

- [ ] Rerun manifest and schema gates.

```powershell
go test ./internal/permissionmanifest -count=1
make permission-manifest-check
```

Expected: pass; schema definition count increases by one and committed manifest/schema remain aligned.

- [ ] Commit the scoped schema contract.

```powershell
git add internal/permissionmanifest configs/resource/defaults.yaml configs/spicedb/aisphere.schema.zed
git commit -m "feat: model scoped IAM administrators"
```

## Task 3: Converge bootstrap writes and provide safe legacy cleanup

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\internal\conf\conf.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\data\data.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\data\bootstrap_admin_test.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\configs\config.yaml`
- Modify: `E:\coding\aisphereio\aisphere-iam\configs\config.local.yaml`
- Modify: `E:\coding\aisphereio\aisphere-iam\configs\config.test.yaml`

- [ ] Write failing bootstrap tests for relationship cardinality and scope.

Add cases proving:

```text
platform_admin + user:u1 => platform:global#admin@user:u1
zone_admin + zone:org-a + user:u2 => zone:org-a#admin@user:u2
```

Each subject produces exactly one personnel relationship. Platform-resource links are stable and deduplicated regardless of whether one or ten administrators are configured. A zone role without `zone_id` fails before any write.

- [ ] Add an explicit migration switch to configuration.

```go
type ControlPlaneBootstrapAdminsConfig struct {
    Enabled                 bool                       `json:"enabled" yaml:"enabled"`
    CleanupLegacyExpansions bool                       `json:"cleanup_legacy_expansions" yaml:"cleanup_legacy_expansions"`
    Subjects                []ControlPlaneAdminSubject `json:"subjects" yaml:"subjects"`
}
```

Default `cleanup_legacy_expansions: false` in all committed configs. It must never silently delete legacy relationships during the additive rollout.

- [ ] Implement structural and personnel writes in `bootstrapControlPlaneAdmins`.

Build one deduplicated batch containing:

```go
authz.Relationship{
    Resource: authz.ObjectRef{Type: "zone", ID: subject.ZoneID},
    Relation: "platform",
    Subject:  authz.SubjectRef{Type: "platform", ID: policy.PlatformID},
}
```

and equivalent `platform` links for every `platform_resources` item. Then resolve each role to one target:

```go
switch role.Scope {
case "platform":
    resource = authz.ObjectRef{Type: "platform", ID: policy.PlatformID}
case "zone":
    resource = authz.ObjectRef{Type: "zone", ID: subject.ZoneID}
}
```

Write `resource#role.Relation@subject` once. Preserve username/external-identity resolution and `Touch` idempotency.

- [ ] Implement gated legacy cleanup after the new write succeeds.

When `CleanupLegacyExpansions` is true, delete only legacy relationships for the configured bootstrap subject:

- redundant zone relations from the old role definition, excluding the new direct scoped relation;
- `admin` on each former control-plane resource.

Never use a broad subject-only filter. Construct exact `resource type + resource ID + relation + subject` filters. Log planned/deleted counts, and keep repeated execution idempotent.

- [ ] Run tests, including a migration test that starts with old relationships, writes the new root relation, then removes only old duplicates.

```powershell
go test ./internal/data -run "TestBootstrapControlPlaneAdmins" -count=1
go test ./internal/permissionmanifest ./internal/data -count=1
```

Expected: pass; unrelated grants for the same subject remain present.

- [ ] Commit bootstrap convergence.

```powershell
git add internal/conf internal/data configs/config*.yaml
git commit -m "feat: converge IAM bootstrap relationships"
```

## Task 4: Define the custom-role API proto first

**Files:**

- Modify first: `E:\coding\aisphereio\aisphere-iam\api\iam\grant\v1\grant.proto`
- Regenerate: `E:\coding\aisphereio\aisphere-iam\api\iam\grant\v1\grant*.pb.go`
- Regenerate: `E:\coding\aisphereio\aisphere-iam\openapi.yaml`
- Modify tests: `E:\coding\aisphereio\aisphere-iam\internal\service\grant_test.go`

- [ ] Add contract tests for the desired request/response behavior before implementing handlers.

Tests must cover create, update, disable, impact preview, permissions returned in list, active grant count, optimistic version conflict, and built-in role immutability.

- [ ] Extend `GrantService` and `RoleTemplate` in the proto.

```proto
service GrantService {
  rpc RegisterRoleTemplate(RegisterRoleTemplateRequest) returns (RegisterRoleTemplateReply);
  rpc UpdateRoleTemplate(UpdateRoleTemplateRequest) returns (UpdateRoleTemplateReply);
  rpc DisableRoleTemplate(DisableRoleTemplateRequest) returns (DisableRoleTemplateReply);
  rpc PreviewRoleTemplateImpact(PreviewRoleTemplateImpactRequest) returns (PreviewRoleTemplateImpactReply);
  rpc ListRoleTemplates(ListRoleTemplatesRequest) returns (ListRoleTemplatesReply);
  rpc GrantAccess(GrantAccessRequest) returns (GrantAccessReply);
  rpc RevokeAccess(RevokeAccessRequest) returns (RevokeAccessReply);
  rpc ListGrants(ListGrantsRequest) returns (ListGrantsReply);
  rpc ExplainAccess(ExplainAccessRequest) returns (ExplainAccessReply);
}

message RoleTemplate {
  // keep all existing field numbers unchanged
  repeated string permissions = 14;
  int64 active_grant_count = 15;
  int64 version = 16;
}

message UpdateRoleTemplateRequest {
  string id = 1;
  string display_name = 2;
  string description = 3;
  repeated string permissions = 4;
  int64 expected_version = 5;
}

message DisableRoleTemplateRequest {
  string id = 1;
  int64 expected_version = 2;
  bool confirm_active_grants = 3;
}

message PreviewRoleTemplateImpactRequest {
  string id = 1;
  repeated string permissions = 2;
}

message PreviewRoleTemplateImpactReply {
  int64 active_grant_count = 1;
  repeated string added_permissions = 2;
  repeated string removed_permissions = 3;
}
```

Use existing HTTP annotation conventions. Do not add a generic relation string to the public custom-role form: built-ins own relations; custom roles own permissions.

- [ ] Regenerate all server, gateway, authz, and OpenAPI surfaces.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam
make api
git diff --exit-code -- api/iam/grant/v1/grant.proto
```

The second command should be non-zero only because the intentional proto edit is uncommitted; inspect generated changes and ensure there are no hand edits.

- [ ] Run protobuf verification.

```powershell
make api
make proto-check
```

Expected: the second `make api` produces no additional diff; proto check passes.

- [ ] Commit the API contract and generated artifacts.

```powershell
git add api/iam/grant/v1 openapi.yaml
git commit -m "feat: define custom IAM role API"
```

## Task 5: Persist role capabilities, versions, and audit history

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\internal\data\resource_models.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\data\resource_repository.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\data\memory.go`
- Add: `E:\coding\aisphereio\aisphere-iam\internal\data\role_repository_test.go`

- [ ] Write failing repository tests for ordered permissions, active-grant count, optimistic updates, disable confirmation data, and audit append.

- [ ] Add normalized role metadata models.

```go
type RoleTemplatePermissionModel struct {
    ID             string `gorm:"primaryKey;size:64"`
    RoleTemplateID string `gorm:"size:64;not null;uniqueIndex:uk_role_permission"`
    Permission     string `gorm:"size:128;not null;uniqueIndex:uk_role_permission"`
    SortOrder      int    `gorm:"not null;default:0"`
}

type RoleTemplateAuditModel struct {
    ID             string    `gorm:"primaryKey;size:64"`
    RoleTemplateID string    `gorm:"size:64;not null;index"`
    Version        int64     `gorm:"not null"`
    Action         string    `gorm:"size:32;not null"`
    ActorType      string    `gorm:"size:64;not null"`
    ActorID        string    `gorm:"size:256;not null"`
    BeforeJSON     string    `gorm:"type:text"`
    AfterJSON      string    `gorm:"type:text"`
    CreatedAt      time.Time `gorm:"not null"`
}
```

Add `Version int64` to `RoleTemplateModel` with default `1`. Keep the existing `Relation` column for built-in compatibility; store the sentinel `custom_binding` for custom roles rather than weakening the database constraint.

- [ ] Add both new models to `ControlPlaneModels()` and repository operations that execute role metadata, permission replacement, audit row, and outbox row in one database transaction.

Required repository behavior:

```go
GetRoleTemplate(ctx, id)
ListRoleTemplatePermissions(ctx, id)
UpdateRoleTemplate(ctx, role, permissions, expectedVersion, audit, outbox)
CountActiveGrantsByRole(ctx, roleID, now)
```

Return a typed conflict when `expected_version` does not match. Mirror behavior in `MemoryControlPlaneRepository` for service tests.

- [ ] Run repository tests and migration smoke test.

```powershell
go test ./internal/data -run "Test.*Role" -count=1
go test ./internal/data -count=1
```

Expected: pass; auto-migration includes all new models.

- [ ] Commit persistence changes.

```powershell
git add internal/data
git commit -m "feat: persist custom role capabilities"
```

## Task 6: Add idempotent batch-delete and role-replacement projection

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\internal\biz\projection\manager.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\biz\projection\manager_test.go`

- [ ] Write failing tests for deleting all relationships of one grant and replacing custom-role capabilities.

Test retry behavior after each possible partial point. Retrying must leave exactly the desired final set.

- [ ] Extend projection payload without breaking existing write/delete events.

```go
type Payload struct {
    Operation             string                       `json:"operation"`
    Relationships         []authz.Relationship         `json:"relationships,omitempty"`
    Filters               []authz.RelationshipFilter   `json:"filters,omitempty"`
    PreviousRelationships []authz.Relationship         `json:"previous_relationships,omitempty"`
    Filter                *authz.RelationshipFilter    `json:"filter,omitempty"` // legacy decode
}
```

Add constructors `NewBatchDeleteEvent(...)` and `NewReplaceEvent(...)`.

- [ ] Apply replacement in fail-closed order: delete exact old capability relations, then touch exact new relations. Compensation deletes new relations and restores previous relations.

Kernel exposes separate write and delete operations, so keep the ordered steps inside one outbox event. Exact filters and `Touch` make replay idempotent. Never delete the `custom_role` object broadly without enumerating its known capability relations.

- [ ] Run projection tests.

```powershell
go test ./internal/biz/projection -count=1
```

Expected: pass, including retry and compensation cases.

- [ ] Commit projection primitives.

```powershell
git add internal/biz/projection
git commit -m "feat: project dynamic role relationships"
```

## Task 7: Implement custom roles and fine-grained role bindings

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\configs\spicedb\aisphere.schema.zed`
- Modify: `E:\coding\aisphereio\aisphere-iam\configs\resource\defaults.yaml`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\biz\grant\service.go`
- Add: `E:\coding\aisphereio\aisphere-iam\internal\biz\grant\service_test.go`

- [ ] Write failing business tests for a Skill shared to one user and one group through a custom role.

Cover:

- built-in role grant still writes one native resource relation;
- custom role create rejects unknown/non-grantable resource types and permissions absent from `ResourceType.Permissions`;
- custom grant writes exactly three binding relationships;
- revoke deletes those exact three relationships;
- updating a role emits a replacement projection and increments version;
- disabling with active grants requires explicit confirmation and blocks new grants;
- built-in roles cannot be edited or disabled.

- [ ] Add dynamic-role schema types.

```zed
definition custom_role {
  relation view: user:*
  relation edit: user:*
  relation manage: user:*
  relation execute: user:*
  relation review: user:*
  relation publish: user:*
  relation deploy: user:*

  permission can_view = view
  permission can_edit = edit
  permission can_manage = manage
  permission can_execute = execute
  permission can_review = review
  permission can_publish = publish
  permission can_deploy = deploy
}

definition role_binding {
  relation role: custom_role
  relation grantee: user | group#member

  permission view = role->can_view & grantee
  permission edit = role->can_edit & grantee
  permission manage = role->can_manage & grantee
  permission execute = role->can_execute & grantee
  permission review = role->can_review & grantee
  permission publish = role->can_publish & grantee
  permission deploy = role->can_deploy & grantee
}
```

Use the complete union of actual grantable manifest permissions, not only the illustrative seven above. Add `relation custom_binding: role_binding` to every custom-role-enabled resource definition and include `custom_binding-><permission>` in its matching permission expression. Add `custom_binding` to the exact `relations` lists in `defaults.yaml`.

- [ ] Implement stable object IDs and relationship builders.

```go
func customRoleObjectID(resourceType, roleID string) string {
    return resourceType + ":" + roleID
}

func roleBindingObjectID(grantID string) string {
    return grantID
}
```

For each role permission, project:

```text
custom_role:<resource-type>:<role-id>#<permission>@user:*
```

For each custom grant, project:

```text
role_binding:<grant-id>#role@custom_role:<resource-type>:<role-id>
role_binding:<grant-id>#grantee@user:<user-id>
<resource-type>:<resource-id>#custom_binding@role_binding:<grant-id>
```

Groups use `group:<id>#member`. Versioned role updates replace capability relationships; grant relationships remain stable.

- [ ] Implement role lifecycle and impact preview in `grant.Service`.

Normalize and sort permissions before comparison/storage. `PreviewRoleTemplateImpact` computes added/removed permissions and calls `CountActiveGrantsByRole`. Record actor, reason, before/after JSON, and version in audit metadata. Preserve existing expiry and outbox semantics.

- [ ] Run schema, manifest, and business tests.

```powershell
make permission-manifest-check
go test ./internal/biz/grant ./internal/biz/projection -count=1
```

Expected: pass; custom role permission names are validated against the same committed manifest used by the UI/API.

- [ ] Commit the authorization model and business logic.

```powershell
git add configs/spicedb/aisphere.schema.zed configs/resource/defaults.yaml internal/biz/grant
git commit -m "feat: support fine-grained custom role grants"
```

## Task 8: Wire service handlers and prove end-to-end backend behavior

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\internal\service\control_plane.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\service\grant_test.go`
- Modify: `E:\coding\aisphereio\aisphere-iam\internal\service\iam_integration_test.go`

- [ ] Map proto requests to business commands and map `permissions`, `active_grant_count`, and `version` back to every role response.

Keep validation/business rules in `internal/biz/grant`; handlers only translate transport types and errors.

- [ ] Add service tests for JSON/proto mapping, HTTP-compatible errors, and optimistic conflict.

- [ ] Add an integration test for resource-level sharing.

Scenario:

1. create custom Skill role `reviewer` with only `view` and `review`;
2. grant it on `skill:skill-a` to `user:alice`;
3. process the outbox;
4. check `view=true`, `review=true`, `edit=false`;
5. change the role to add `edit`, process the outbox, and verify `edit=true`;
6. revoke the grant and verify all three permissions are false.

Add a separate hierarchy scenario proving one platform admin can manage two zones, one zone admin can manage child groups only in that zone, and a group manager cannot manage its parent zone.

- [ ] Run targeted and race tests.

```powershell
go test ./internal/service ./internal/biz/grant ./internal/biz/projection ./internal/data -count=1
go test -race ./internal/biz/grant ./internal/biz/projection ./internal/service -count=1
```

Expected: pass. If Windows CGO prevents `-race`, record that machine limitation and keep the normal targeted suite as the required gate.

- [ ] Commit backend service wiring.

```powershell
git add internal/service
git commit -m "feat: expose custom role lifecycle"
```

## Task 9: Align frontend API types and hooks

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam-front\src\lib\api\types.ts`
- Modify: `E:\coding\aisphereio\aisphere-iam-front\src\lib\api\index.ts`
- Modify: `E:\coding\aisphereio\aisphere-iam-front\src\hooks\use-iam.ts`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\lib\authz\role-capabilities.ts`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\lib\authz\role-capabilities.test.ts`

- [ ] Add frontend test tooling if the repository still has no test runner.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam-front
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom
```

Add `test` and `test:watch` scripts, `vitest.config.ts`, and `src/test/setup.ts`. Configure the existing `@/` alias and `jsdom`.

- [ ] Write failing tests for grouping manifest capabilities by resource type and for blocking invalid custom-role permission selections.

- [ ] Extend API types to match the generated proto JSON contract.

```ts
export interface IamRoleTemplate {
  id: string
  resourceType: string
  roleKey: string
  displayName: string
  description?: string
  relation?: string
  builtIn: boolean
  enabled: boolean
  permissions: string[]
  activeGrantCount: number
  version: number
}

export interface IamRoleImpact {
  activeGrantCount: number
  addedPermissions: string[]
  removedPermissions: string[]
}
```

Register custom roles with `permissions`; do not send a missing `relation`. Add update, disable, and impact-preview API methods and TanStack mutations. Invalidate role-template and grant queries on success.

- [ ] Implement resource capability helpers from existing `schema-summary.ts` data and friendly labels from `presentation.ts`. The helper must preserve backend permission keys while showing Chinese names and descriptions.

- [ ] Run unit and type tests.

```powershell
npm test -- --run
npx tsc --noEmit
```

Expected: pass.

- [ ] Commit the frontend contract layer.

```powershell
git add package.json package-lock.json vitest.config.ts src/test src/lib/api src/hooks/use-iam.ts src/lib/authz
git commit -m "feat: align IAM role frontend contract"
```

## Task 10: Build the role-first access-control console

**Files:**

- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\access-control-page.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\role-library.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\role-editor-dialog.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\access-assignments.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\resource-access-panel.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\subject-access-panel.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\permission-diagnosis.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\advanced-governance.tsx`
- Add: `E:\coding\aisphereio\aisphere-iam-front\src\components\access-control\access-control-page.test.tsx`

- [ ] Write component tests for the four top-level capabilities and the two main user journeys.

Required tests:

1. default view lists roles before grants;
2. built-in/custom badges and scope labels are visible;
3. creating a custom role chooses one resource type, then only its capabilities;
4. assigning access supports “resource → person/group → role → expiry/reason”;
5. editing/disabling shows impact count and requires confirmation;
6. direct and inherited administrators use distinct labels.

- [ ] Implement a thin page shell with four stable views.

```ts
type AccessControlView =
  | 'roles'
  | 'assignments'
  | 'diagnosis'
  | 'advanced'
```

The default is `roles`. Keep view state in the existing page routing model so old `grants` links can open `assignments` without exposing two sidebar products.

- [ ] Implement `RoleLibrary` as the primary mental model.

Each row/card shows display name, resource type, built-in/custom, direct capability summary, active assignment count, status, and applicable scope. Actions:

- view assignments;
- copy built-in role into a custom role;
- edit a custom role;
- disable with impact confirmation;
- start an assignment using that role.

Group platform/organization administration roles separately from business-resource roles. Explain that an organization admin inherits group management but is not directly assigned as every group's manager.

- [ ] Implement `RoleEditorDialog` with a resource-type-first capability matrix.

Fields: name, key generated but editable before creation, description, resource type, selected capabilities. Hide raw SpiceDB relation syntax. On edit, lock resource type and key; load impact preview before submit when permissions are removed. Show version conflicts with a reload action.

- [ ] Implement `AccessAssignments` with two entry modes.

- “按资源授权”: resource type → resource → user/group → role → expiry → reason.
- “按人员查看”: user/group → direct assignments + inherited permissions, grouped by scope/resource.

`ResourceAccessPanel` is reusable from a Skill detail page later; its public props should accept `{ resourceType, resourceId }` and preselect the resource.

- [ ] Implement `PermissionDiagnosis` using existing explain/check hooks and `AdvancedGovernance` for raw relationship/schema tools. Keep raw tuples out of the normal role/assignment flows.

- [ ] Run component and type tests.

```powershell
npm test -- --run
npx tsc --noEmit
```

Expected: pass; no new monolithic page file replaces the existing monoliths.

- [ ] Commit the new console components.

```powershell
git add src/components/access-control
git commit -m "feat: build role-first access control console"
```

## Task 11: Consolidate navigation and retire overlapping UI

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam-front\src\app\page.tsx`
- Modify: `E:\coding\aisphereio\aisphere-iam-front\src\components\layout\sidebar.tsx`
- Modify: `E:\coding\aisphereio\aisphere-iam-front\src\components\pages\iam-page.tsx`
- Remove when unreferenced: `E:\coding\aisphereio\aisphere-iam-front\src\components\pages\permissions-business-page.tsx`
- Remove when unreferenced: `E:\coding\aisphereio\aisphere-iam-front\src\components\pages\permissions-center-page.tsx`

- [ ] Add a routing test or pure mapping test proving both legacy IDs reach the new console:

```text
permissions -> access control / roles
grants      -> access control / assignments
```

- [ ] Replace the two sidebar entries with one entry labeled `访问控制`. Use a concise description such as `角色、授权与权限排查`.

- [ ] Route the main page to `AccessControlPage`. Preserve legacy in-app state/deep-link compatibility by mapping the old `grants` key to the assignments initial view.

- [ ] Remove the old `GrantsTab` implementation from `iam-page.tsx` after all required behavior exists in the new components. Delete the two overlapping permission pages only after `rg` confirms they have no imports.

```powershell
rg -n "PermissionsBusinessPage|PermissionsCenterPage|GrantsTab" src
```

Expected after cleanup: no obsolete imports/definitions.

- [ ] Run the complete frontend gate.

```powershell
npm test -- --run
npx tsc --noEmit
npm run lint
npm run build
```

Expected: pass. Treat lint/build output from untouched code as pre-existing only when reproduced from the Task 1 baseline.

- [ ] Commit navigation consolidation.

```powershell
git add src/app/page.tsx src/components/layout/sidebar.tsx src/components/pages src/components/access-control
git commit -m "refactor: consolidate IAM access control navigation"
```

## Task 12: Rollout verification, documentation, and handoff

**Files:**

- Modify: `E:\coding\aisphereio\aisphere-iam\README.md`
- Modify: `E:\coding\aisphereio\aisphere-iam\.agile-v\requirements\requirements.md`
- Modify: `E:\coding\aisphereio\aisphere-iam\.agile-v\BUILD_MANIFEST.md`
- Modify: `E:\coding\aisphereio\aisphere-iam\.agile-v\TEST_SPEC.md`
- Modify: `E:\coding\aisphereio\aisphere-iam-front\README.md`
- Verify: both repository diffs and generated artifacts

- [ ] Add one IAM access-control requirement and map every new implementation/test path through Agile V REQ → ART → TC records. Reuse one requirement ID for this cohesive feature and keep each ART/TC identifier unique.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam
make traceability-check STRICT=1
```

Expected: the new requirement has implementation and test coverage with no new strict-mode gap.

- [ ] Document the safe migration sequence:

1. deploy additive schema (`platform`, hierarchy links, custom role types);
2. start IAM with `cleanup_legacy_expansions: false` and verify new root/zone checks;
3. enable cleanup for one controlled restart or rollout;
4. verify logs and representative access checks;
5. return the flag to `false`;
6. deploy the new frontend after the backend API is reachable.

Include rollback: restore old role definitions and bootstrap config while leaving additive schema types in place; do not delete custom-role schema while bindings exist.

- [ ] Run final backend gates.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam
make api
make permission-manifest-check
go test ./internal/permissionmanifest ./internal/biz/grant ./internal/biz/projection ./internal/data ./internal/service -count=1
go build ./...
make traceability-check STRICT=1
git status --short
```

Expected: all pass and `make api` leaves no generated diff.

- [ ] Run final frontend gates.

```powershell
Set-Location E:\coding\aisphereio\aisphere-iam-front
npm test -- --run
npx tsc --noEmit
npm run lint
npm run build
git status --short
```

Expected: all pass and only intentional README/plan changes remain before the final commit.

- [ ] Smoke-test the local UI against the IAM backend.

Verify:

- role library is the default page;
- platform, organization, group, and resource scope explanations are understandable;
- create/edit/disable custom role works;
- a Skill can be shared to one user and to one group;
- direct vs inherited administrator labels are correct;
- permission diagnosis explains the same decision returned by the backend;
- advanced raw relationship tools remain available but are not required for normal work.

- [ ] Commit documentation and any final verified adjustments.

```powershell
git -C E:\coding\aisphereio\aisphere-iam add README.md
git -C E:\coding\aisphereio\aisphere-iam commit -m "docs: document IAM role migration"

git -C E:\coding\aisphereio\aisphere-iam-front add README.md docs/superpowers/plans/2026-07-14-iam-role-first-access-control.md
git -C E:\coding\aisphereio\aisphere-iam-front commit -m "docs: add IAM role console rollout plan"
```

- [ ] Review both branch histories and diffs before asking the user to merge.

```powershell
git -C E:\coding\aisphereio\aisphere-iam log --oneline --decorate main..HEAD
git -C E:\coding\aisphereio\aisphere-iam diff --check main...HEAD
git -C E:\coding\aisphereio\aisphere-iam-front log --oneline --decorate main..HEAD
git -C E:\coding\aisphereio\aisphere-iam-front diff --check main...HEAD
```

Expected: scoped commits, no whitespace errors, and no unrelated user changes removed.

## Completion Criteria

- A platform or organization administrator has one direct scoped relationship, not one relationship per inherited responsibility or child resource.
- Organization administrators manage groups through zone inheritance; they do not appear as direct group managers.
- Built-in roles remain native SpiceDB relations and continue to work.
- Custom roles select manifest-backed permissions and work for resource-level user/group sharing.
- Role changes are versioned, audited, impact-previewed, and projected idempotently.
- The frontend presents one `访问控制` product with roles first, assignments second, diagnosis third, and raw governance last.
- Backend and frontend targeted tests, generation gates, builds, and local smoke tests pass.

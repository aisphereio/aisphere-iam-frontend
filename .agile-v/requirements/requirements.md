# Requirements — aisphere-iam-front

> **Revision:** C1 | **Date:** 2026-07-14 | **Status:** APPROVED
> **Extracted by:** ZCode (system-understanding-agent)
> **Validated by:** yuanyp8
> **Human Gate 1:** Approved

## 1. Purpose

This document defines the functional and non-functional requirements for the aisphere-iam-front project — the IAM (Identity & Access Management) Console for the Aisphere platform. Each requirement specifies the API contract, UI behavior, constraints, verification criteria, and done criteria.

The IAM Console provides:
- Read-only user directory from Casdoor (external identity provider)
- Multi-level hierarchical group/organization tree with member management
- Control plane organization and project lifecycle management
- Resource type and resource instance browsing
- Role template and grant/revoke access management
- Business-friendly permission management console
- Technical permission center with SpiceDB schema editing
- Full bilingual (Chinese/English) support

## 2. Backend Targets

| Service | Env Var | Default URL | Function |
|---------|---------|-------------|----------|
| IAM Backend | `NEXT_PUBLIC_IAM_URL` | `https://iam.weagent.cc` | All IAM APIs |
| Gateway Login | `NEXT_PUBLIC_GATEWAY_LOGIN_URL` | (same origin) | OIDC login redirect |
| Gateway Logout | `NEXT_PUBLIC_GATEWAY_LOGOUT_URL` | (same origin) | OIDC logout redirect |

## 3. Requirement Status Legend

| Status | Meaning |
|--------|---------|
| `OBSERVED_IMPLEMENTED` | Executable implementation found in codebase |
| `PARTIAL_IMPLEMENTATION` | Some layers exist, full path incomplete |
| `CONTRACT_ONLY` | API contract exists, implementation absent |
| `ARCHITECTURE_REQUIRED` | Required by architecture, main does not comply |
| `OBSOLETE` | Must not remain in target product contract |

## 4. Requirement Summary

| Domain | Count | P0 | P1 | P2 |
|--------|-------|----|----|----|
| Authentication | 6 | 4 | 2 | 0 |
| User Directory | 6 | 5 | 1 | 0 |
| Group Management | 8 | 7 | 1 | 0 |
| Organization | 5 | 4 | 1 | 0 |
| Project | 5 | 4 | 1 | 0 |
| Resource | 6 | 5 | 1 | 0 |
| Grant | 6 | 5 | 1 | 0 |
| Permission Console | 10 | 8 | 2 | 0 |
| Authz Admin | 6 | 5 | 1 | 0 |
| Layout & Navigation | 8 | 6 | 2 | 0 |
| Engineering | 4 | 3 | 1 | 0 |
| **Total** | **70** | **56** | **14** | **0** |

---

## 5. Authentication

### REQ-FE-AUTH-001 — OIDC Login via Envoy Gateway
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The application must support OIDC authentication via Envoy Gateway. Users access the protected route and are redirected to Casdoor for login.
- **API:** Gateway handles OIDC flow; frontend calls `GET /v1/iam/me` to verify authentication
- **UI:** Login page with Casdoor SSO button, three states: idle (login button), checking (spinner), error (error message)
- **Constraint:** No token management in frontend — all auth handled by Envoy Gateway
- **Verification:** Navigate to app URL → redirected to Casdoor → login → redirected back → see main console
- **Done criteria:** Login page renders correctly, OIDC flow completes, user sees main console after auth

### REQ-FE-AUTH-02 — Current User Info (useMe)
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The frontend must fetch and display the current authenticated user's principal information.
- **API:** `GET /v1/iam/me` returns `IamPrincipal` (subjectId, subjectType, provider, orgId, username, email, roles, groups, etc.)
- **UI:** Profile dialog shows user details (avatar, ID, email, phone, org, issuer, auth method, roles); sidebar shows avatar + display name + role badge
- **Constraint:** Must handle both camelCase and snake_case field names from backend
- **Verification:** Login → see user info in sidebar and profile dialog
- **Done criteria:** Principal fetched on load, displayed in sidebar and profile dialog

### REQ-FE-AUTH-003 — Logout
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The user must be able to log out, which redirects to the gateway logout URL.
- **API:** `buildGatewayLogoutUrl()` constructs the logout URL
- **UI:** Logout button in sidebar user profile section
- **Constraint:** Logout must clear the session on the gateway side
- **Verification:** Click logout → redirect to gateway logout → redirect to login page
- **Done:** Logout redirects correctly, user cannot access console after logout

### REQ-FE-AUTH-004 — Auth State Management
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The application must manage authentication state: loading, authenticated, unauthenticated, and error states.
- **API:** `useMe(true)` with enabled flag; `request()` with `credentials: 'include'` and `redirect: 'manual'`
- **UI:** Login page shows appropriate state; AppShell conditionally renders login or console
- **Constraint:** Must detect 3xx redirect responses and throw "Authentication required"
- **Verification:** Test all states: unauthenticated → login page, authenticated → console, network error → error state
- **Done:** All auth states handled gracefully

### REQ-FE-AUTH-005 — Profile Dialog
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** A profile dialog must display detailed user information.
- **API:** Same as REQ-FE-AUTH-002
- **UI:** Dialog with avatar, subjectId, username, displayName, email, phone, organization, issuer, auth method, roles
- **Constraint:** Dialog must be accessible from sidebar user profile
- **Verification:** Click user profile in sidebar → profile dialog opens with all fields
- **Done:** Profile dialog shows all principal fields

### REQ-FE-AUTH-006 — Identity Org Selector
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The user must be able to select a Casdoor organization for identity directory operations.
- **API:** Organization ID is passed as a query parameter to directory API calls
- **UI:** Organization selector in topbar, persisted to localStorage
- **Constraint:** Only affects identity tabs (users, groups, permissions); control plane tabs use their own org context
- **Verification:** Switch org → user/group lists update to show that org's data
- **Done:** Org selector works, selection persists across page reloads

---

## 6. User Directory

### REQ-FE-USER-001 — External Users List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The users page must display a read-only list of Casdoor external users.
- **API:** `GET /v1/iam/orgs/{orgId}/users` returns paginated user list
- **UI:** Table with columns: username, displayName, email, externalId, org, groups, status
- **Constraint:** Read-only — user creation, password, MFA remain in Casdoor
- **Verification:** Navigate to Users tab → table loads with user data
- **Done:** Users table renders with all columns, data loads from API

### REQ-FE-USER-002 — User Search
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be searchable by username, displayName, email, roles, and groups.
- **API:** Search parameters passed as query params to the list endpoint
- **UI:** Search input with placeholder text, filters results as user types
- **Constraint:** Search is server-side (API-driven)
- **Verification:** Type in search → results filter in real-time
- **Done:** Search works across all specified fields

### REQ-FE-USER-003 — User Detail Dialog
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Clicking a user row must open a detail dialog showing all user information.
- **API:** Same as list endpoint (data already loaded) or individual `GET /v1/iam/orgs/{orgId}/users/{userId}`
- **UI:** Dialog with all user fields, roles, group memberships
- **Constraint:** Dialog must be scrollable for long content
- **Verification:** Click user row → dialog opens with complete user info
- **Done:** User detail dialog shows all fields

### REQ-FE-USER-004 — User Pagination
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The users list must support pagination for large directories.
- **API:** Pagination parameters in API call
- **UI:** Pagination controls (page numbers, next/prev)
- **Constraint:** Must handle large user directories (1000+ users)
- **Verification:** Navigate through pages → data loads correctly
- **Done:** Pagination works, page controls visible

### REQ-FE-USER-005 — User Status Indicator
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** User status (enabled/disabled) must be visually indicated.
- **API:** User object includes `enabled` field
- **UI:** Status badge or icon in table row
- **Constraint:** Use color coding (green=enabled, red=disabled)
- **Verification:** Users with different statuses show different indicators
- **Done:** Status indicators visible in table

### REQ-FE-USER-006 — Refresh Users
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** A refresh button must allow manual refresh of the user list.
- **API:** Re-fetches the list endpoint
- **UI:** Refresh button in the users page header
- **Constraint:** Must invalidate React Query cache
- **Verification:** Click refresh → data reloads
- **Done:** Refresh button works

---

## 7. Group Management

### REQ-FE-GROUP-001 — Multi-level Organization Tree
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Groups must be displayed as a multi-level hierarchical tree with expand/collapse.
- **API:** `GET /v1/iam/orgs/{orgId}/groups` returns group list with parentId/path
- **UI:** Left panel shows tree using react-arborist, root node = user source / zone
- **Constraint:** Must derive hierarchy from `parentId` or slash-separated `path` field
- **Verification:** Navigate to Groups tab → tree renders with expandable nodes
- **Done:** Tree renders correctly, expand/collapse works

### REQ-FE-GROUP-002 — Inline Member Display
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Group members must be displayed inline under each group tree node.
- **API:** Group object includes `users[]` array
- **UI:** Members shown as avatar + name under group node
- **Constraint:** Members must be visually distinct from sub-groups
- **Verification:** Expand group → members appear under the group
- **Done:** Members display inline

### REQ-FE-GROUP-003 — Group CRUD
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to create, update, and delete groups.
- **API:** `POST /v1/iam/orgs/{orgId}/groups`, `PUT /v1/iam/orgs/{orgId}/groups/{groupId}`, `DELETE /v1/iam/orgs/{orgId}/groups/{groupId}`
- **UI:** Organization Management Card with create/update/delete forms, set parent, type, displayName
- **Constraint:** Delete must support recursive option
- **Verification:** Create group → appears in tree → update name → name changes → delete → group removed
- **Done:** CRUD operations work correctly

### REQ-FE-GROUP-004 — Assign/Remove Users to/from Groups
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be assignable to and removable from groups.
- **API:** `POST /v1/iam/orgs/{orgId}/groups/{groupId}/members`, `DELETE /v1/iam/orgs/{orgId}/groups/{groupId}/members/{userId}`
- **UI:** Add member dropdown in right panel, remove button on each member
- **Constraint:** Must show available users in dropdown
- **Verification:** Select group → add user → user appears in members → remove user → user removed
- **Done:** Assign/remove works

### REQ-FE-GROUP-005 — Right Panel Detail View
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Selecting a tree node must show a detail panel on the right.
- **API:** Same as list (data already loaded)
- **UI:** Right panel shows context-dependent content:
  - Root: top-level orgs + all users, org management card
  - Group: path, member list, add member, sub-orgs, org management card
  - User: details (avatar, ID, email, phone, org, provider), group memberships, roles
- **Constraint:** Panel must update when different node types are selected
- **Verification:** Click different node types → right panel updates accordingly
- **Done:** Detail panel works for all node types

### REQ-FE-GROUP-006 — Flat Data Detection
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The groups page must detect when the backend returns flat data (no parentId/path) and show a diagnostic warning.
- **API:** Same as list endpoint
- **UI:** Diagnostic warning banner, debug panel showing raw group fields
- **Constraint:** Must not break the UI when data is flat
- **Verification:** Backend returns flat data → warning shown → user can manually assign parents
- **Done:** Flat data detection works

### REQ-FE-GROUP-007 — Auto-expand Root Groups
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Root-level groups must auto-expand on first load.
- **API:** Same as list endpoint
- **UI:** Tree auto-expands root nodes
- **Constraint:** Only on initial load, not on subsequent refreshes
- **Verification:** Navigate to Groups tab → root groups are expanded
- **Done:** Auto-expand works

### REQ-FE-GROUP-008 — Expand/Collapse All
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to expand or collapse all tree nodes.
- **API:** N/A (UI-only)
- **UI:** Expand/collapse all buttons in tree header, expand count display
- **Constraint:** Must handle large trees efficiently
- **Verification:** Click expand all → all nodes expand → click collapse all → all nodes collapse
- **Done:** Expand/collapse all works

---

## 8. Organization (Control Plane)

### REQ-FE-ORG-001 — Organizations List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The organizations tab must display a table of control plane organizations.
- **API:** `GET /v1/iam/control-plane/organizations`
- **UI:** Table with columns: slug, displayName, status, casdoorOrg, plan, created
- **Constraint:** Must show archived organizations with visual distinction
- **Verification:** Navigate to Organizations tab → table loads with org data
- **Done:** Organizations table renders

### REQ-FE-ORG-002 — Create Organization
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to create new control plane organizations.
- **API:** `POST /v1/iam/control-plane/organizations`
- **UI:** Create dialog with form fields (slug, displayName, casdoorOrg, plan, region, metadata)
- **Constraint:** Slug must be unique
- **Verification:** Fill form → submit → new org appears in table
- **Done:** Create organization works

### REQ-FE-ORG-003 — Update Organization
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to update organization details.
- **API:** `PUT /v1/iam/control-plane/organizations/{orgId}`
- **UI:** Edit dialog pre-filled with current values
- **Constraint:** Slug cannot be changed after creation
- **Verification:** Edit org → change displayName → save → table updates
- **Done:** Update organization works

### REQ-FE-ORG-004 — Archive Organization
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to archive (soft-delete) organizations.
- **API:** `POST /v1/iam/control-plane/organizations/{orgId}/archive`
- **UI:** Archive button with confirmation dialog
- **Constraint:** Archived orgs must be visually distinct
- **Verification:** Archive org → status changes to archived → org still visible but marked
- **Done:** Archive organization works

### REQ-FE-ORG-005 — Organization Search
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Organizations must be searchable by slug and displayName.
- **API:** Search parameter in list endpoint
- **UI:** Search input in table header
- **Constraint:** Client-side or server-side search
- **Verification:** Type search query → table filters
- **Done:** Organization search works

---

## 9. Project

### REQ-FE-PROJ-001 — Projects List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The projects tab must display a table of projects under an organization.
- **API:** `GET /v1/iam/control-plane/organizations/{orgId}/projects`
- **UI:** Table with columns: slug, displayName, org, status, visibility, resources count, created
- **Constraint:** Must filter by selected organization
- **Verification:** Navigate to Projects tab → table loads with project data
- **Done:** Projects table renders

### REQ-FE-PROJ-002 — Create Project
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to create new projects under an organization.
- **API:** `POST /v1/iam/control-plane/organizations/{orgId}/projects`
- **UI:** Create dialog with org selector, form fields (slug, displayName, description, visibility)
- **Constraint:** Must select an organization
- **Verification:** Create project → appears in table under selected org
- **Done:** Create project works

### REQ-FE-PROJ-003 — Update Project
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to update project details.
- **API:** `PUT /v1/iam/control-plane/projects/{projectId}`
- **UI:** Edit dialog pre-filled with current values
- **Constraint:** Slug cannot be changed after creation
- **Verification:** Edit project → change displayName → save → table updates
- **Done:** Update project works

### REQ-FE-PROJ-004 — Archive Project
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to archive (soft-delete) projects.
- **API:** `POST /v1/iam/control-plane/projects/{projectId}/archive`
- **UI:** Archive button with confirmation dialog
- **Constraint:** Archived projects must be visually distinct
- **Verification:** Archive project → see status change
- **Done:** Archive project works

### REQ-FE-PROJ-005 — Capabilities Management
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to view and toggle project capabilities.
- **API:** `GET /v1/iam/control-plane/capabilities`, `GET /v1/iam/control-plane/projects/{projectId}/capabilities`, `POST /v1/iam/control-plane/projects/{projectId}/capabilities/{capabilityId}/enable`, `POST .../disable`
- **UI:** Capabilities list with enable/disable toggles
- **Constraint:** Only available capabilities can be enabled
- **Verification:** View capabilities → toggle enable/disable → state changes
- **Done:** Capabilities management works

---

## 10. Resource

### REQ-FE-RES-001 — Resource Types List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The resources tab must display a list of registered resource types.
- **API:** `GET /v1/iam/control-plane/resource-types`
- **UI:** Table with columns: type, spicedbType, relations, permissions, grantable
- **Constraint:** Resource types are system-defined
- **Verification:** Navigate to Resources tab → resource types table loads
- **Done:** Resource types table renders

### REQ-FE-RES-002 — Resource Instances List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to view resource instances filtered by type.
- **API:** `GET /v1/iam/control-plane/resources?type={type}`
- **UI:** Two-column layout: resource types (left) + resources (right) with type filter
- **Constraint:** Must filter by selected resource type
- **Verification:** Select resource type → resources list updates
- **Done:** Resources list works with type filter

### REQ-FE-RES-003 — Resource Detail
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Clicking a resource must show its detail card.
- **API:** `GET /v1/iam/control-plane/resources/{resourceId}`
- **UI:** Detail card with resource ref (type, id), orgId, projectId, parent, displayName, status
- **Constraint:** Detail card must be scrollable
- **Verification:** Click resource → detail card shows all fields
- **Done:** Resource detail works

### REQ-FE-RES-004 — Resource Bindings
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to view resource bindings.
- **API:** `GET /v1/iam/control-plane/resources/{resourceId}/bindings`
- **UI:** Bindings list in resource detail card
- **Constraint:** Bindings show related resources and relation types
- **Verification:** View resource → see bindings list
- **Done:** Resource bindings display

### REQ-FE-RES-005 — Resource Type Detail
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Clicking a resource type must show its detailed definition.
- **API:** `GET /v1/iam/control-plane/resource-types/{type}`
- **UI:** Detail view with relations, permissions, grantable roles
- **Constraint:** Must show human-readable descriptions
- **Verification:** Click resource type → detail view shows all definitions
- **Done:** Resource type detail works

### REQ-FE-RES-006 — Resource Search
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Resources must be searchable by ID and displayName.
- **API:** Search parameter in list endpoint
- **UI:** Search input in resources panel
- **Constraint:** Search is server-side
- **Verification:** Type query → resources filter
- **Done:** Resource search works

---

## 11. Grant

### REQ-FE-GRANT-001 — Role Templates List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The grants tab must display a list of role templates.
- **API:** `GET /v1/iam/control-plane/role-templates`
- **UI:** Table with columns: roleKey, displayName, resourceType, relation, builtIn
- **Constraint:** Built-in roles are system-defined and cannot be modified
- **Verification:** Navigate to Grants tab → role templates table loads
- **Done:** Role templates table renders

### REQ-FE-GRANT-002 — Active Grants List
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The grants tab must display a list of active access grants.
- **API:** `GET /v1/iam/control-plane/grants`
- **UI:** Table with columns: resource, relation, roleKey, subject, source, reason, expiresAt
- **Constraint:** Must show both active and expired grants
- **Verification:** View grants tab → active grants table loads
- **Done:** Active grants table renders

### REQ-FE-GRANT-003 — Grant Access
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to grant access to a subject on a resource.
- **API:** `POST /v1/iam/control-plane/grants`
- **UI:** Grant access form with fields: resource type, resource ID, subject type, subject ID, role, reason, expiration
- **Constraint:** Must validate that the role is applicable to the resource type
- **Verification:** Fill form → submit → new grant appears in grants table
- **Done:** Grant access works

### REQ-FE-GRANT-004 — Revoke Access
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to revoke an access grant.
- **API:** `POST /v1/iam/control-plane/grants/{grantId}/revoke`
- **UI:** Revoke button with confirmation dialog
- **Constraint:** Revocation must be auditable
- **Verification:** Click revoke → confirm → grant removed from active list
- **Done:** Revoke access works

### REQ-FE-GRANT-005 — Explain Access
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to explain why a subject has (or doesn't have) access.
- **API:** `POST /v1/iam/control-plane/grants/explain`
- **UI:** Explain access dialog showing grant chain
- **Constraint:** Must show the full relationship chain
- **Verification:** Explain access → see full chain of grants
- **Done:** Explain access works

### REQ-FE-GRANT-006 — Grant Filtering
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Grants must be filterable by resource type, subject, and status.
- **API:** Filter parameters in list endpoint
- **UI:** Filter controls above grants table
- **Constraint:** Filters can be combined
- **Verification:** Apply filters → grants table updates
- **Done:** Grant filtering works

---

## 12. Permission Console

### REQ-FE-PERM-001 — Business Permission Console
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** A business-friendly permission management console with 5 sections must be available.
- **API:** Multiple (authz admin, permission, grant APIs)
- **UI:** Left sidebar with 5 sections: Resource Access, Personnel Permissions, Permission Diagnosis, Roles & Capabilities, Model Settings
- **Constraint:** Must use business-friendly labels, not technical SpiceDB terms
- **Verification:** Navigate to Permissions tab → see 5 sections in sidebar
- **Done:** Business permission console renders

### REQ-FE-PERM-002 — Resource Access Management
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to manage access to resources by selecting a resource and assigning roles to users/groups.
- **API:** `POST /v1/iam/permissions/write-relationship`, `POST /v1/iam/control-plane/grants`
- **UI:** Resource selector → role selector → subject selector → grant button; view current members with roles
- **Constraint:** Must show current members and their roles
- **Verification:** Select resource → assign role to user → user appears in member list
- **Done:** Resource access management works

### REQ-FE-PERM-003 — Personnel Permissions
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to view a person's or group's direct roles and query their effective permissions on a resource.
- **API:** `POST /v1/iam/authz/effective-permissions`
- **UI:** Select person/group → view direct roles → query effective permissions on a resource
- **Constraint:** Must show both direct and inherited permissions
- **Verification:** Select person → see roles → query permissions → see results
- **Done:** Personnel permissions works

### REQ-FE-PERM-004 — Permission Diagnosis
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to check if a subject can perform an action on a resource and explain why.
- **API:** `POST /v1/iam/authz/check-permission`, `POST /v1/iam/authz/explain-permission`
- **UI:** Form: subject → resource → action → check button; results show allowed/denied with explanation
- **Constraint:** Must show both check and explain results
- **Verification:** Check permission → see result → explain → see chain
- **Done:** Permission diagnosis works

### REQ-FE-PERM-005 — Roles & Capabilities Browser
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to browse resource types, assignable roles, and permission categories.
- **API:** `GET /v1/iam/control-plane/resource-types`, `GET /v1/iam/control-plane/role-templates`
- **UI:** Browse view with resource types → roles → permission expressions
- **Constraint:** Must show human-readable role meanings
- **Verification:** Browse resource types → see roles → see permission definitions
- **Done:** Roles & capabilities browser works

### REQ-FE-PERM-006 — Model Settings (Schema Editor)
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to view, validate, and publish the SpiceDB authorization schema.
- **API:** `GET /v1/iam/authz/schema`, `POST /v1/iam/authz/validate-schema`, `POST /v1/iam/authz/publish-schema`
- **UI:** Schema editor with validate and publish buttons
- **Constraint:** Schema changes are audited
- **Verification:** View schema → edit → validate → publish
- **Done:** Schema editor works

### REQ-FE-PERM-007 — Technical Permission Center
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** A technical permission center with full SpiceDB access must be available.
- **API:** All authz admin APIs
- **UI:** Tabbed interface: Model, Subject, Resource, Diagnose, Advanced
- **Constraint:** More technical than the business console
- **Verification:** Navigate to Permission Center → see all tabs
- **Done:** Technical permission center renders

### REQ-FE-PERM-008 — Resource Model Explorer
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The permission center must have a resource model explorer that groups resource types by category.
- **API:** `GET /v1/iam/authz/schema`, `GET /v1/iam/control-plane/resource-types`
- **UI:** Resource types grouped by category (subject, identity, platform, asset, runtime, system) with detailed view
- **Constraint:** Must show human-readable descriptions
- **Verification:** Navigate to Model tab → see categorized resource types
- **Done:** Resource model explorer works

### REQ-FE-PERM-009 — Authorization Preview
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Before granting access, users must see a preview of the authorization.
- **API:** N/A (UI-only, derived from form state)
- **UI:** Preview card showing: resource → role → subject with technical details expandable
- **Constraint:** Preview must be accurate
- **Verification:** Fill grant form → see preview → confirm
- **Done:** Authorization preview works

### REQ-FE-PERM-010 — Plain Language Hero
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The permission center must include a "Plain Language Hero" card explaining the permission model.
- **API:** N/A (UI-only)
- **UI:** Card explaining the permission model in 4 steps: Who → What → How → Why
- **Constraint:** Must be bilingual (Chinese/English)
- **Verification:** Navigate to permission center → see hero card
- **Done:** Plain language hero renders

---

## 13. Authz Admin

### REQ-FE-AUTHZ-001 — SpiceDB Schema Viewer
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to view the current SpiceDB authorization schema.
- **API:** `GET /v1/iam/authz/schema`
- **UI:** Schema text display with syntax highlighting
- **Constraint:** Schema is read-only by default
- **Verification:** Navigate to Authz Admin → schema loads
- **Done:** Schema viewer works

### REQ-FE-AUTHZ-002 — Schema Validation
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to validate schema changes before publishing.
- **API:** `POST /v1/iam/authz/validate-schema`
- **UI:** Validate button, validation result display (errors/warnings)
- **Constraint:** Must show line-level error details
- **Verification:** Edit schema → validate → see results
- **Done:** Schema validation works

### REQ-FE-AUTHZ-003 — Schema Publishing
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to publish validated schema changes.
- **API:** `POST /v1/iam/authz/publish-schema`
- **UI:** Publish button with confirmation dialog
- **Constraint:** Publishing requires validation first
- **Verification:** Validate → publish → schema updated
- **Done:** Schema publishing works

### REQ-FE-AUTHZ-004 — Relationship Management
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to list, create, and delete SpiceDB relationships.
- **API:** `GET /v1/iam/authz/relationships`, `POST /v1/iam/authz/write-relationship`, `POST /v1/iam/authz/delete-relationships`
- **UI:** Relationship list with filters, create form, delete button
- **Constraint:** Must show relationship tuples (resource, relation, subject)
- **Verification:** List relationships → create new → appears in list → delete → removed
- **Done:** Relationship management works

### REQ-FE-AUTHZ-005 — Permission Check
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to check and explain permissions.
- **API:** `POST /v1/iam/authz/check-permission`, `POST /v1/iam/authz/explain-permission`
- **UI:** Check form (subject, resource, permission) → result display; explain form → chain display
- **Constraint:** Must show both allowed/denied and explanation
- **Verification:** Check permission → see result → explain → see chain
- **Done:** Permission check/explain works

### REQ-FE-AUTHZ-006 — Effective Permissions
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to query effective permissions for a subject on a resource.
- **API:** `POST /v1/iam/authz/effective-permissions`
- **UI:** Query form → results table showing all effective permissions
- **Constraint:** Must show inherited permissions
- **Verification:** Query effective permissions → see all permissions
- **Done:** Effective permissions query works

---

## 14. Layout & Navigation

### REQ-FE-LAYOUT-001 — AppShell Layout
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The application must have a consistent layout with sidebar, topbar, and content area.
- **API:** N/A
- **UI:** AppShell component: sidebar (left) + topbar (top) + content area (center)
- **Constraint:** Must handle mobile responsive layout
- **Verification:** Load app → see sidebar, topbar, content
- **Done:** AppShell renders correctly

### REQ-FE-LAYOUT-002 — Collapsible Sidebar
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The sidebar must be collapsible (56px collapsed, 268px expanded) with smooth animation.
- **API:** N/A
- **UI:** Collapse toggle button, smooth width transition, tooltips when collapsed
- **Constraint:** Must preserve active state when collapsed
- **Verification:** Click collapse → sidebar shrinks → click expand → sidebar expands
- **Done:** Sidebar collapse/expand works

### REQ-FE-LAYOUT-003 — Navigation Sections
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The sidebar must have organized navigation sections with collapsible groups.
- **API:** N/A
- **UI:** Three sections: Identity Directory (Users, Groups), Resource Domain (Projects, Resources), Permission Governance (Grants & Roles, Permission Console)
- **Constraint:** Active tab must be highlighted with gradient indicator
- **Verification:** Click each nav item → page changes → active indicator updates
- **Done:** Navigation works

### REQ-FE-LAYOUT-004 — Theme Toggle
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** Users must be able to toggle between light and dark themes.
- **API:** N/A
- **UI:** Theme toggle button in sidebar and topbar
- **Constraint:** Theme must persist across page reloads
- **Verification:** Toggle theme → UI switches between light/dark → reload → theme persists
- **Done:** Theme toggle works

### REQ-FE-LAYOUT-005 — Internationalization
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The application must support both Chinese and English languages.
- **API:** N/A
- **UI:** Language toggle in topbar, all UI text in selected language
- **Constraint:** ~225 translation keys per language
- **Verification:** Switch to Chinese → all text in Chinese → switch to English → all text in English
- **Done:** Internationalization works

### REQ-FE-LAYOUT-006 — Mobile Responsive
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The layout must be responsive for mobile devices.
- **API:** N/A
- **UI:** Mobile hamburger menu, sidebar becomes overlay with backdrop
- **Constraint:** Must work on tablet and phone screen sizes
- **Verification:** Resize to mobile width → sidebar becomes overlay → hamburger menu works
- **Done:** Mobile responsive layout works

### REQ-FE-LAYOUT-007 — Topbar
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The topbar must show page title, identity org selector, language toggle, and theme toggle.
- **API:** N/A
- **UI:** Topbar with: mobile hamburger, page title, org selector dropdown, language toggle, theme toggle
- **Constraint:** Org selector only visible for identity tabs
- **Verification:** Navigate between tabs → topbar updates title → org selector appears/disappears
- **Done:** Topbar renders correctly

### REQ-FE-LAYOUT-008 — Loading States
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** All pages must show appropriate loading states while data is being fetched.
- **API:** N/A
- **UI:** Skeleton components (CardGrid, List, Table) while loading
- **Constraint:** Must not show empty states during loading
- **Verification:** Navigate to page → see skeleton → data loads → skeleton replaced
- **Done:** Loading states work

---

## 15. Engineering

### REQ-FE-ENG-001 — Docker Build
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The project must have a Dockerfile for containerized deployment.
- **API:** N/A
- **UI:** N/A
- **Constraint:** Multi-stage build (deps → builder → runner), Alpine-based, non-root user (1001), port 3001
- **Verification:** `docker build -t iam-front .` → image builds successfully
- **Done:** Dockerfile exists and builds

### REQ-FE-ENG-002 — Kubernetes Deployment
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The project must have Kubernetes deployment manifests.
- **API:** N/A
- **UI:** N/A
- **Constraint:** Kustomize-based, namespace `aisphere`, 1 replica, rolling update, resource limits (500m CPU / 512Mi RAM)
- **Verification:** `kubectl apply -k deploy/` → pods start successfully
- **Done:** K8s manifests exist

### REQ-FE-ENG-003 — CI/CD Pipeline
- **Priority:** P0 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The project must have CI/CD pipelines for building and deploying.
- **API:** N/A
- **UI:** N/A
- **Constraint:** GitHub Actions: build-image.yml (build + push to Aliyun ACR), deploy-k8s.yml (manual trigger)
- **Verification:** CI pipeline runs on push → image pushed to ACR
- **Done:** CI/CD workflows exist

### REQ-FE-ENG-004 — Health Check
- **Priority:** P1 | **Status:** `OBSERVED_IMPLEMENTED`
- **Requirement:** The application must expose a health check endpoint.
- **API:** `GET /api/healthz` returns `{ status: 'ok' }`
- **UI:** N/A
- **Constraint:** Used by K8s liveness/readiness probes
- **Verification:** `curl /api/healthz` → `{ status: 'ok' }`
- **Done:** Health check endpoint exists
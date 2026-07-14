# Test Specification — aisphere-iam-front

> **Cycle:** C1 | **Generated:** 2026-07-14 | **Status:** DRAFT
> **Designed by:** ZCode (test-designer)

## 1. Overview

| Metric | Value |
|--------|-------|
| Total TCs | 17 |
| Framework | Vitest + React Testing Library |
| Component Tests | 8 |
| E2E Tests | 9 |
| P0 Priority | 12 |
| Implemented | 0 |
| Pending | 17 |

## 2. Test Cases

### Wave 1: Authentication (TC-FE-001 ~ TC-FE-002)

| TC-ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-001 | REQ-FE-AUTH-001 | Login page renders correctly with Casdoor SSO button | Login page shows brand, Casdoor button, three states | Component | 1. Render LoginPage 2. Verify idle state 3. Verify checking state 4. Verify error state |
| TC-FE-002 | REQ-FE-AUTH-002 | useMe fetches and normalizes principal | Principal object with all fields, handles camelCase/snake_case | Component | 1. Mock API response 2. Call useMe 3. Verify normalized principal |

### Wave 2: User Directory (TC-FE-003 ~ TC-FE-005)

| TC ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-003 | REQ-FE-USER-001 | ExternalUsersPage renders user table | Table with all columns, data from API | Component | 1. Mock users API 2. Render page 3. Verify table rows |
| TC-FE-004 | REQ-FE-USER-002 | User search filters results | Results filter as user types | Component | 1. Render page 2. Type in search 3. Verify filtered results |
| TC-FE-005 | REQ-FE-USER-003 | User detail dialog shows all fields | Dialog opens with complete user info | Component | 1. Click user row 2. Verify dialog content |

### Wave 3: Group Management (TC-FE-006 ~ TC-FE-008)

| TC ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-006 | REQ-FE-GROUP-001 | GroupsPage renders organization tree | Tree with expandable nodes, root node visible | Component | 1. Mock groups API 2. Render page 3. Verify tree nodes |
| TC-FE-007 | REQ-FE-GROUP-003 | Group CRUD operations work | Create/update/delete groups correctly | Component | 1. Create group 2. Verify in tree 3. Update name 4. Delete |
| TC-FE-008 | REQ-FE-GROUP-004 | Assign/remove users to/from groups | User appears/removes from member list | Component | 1. Select group 2. Assign user 3. Verify member 4. Remove |

### Wave 4: Organization & Project (TC-FE-009 ~ TC-FE-010)

| TC ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-009 | REQ-FE-ORG-001 | Organizations tab renders table | Table with org data | Component | 1. Mock orgs API 2. Render tab 3. Verify table |
| TC-FE-010 | REQ-FE-PROJ-001 | Projects tab renders table | Table with project data | Component | 1. Mock projects API 2. Render tab 3. Verify table |

### Wave 5: Grant (TC-FE-011 ~ TC-FE-012)

| TC ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-011 | REQ-FE-GRANT-001 | Role templates table renders | Table with role templates | Component | 1. Mock role templates API 2. Render tab 3. Verify table |
| TC-FE-012 | REQ-FE-GRANT-003 | Grant access form submits correctly | Grant created, appears in grants table | Component | 1. Fill form 2. Submit 3. Verify grant created |

### Wave 6: Permission Console (TC-FE-013 ~ TC-FE-015)

| TC ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-013 | REQ-FE-PERM-001 | Business console renders 5 sections | 5 sidebar sections visible | Component | 1. Render page 2. Verify 5 sections |
| TC-FE-014 | REQ-FE-PERM-004 | Permission diagnosis works | Check/explain results displayed | Component | 1. Fill diagnosis form 2. Check permission 3. Verify result |
| TC-FE-015 | REQ-FE-PERM-006 | Schema editor validates and publishes | Validation results shown, publish works | Component | 1. View schema 2. Edit 3. Validate 4. Publish |

### Wave 7: Layout (TC-FE-016 ~ TC-FE-017)

| TC ID | REQ-ID | Description | Expected | Type | Steps |
|-------|--------|-------------|----------|------|-------|
| TC-FE-016 | REQ-FE-LAYOUT-001 | AppShell renders with sidebar, topbar, content | Three sections visible | Component | 1. Render AppShell 2. Verify sidebar 3. Verify topbar 4. Verify content |
| TC-FE-017 | REQ-FE-LAYOUT-005 | Language toggle switches between EN/ZH | All text switches language | Component | 1. Render page 2. Toggle language 3. Verify text changes |

## 3. Summary

| Metric | Value |
|--------|-------|
| Total TCs | 17 |
| Component tests | 17 |
| E2E tests | 0 |
| P0 priority | 8 |
| P1 priority | 9 |
| Implemented | 0 |
| Pending | 17 |
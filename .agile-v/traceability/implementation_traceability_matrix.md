# Implementation Traceability Matrix — aisphere-iam-front

> **Cycle:** C1 | **Generated:** 2026-07-14

## Authentication

| REQ-ID | ART-ID | Component | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-AUTH-001 | ART-0001 | Login Page | `src/components/layout/login-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTH-002 | ART-0002 | useMe hook | `src/hooks/use-auth.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTH-003 | ART-0003 | Logout | `src/hooks/use-auth.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTH-004 | ART-0004 | Auth State | `src/components/layout/app-shell.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTH-005 | ART-0005 | Profile Dialog | `src/components/layout/app-shell.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTH-006 | ART-0006 | Org Selector | `src/components/layout/topbar.tsx` | OBSERVED_IMPLEMENTED |

## User Directory

| REQ-ID | ART-ID | Component | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-USER-001 | ART-0007 | ExternalUsersPage | `src/components/pages/users-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-USER-002 | ART-0008 | User Search | `src/components/pages/users-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-USER-003 | ART-0009 | User Detail Dialog | `src/components/pages/users-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-USER-004 | ART-0010 | User Pagination | `src/components/pages/users-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-USER-005 | ART-0011 | User Status | `src/components/pages/users-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-USER-006 | ART-0012 | Refresh Users | `src/components/pages/users-page.tsx` | OBSERVED_IMPLEMENTED |

## Group Management

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-GROUP-001 | ART-0013 | Organization Tree | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-002 | ART-0014 | Inline Members | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-003 | ART-0015 | Group CRUD | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-004 | ART-0016 | Assign/Remove | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-005 | ART-0017 | Detail Panel | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-006 | ART-0018 | Flat Data Detection | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-007 | ART-0019 | Auto-expand | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GROUP-008 | ART-0020 | Expand/Collapse All | `src/components/pages/groups-page.tsx` | OBSERVED_IMPLEMENTED |

## Organization

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-ORG-001 | ART-0021 | Organizations List | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-ORG-002 | ART-0022 | Create Organization | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-ORG-003 | ART-0023 | Update Organization | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-ORG-004 | ART-0024 | Archive Organization | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-ORG-005 | ART-0025 | Organization Search | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |

## Project

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-PROJ-001 | ART-0026 | Projects List | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PROJ-002 | ART-0027 | Create Project | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PROJ-003 | ART-0028 | Update Project | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PROJ-004 | ART-0029 | Archive Project | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PROJ-005 | ART-0030 | Capabilities | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |

## Resource

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-RES-001 | ART-0031 | Resource Types | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-RES-002 | ART-0032 | Resource Instances | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-RES-003 | ART-0033 | Resource Detail | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-RES-004 | ART-0034 | Resource Bindings | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-RES-005 | ART-0035 | Resource Type Detail | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-RES-006 | ART-0036 | Resource Search | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |

## Grant

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-GRANT-001 | ART-0037 | Role Templates | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GRANT-002 | ART-0038 | Active Grants | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GRANT-003 | ART-0039 | Grant Access | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GRANT-004 | ART-0040 | Revoke Access | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GRANT-005 | ART-0041 | Explain Access | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-GRANT-006 | ART-0042 | Grant Filtering | `src/components/pages/iam-page.tsx` | OBSERVED_IMPLEMENTED |

## Permission Console

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-PERM-001 | ART-0043 | Business Console | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-002 | ART-0044 | Resource Access | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-003 | ART-0045 | Personnel Permissions | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-004 | ART-0046 | Permission Diagnosis | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-005 | ART-0047 | Roles Browser | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-006 | ART-0048 | Schema Editor | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-007 | ART-0049 | Technical Center | `src/components/pages/permissions-center-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-008 | ART-0050 | Model Explorer | `src/components/pages/permissions-center-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-009 | ART-0051 | Auth Preview | `src/components/pages/permissions-business-page.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-PERM-010 | ART-0052 | Plain Language Hero | `src/components/pages/permissions-center-page.tsx` | OBSERVED_IMPLEMENTED |

## Authz Admin

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-AUTHZ-001 | ART-0053 | Schema Viewer | `src/hooks/use-authz.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTHZ-002 | ART-0054 | Schema Validation | `src/hooks/use-authz.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTHZ-003 | ART-0055 | Schema Publishing | `src/hooks/use-authz.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTHZ-004 | ART-0056 | Relationship Mgmt | `src/hooks/use-authz.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTHZ-005 | ART-0057 | Permission Check | `src/hooks/use-authz.ts` | OBSERVED_IMPLEMENTED |
| REQ-FE-AUTHZ-006 | ART-0058 | Effective Permissions | `src/hooks/use-authz.ts` | OBSERVED_IMPLEMENTED |

## Layout & Navigation

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-LAYOUT-001 | ART-0059 | AppShell | `src/components/layout/app-shell.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-002 | ART-0060 | Collapsible Sidebar | `src/components/layout/sidebar.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-003 | ART-0061 | Navigation Sections | `src/components/layout/sidebar.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-004 | ART-0062 | Theme Toggle | `src/components/layout/sidebar.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-005 | ART-0063 | Internationalization | `src/lib/i18n.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-006 | ART-0064 | Mobile Responsive | `src/components/layout/sidebar.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-007 | ART-0065 | Topbar | `src/components/layout/topbar.tsx` | OBSERVED_IMPLEMENTED |
| REQ-FE-LAYOUT-008 | ART-0066 | Loading States | `src/components/shared/loading-skeleton.tsx` | OBSERVED_IMPLEMENTED |

## Engineering

| REQ-ID | ART-ID | Description | File Path | Status |
|--------|--------|-----------|-----------|--------|
| REQ-FE-ENG-001 | ART-0067 | Docker Build | `Dockerfile` | OBSERVED_IMPLEMENTED |
| REQ-FE-ENG-002 | ART-0068 | K8s Deployment | `deploy/` | OBSERVED_IMPLEMENTED |
| REQ-FE-ENG-003 | ART-0069 | CI/CD Pipeline | `.github/workflows/` | OBSERVED_IMPLEMENTED |
| REQ-FE-ENG-004 | ART-0070 | Health Check | `src/app/api/healthz/route.ts` | OBSERVED_IMPLEMENTED |
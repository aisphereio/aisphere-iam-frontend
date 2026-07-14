# Build Manifest — aisphere-iam-front

> **Cycle:** C1 | **Generated:** 2026-07-14 | **Status:** APPROVED

## Summary

| Metric | Value |
|--------|-------|
| Total REQs | 70 |
| Total ART entries | 70 |
| Missing ART | 0 |
| REQ-to-ART Coverage | 100% |

## Artifact Index

### Authentication (ART-0001 ~ ART-0006)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0001 | REQ-FE-AUTH-001 | `src/components/layout/login-page.tsx` | Login page with Casdoor SSO |
| ART-0002 | REQ-FE-AUTH-002 | `src/hooks/use-auth.ts` | useMe() hook |
| ART-0003 | REQ-FE-AUTH-003 | `src/hooks/use-auth.ts` | useLogout() hook |
| ART-0004 | REQ-FE-AUTH-004 | `src/components/layout/app-shell.tsx` | Auth state management |
| ART-0005 | REQ-FE-AUTH-005 | `src/components/layout/app-shell.tsx` | Profile dialog |
| ART-0006 | REQ-FE-AUTH-006 | `src/components/layout/topbar.tsx` | Identity org selector |

### User Directory (ART-0007 ~ ART-0012)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0007 | REQ-FE-USER-001 | `src/components/pages/users-page.tsx` | ExternalUsersPage |
| ART-0008 | REQ-FE-USER-002 | `src/components/pages/users-page.tsx` | User search |
| ART-0009 | REQ-FE-USER-003 | `src/components/pages/users-page.tsx` | User detail dialog |
| ART-0010 | REQ-FE-USER-004 | `src/components/pages/users-page.tsx` | User pagination |
| ART-0011 | REQ-FE-USER-005 | `src/components/pages/users-page.tsx` | User status indicator |
| ART-0012 | REQ-FE-USER-006 | `src/components/pages/users-page.tsx` | Refresh button |

### Group Management (ART-0013 ~ ART-0020)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0013 | REQ-FE-GROUP-001 | `src/components/pages/groups-page.tsx` | Multi-level org tree |
| ART-0014 | REQ-FE-GROUP-002 | `src/components/pages/groups-page.tsx` | Inline member display |
| ART-0015 | REQ-FE-GROUP-003 | `src/components/pages/groups-page.tsx` | Group CRUD |
| ART-0016 | REQ-FE-GROUP-004 | `src/components/pages/groups-page.tsx` | Assign/remove users |
| ART-0017 | REQ-FE-GROUP-005 | `src/components/pages/groups-page.tsx` | Right panel detail |
| ART-0018 | REQ-FE-GROUP-006 | `src/components/pages/groups-page.tsx` | Flat data detection |
| ART-0019 | REQ-FE-GROUP-007 | `src/components/pages/groups-page.tsx` | Auto-expand root |
| ART-0020 | REQ-FE-GROUP-008 | `src/components/pages/groups-page.tsx` | Expand/collapse all |

### Organization (ART-0021 ~ ART-0025)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0021 | REQ-FE-ORG-001 | `src/components/pages/iam-page.tsx` | Organizations list |
| ART-0022 | REQ-FE-ORG-002 | `src/components/pages/iam-page.tsx` | Create organization |
| ART-0023 | REQ-FE-ORG-003 | `src/components/pages/iam-page.tsx` | Update organization |
| ART-0024 | REQ-FE-ORG-004 | `src/components/pages/iam-page.tsx` | Archive organization |
| ART-0025 | REQ-FE-ORG-005 | `src/components/pages/iam-page.tsx` | Organization search |

### Project (ART-0026 ~ ART-0030)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0026 | REQ-FE-PROJ-001 | `src/components/pages/iam-page.tsx` | Projects list |
| ART-0027 | REQ-FE-PROJ-002 | `src/components/pages/iam-page.tsx` | Create project |
| ART-0028 | REQ-FE-PROJ-003 | `src/components/pages/iam-page.tsx` | Update project |
| ART-0029 | REQ-FE-PROJ-004 | `src/components/pages/iam-page.tsx` | Archive project |
| ART-0030 | REQ-FE-PROJ-005 | `src/components/pages/iam-page.tsx` | Capabilities management |

### Resource (ART-0031 ~ ART-0036)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0031 | REQ-FE-RES-001 | `src/components/pages/iam-page.tsx` | Resource types list |
| ART-0032 | REQ-FE-RES-002 | `src/components/pages/iam-page.tsx` | Resource instances |
| ART-0033 | REQ-FE-RES-003 | `src/components/pages/iam-page.tsx` | Resource detail |
| ART-0034 | REQ-FE-RES-004 | `src/components/pages/iam-page.tsx` | Resource bindings |
| ART-0035 | REQ-FE-RES-005 | `src/components/pages/iam-page.tsx` | Resource type detail |
| ART-0036 | REQ-FE-RES-006 | `src/components/pages/iam-page.tsx` | Resource search |

### Grant (ART-0037 ~ ART-0042)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0037 | REQ-FE-GRANT-001 | `src/components/pages/iam-page.tsx` | Role templates |
| ART-0038 | REQ-FE-GRANT-002 | `src/components/pages/iam-page.tsx` | Active grants |
| ART-0039 | REQ-FE-GRANT-003 | `src/components/pages/iam-page.tsx` | Grant access |
| ART-0040 | REQ-FE-GRANT-004 | `src/components/pages/iam-page.tsx` | Revoke access |
| ART-0041 | REQ-FE-GRANT-005 | `src/components/pages/iam-page.tsx` | Explain access |
| ART-0042 | REQ-FE-GRANT-006 | `src/components/pages/iam-page.tsx` | Grant filtering |

### Permission Console (ART-0043 ~ ART-0052)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0043 | REQ-FE-PERM-001 | `src/components/pages/permissions-business-page.tsx` | Business console |
| ART-0044 | REQ-FE-PERM-002 | `src/components/pages/permissions-business-page.tsx` | Resource access mgmt |
| ART-0045 | REQ-FE-PERM-003 | `src/components/pages/permissions-business-page.tsx` | Personnel permissions |
| ART-0046 | REQ-FE-PERM-004 | `src/components/pages/permissions-business-page.tsx` | Permission diagnosis |
| ART-0047 | REQ-FE-PERM-005 | `src/components/pages/permissions-business-page.tsx` | Roles browser |
| ART-0048 | REQ-FE-PERM-006 | `src/components/pages/permissions-business-page.tsx` | Schema editor |
| ART-0049 | REQ-FE-PERM-007 | `src/components/pages/permissions-center-page.tsx` | Technical center |
| ART-0050 | REQ-FE-PERM-008 | `src/components/pages/permissions-center-page.tsx` | Model explorer |
| ART-0051 | REQ-FE-PERM-009 | `src/components/pages/permissions-business-page.tsx` | Auth preview |
| ART-0052 | REQ-FE-PERM-010 | `src/components/pages/permissions-center-page.tsx` | Plain language hero |

### Authz Admin (ART-0053 ~ ART-0058)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0053 | REQ-FE-AUTHZ-001 | `src/hooks/use-authz.ts` | Schema viewer |
| ART-0054 | REQ-FE-AUTHZ-002 | `src/hooks/use-authz.ts` | Schema validation |
| ART-0055 | REQ-FE-AUTHZ-003 | `src/hooks/use-authz.ts` | Schema publishing |
| ART-0056 | REQ-FE-AUTHZ-004 | `src/hooks/use-authz.ts` | Relationship management |
| ART-0057 | REQ-FE-AUTHZ-005 | `src/hooks/use-authz.ts` | Permission check/explain |
| ART-0058 | REQ-FE-AUTHZ-006 | `src/hooks/use-authz.ts` | Effective permissions |

### Layout & Navigation (ART-0059 ~ ART-0066)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0059 | REQ-FE-LAYOUT-001 | `src/components/layout/app-shell.tsx` | AppShell layout |
| ART-0060 | REQ-FE-LAYOUT-002 | `src/components/layout/sidebar.tsx` | Collapsible sidebar |
| ART-0061 | REQ-FE-LAYOUT-003 | `src/components/layout/sidebar.tsx` | Navigation sections |
| ART-0062 | REQ-FE-LAYOUT-004 | `src/components/layout/sidebar.tsx` | Theme toggle |
| ART-0063 | REQ-FE-LAYOUT-005 | `src/lib/i18n.tsx` | Internationalization |
| ART-0064 | REQ-FE-LAYOUT-006 | `src/components/layout/sidebar.tsx` | Mobile responsive |
| ART-0065 | REQ-FE-LAYOUT-007 | `src/components/layout/topbar.tsx` | Topbar |
| ART-0066 | REQ-FE-LAYOUT-008 | `src/components/shared/loading-skeleton.tsx` | Loading states |

### Engineering (ART-0067 ~ ART-0070)

| ART-ID | REQ-ID | Path | Notes |
|--------|--------|------|-------|
| ART-0067 | REQ-FE-ENG-001 | `Dockerfile` | Multi-stage Docker build |
| ART-0068 | REQ-FE-ENG-002 | `deploy/` | K8s manifests |
| ART-0069 | REQ-FE-ENG-003 | `.github/workflows/` | CI/CD pipelines |
| ART-0070 | REQ-FE-ENG-004 | `src/app/api/healthz/route.ts` | Health check endpoint |
# System Overview — aisphere-iam-front

> **Purpose:** This document captures the system understanding of the aisphere-iam-front project at the start of Cycle C1. It serves as the basis for Gate 0 (System Understanding) approval.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.3.0-preview.5 (App Router, RSC) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.x + `tw-animate-css` |
| UI Components | shadcn/ui (Radix primitives) |
| State / Data Fetching | TanStack React Query 5.x |
| Forms | react-hook-form + zod + @hookform/resolvers |
| Tables | TanStack React Table 8.x |
| Icons | lucide-react |
| Animations | framer-motion |
| Notifications | sonner (toast) |
| Theme | next-themes (dark/light) |
| Date | date-fns |
| Tree | react-arborist |
| Calendar | react-day-picker |
| Drawer | vaul |
| State (global) | zustand |
| Package Manager | npm |
| Dev Server Port | 3001 |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Envoy Gateway                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ OIDC Filter  │  │  Route Rule  │  │  Ext Auth  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
└─────────┼─────────────────┼─────────────────┼────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────┐
│              aisphere-iam-front (Next.js)            │
│  Port: 3001                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  AppShell │  │ Sidebar  │  │  Topbar          │   │
│  │  (Layout) │  │ (Nav)    │  │  (Org/Lang)      │   │
│  └─────┬─────┘  └──────────┘  └──────────────────┘   │
│        │                                              │
│        ▼                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │           Page Router (Tab-based)             │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────┐  │    │
│  │  │Users │ │Groups│ │ IAM  │ │Permissions │  │    │
│  │  │Page  │ │Page  │ │Page  │ │  Pages (2) │  │    │
│  │  └──────┘ └──────┘ └──────┘ └────────────┘  │    │
│  └──────────────────────────────────────────────┘    │
│        │                                              │
│        ▼                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │          React Query (TanStack)               │    │
│  │  ┌────────┐ ┌────────┐ ┌──────────────────┐  │    │
│  │  │use-auth│ │use-iam │ │  use-authz       │  │    │
│  │  └────────┘ └────────┘ └──────────────────┘  │    │
│  └──────────────────────────────────────────────┘    │
│        │                                              │
│        ▼                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │  API Client (fetch + credentials: 'include')  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │    │
│  │  │Directory │ │  Control │ │  Authz Admin │  │    │
│  │  │  API     │ │  Plane   │ │     API      │  │    │
│  │  └──────────┘ └──────────┘ └──────────────┘  │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│           aisphere-iam Backend (Go)                  │
│  /v1/iam/me, /v1/iam/orgs/{orgId}/...,              │
│  /v1/iam/permissions/..., /v1/iam/authz/...,        │
│  /v1/iam/control-plane/...                          │
└─────────────────────────────────────────────────────┘
```

## Page Inventory

| Tab | Component | API Module | Status |
|-----|-----------|------------|--------|
| `users` | ExternalUsersPage | iamDirectoryApi | OBSERVED_IMPLEMENTED |
| `groups` | GroupsPage | iamDirectoryApi | OBSERVED_IMPLEMENTED |
| `organizations` | OrganizationsTab (in IamPage) | iamProjectApi | OBSERVED_IMPLEMENTED |
| `projects` | ProjectsTab (in IamPage) | iamProjectApi | OBSERVED_IMPLEMENTED |
| `grants` | GrantsTab (in IamPage) | iamGrantService | OBSERVED_IMPLEMENTED |
| `resources` | ResourcesTab (in IamPage) | iamResourceService | OBSERVED_IMPLEMENTED |
| `permissions` | PermissionsBusinessPage | iamAuthzAdminApi, iamPermissionApi, iamGrantService | OBSERVED_IMPLEMENTED |
| `permissions-center` | PermissionsCenterPage | iamAuthzAdminApi, iamPermissionApi | OBSERVED_IMPLEMENTED |

## Key Dependencies

- **Envoy Gateway** — Handles OIDC authentication, injects user identity headers
- **aisphere-iam Backend** — Provides all IAM APIs (directory, control plane, authz)
- **Casdoor** — External identity provider (user directory, OIDC)
- **SpiceDB** — Authorization engine (ReBAC relationships, permission checks)

## Known Gaps

1. No Agile-V compliance artifacts exist (this cycle addresses this)
2. No automated frontend tests (component or E2E)
3. No formal test specification
4. No traceability from requirements to implementation
5. No formal verification evidence
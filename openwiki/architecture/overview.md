# Architecture Overview

## High-Level Architecture

```
Browser ──HTTPS──> Envoy Gateway ──> Frontend Pod (port 3001)
                              └──> Backend API (port 18080, /v1/iam/*)
                              └──> Casdoor (OIDC, port 8000)
```

The frontend is a **Next.js 16 App Router** SPA deployed as a **standalone** server (`output: "standalone"`). All traffic flows through **Envoy Gateway**, which:

1. Terminates TLS
2. Handles OIDC authentication via **Casdoor**
3. Routes `/` to the frontend Service
4. Routes `/v1/iam/*` to the backend IAM Service
5. Forwards JWT claims as HTTP headers to the backend

## Frontend Component Tree

```
RootLayout (server component)
├── ThemeProvider (next-themes)
├── I18nProvider (custom i18n context)
├── Toaster (sonner)
├── TitleUpdater (dynamic document.title)
└── IamConsole (client component)
    └── QueryClientProvider (TanStack React Query)
        └── AppShell
            ├── LoginPage (when not authenticated)
            └── [Authenticated Layout]
                ├── Sidebar (navigation, profile, theme toggle)
                ├── Topbar (tab title, org selector, language, theme)
                └── PageRouter
                    ├── IamPage
                    │   ├── OrganizationsTab
                    │   ├── ProjectsTab
                    │   ├── GrantsTab
                    │   └── ResourcesTab
                    ├── UsersPage (ExternalUsersPage)
                    ├── GroupsPage (tree view)
                    └── PermissionsPage
                        ├── Resource View
                        ├── Subject View
                        ├── Explain View
                        └── Model View
```

## Data Flow

### Authentication Flow

1. **Initial load**: `AppShell` calls `useMe(true)` → `GET /v1/iam/me`
2. **Not authenticated**: Response is a redirect (302) → `request()` throws "Authentication required" → `AppShell` renders `LoginPage` with `state="idle"`
3. **User clicks login**: Redirects to `buildGatewayLoginUrl()` → Envoy Gateway OIDC flow → Casdoor login → redirect back
4. **Authenticated**: `useMe` returns `IamPrincipal` → `AppShell` renders full app
5. **Logout**: `useLogout()` redirects to `buildGatewayLogoutUrl()` → Envoy Gateway clears cookies

### API Data Flow

```
Component → React Query Hook → API Service → request() → fetch() → Backend
                                                              ↓
Component ← React Query Cache ← Normalizer ← JSON Response
```

- All API calls go through `src/lib/api/client.ts` → `request<T>(path, init)`
- The `request()` wrapper handles: JSON serialization, credentials (`include`), redirect detection, error extraction
- Response normalizers in `src/lib/api/index.ts` convert snake_case → camelCase
- React Query manages caching, refetching, and mutation invalidation

## Key Design Decisions

### 1. Gateway-Only OIDC (No Browser Token Storage)

The frontend never stores or manages JWT tokens. Envoy Gateway handles the entire OIDC flow and sets HTTP-only cookies. The frontend simply checks `/v1/iam/me` to determine authentication state. This is enforced by the `storage-compat.d.ts` type declaration:

```typescript
// Deprecated placeholder kept only to avoid a disruptive file deletion in older checkouts.
// Gateway-only OIDC does not use browser token storage.
export {};
```

### 2. Standalone Next.js Output

`next.config.ts` sets `output: "standalone"`, producing a self-contained server in `.next/standalone/` that includes only the necessary runtime files. This is critical for the Docker multi-stage build.

### 3. Bilingual i18n

The custom `I18nProvider` (`src/lib/i18n.tsx`) supports English and Chinese with ~200+ translation keys. Locale is detected from the browser and persisted in `localStorage`. No third-party i18n library is used.

### 4. shadcn/ui + Tailwind CSS v4

UI components are built on Radix primitives with Tailwind CSS v4 styling. The color system uses OKLCH color space with CSS custom properties for light and dark themes. The primary color is a purple/violet hue.

## Source Map

| File | Role |
|------|------|
| `src/app/layout.tsx` | Root server layout, wraps with ThemeProvider, I18nProvider, Toaster |
| `src/app/page.tsx` | Main client page, creates QueryClient, renders IamConsole |
| `src/app/globals.css` | Tailwind v4 imports, OKLCH theme variables, shadcn/ui CSS |
| `src/app/api/healthz/route.ts` | Health check endpoint for K8s probes |
| `src/components/layout/app-shell.tsx` | Auth gate, tab routing, sidebar/topbar orchestration |
| `src/components/layout/sidebar.tsx` | Navigation with collapsible sections, profile, theme toggle |
| `src/components/layout/topbar.tsx` | Tab title, org selector, language/theme toggles |
| `src/components/layout/login-page.tsx` | Login screen with animated gradient orbs |
| `src/lib/api/client.ts` | HTTP client with redirect handling |
| `src/lib/api/index.ts` | All API service definitions and response normalizers |
| `src/lib/api/types.ts` | All domain TypeScript interfaces |
| `src/hooks/use-auth.ts` | `useMe`, `useLogout` hooks |
| `src/hooks/use-authz.ts` | AuthZ schema, relationships, check, explain hooks |
| `src/hooks/use-iam.ts` | Directory, control plane, resource, grant hooks |
| `src/lib/i18n.tsx` | Custom i18n provider with EN/ZH dictionaries |
| `src/lib/utils.ts` | `cn()`, date formatting, status colors |

## Important Notes for Future Agents

- **All interactive components are `'use client'`** — the root layout is the only server component
- **React StrictMode is disabled** (`reactStrictMode: false`) — be aware of double-render effects
- **TypeScript build errors are ignored** (`ignoreBuildErrors: true`) — the build will succeed even with type errors
- **The `@/*` path alias** maps to `src/` — all imports use this convention
- **API paths are versioned** under `/v1/iam/` — the frontend does not control the API version
- **The health check endpoint** (`/api/healthz`) is used by all three K8s probes — it must remain lightweight and always return 200
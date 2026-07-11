# Aisphere IAM Frontend — Quickstart

## Overview

**aisphere-iam-front** is the web console for the Aisphere Identity & Access Management (IAM) platform. It provides a modern, bilingual (Chinese/English) admin interface for managing users, groups, organizations, projects, permissions, and access grants — all backed by **Casdoor** (identity provider) and **SpiceDB** (relationship-based authorization).

The frontend is a **Next.js 16** (App Router) single-page application deployed on **Kubernetes** behind **Envoy Gateway**, which handles OIDC authentication transparently. No browser-side token storage is needed.

## Repository Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages, layout, global CSS, health check API |
| `src/components/layout/` | App shell, sidebar, topbar, login page, language toggle |
| `src/components/pages/` | Feature pages: IAM, Users, Groups, Permissions |
| `src/components/ui/` | shadcn/ui component primitives |
| `src/components/shared/` | Empty state, loading skeletons |
| `src/hooks/` | React Query hooks for auth, authz, and IAM operations |
| `src/lib/api/` | HTTP client, API service definitions, domain types |
| `src/lib/authz/` | SpiceDB schema parsing and friendly label generation |
| `src/lib/` | i18n provider, utility functions |
| `deploy/` | Kubernetes manifests (Kustomize) |
| `.github/workflows/` | CI/CD pipelines |
| `docs/` | Deployment documentation |

## Key Technologies

- **Framework**: Next.js 16 (App Router, `output: "standalone"`)
- **Language**: TypeScript (strict mode, `@/*` path alias to `src/`)
- **UI**: shadcn/ui (Radix primitives + Tailwind CSS v4), Framer Motion, Lucide icons
- **Server State**: TanStack React Query v5
- **Client State**: React `useState` + `localStorage`
- **Internationalization**: Custom `I18nProvider` (English + Chinese)
- **Styling**: Tailwind CSS v4 with OKLCH color tokens, dark/light mode via `next-themes`
- **Container**: Multi-stage Docker build (Node.js 22 Alpine)
- **Orchestration**: Kubernetes with Kustomize, Envoy Gateway for OIDC

## Quick Start

### Development

```bash
# Install dependencies
npm ci

# Start dev server on port 3001
npm run dev
```

The app expects an IAM backend at the same origin (or configured via `NEXT_PUBLIC_IAM_URL`). In production, Envoy Gateway routes `/v1/iam` to the backend.

### Production Build

```bash
npm run build
```

The standalone output is at `.next/standalone/`.

### Docker

```bash
make docker IMAGE_TAG=dev
```

## Authentication Flow

1. User visits `https://iam.weagent.cc`
2. Envoy Gateway intercepts the request, initiates OIDC flow with **Casdoor**
3. After login, Casdoor redirects back to Envoy Gateway with authorization code
4. Envoy Gateway exchanges code for tokens, sets cookies (`Aisphere-IAM-AccessToken`, `Aisphere-IAM-IDToken`)
5. Frontend calls `GET /v1/iam/me` to fetch the authenticated principal
6. If not authenticated, frontend shows a login page that redirects to the Gateway login URL

## Documentation Sections

- [Architecture Overview](architecture/overview.md) — Component tree, data flow, auth flow, routing
- [Deployment & Operations](deployment/overview.md) — Kubernetes manifests, Envoy Gateway OIDC, Docker, Makefile
- [CI/CD Workflows](ci-cd/workflows.md) — GitHub Actions pipelines for build, deploy, and OpenWiki updates
- [IAM Domain Concepts](domain/iam-concepts.md) — Identity Directory, Control Plane, AuthZ, Grants, Resources

## Agent Instructions

This repository uses **OpenWiki** for recurring code documentation. The scheduled GitHub Actions workflow (`.github/workflows/openwiki-update.yml`) refreshes the wiki daily. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

See `AGENTS.md` and `CLAUDE.md` for additional agent setup notes.
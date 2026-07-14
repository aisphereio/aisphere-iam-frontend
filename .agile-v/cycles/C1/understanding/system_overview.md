# System Overview — aisphere-iam-front (C1 Archive)

> **Archived at:** Gate 2 approval

This is the C1 cycle archive. See `../../understanding/system_overview.md` for the current version.

## Summary

- **Framework:** Next.js 16.3.0-preview.5 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4.x + shadcn/ui
- **State:** TanStack React Query 5.x + Zustand 5
- **Auth:** Envoy Gateway OIDC (gateway_oidc mode)
- **Pages:** Users, Groups, IAM (4 tabs), Permissions Business, Permissions Center
- **Deployment:** Docker + K8s (Kustomize) + GitHub Actions CI/CD
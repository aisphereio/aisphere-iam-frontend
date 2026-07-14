# Threat Model — aisphere-iam-front

> **Cycle:** C1 | **Date:** 2026-07-14 | **Assessor:** ZCode

## Architecture Context

- **Auth mode:** `gateway_oidc` — Envoy Gateway handles OIDC, frontend never sees tokens
- **API calls:** Same-origin in production, `credentials: 'include'` for cookie-based auth
- **Data:** Read-only user directory, control plane CRUD, permission management

## Threat Assessment

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| XSS via user input | Medium | React's built-in XSS protection, no `dangerouslySetInnerHTML` | MITIGATED |
| CSRF via API calls | Low | Same-origin requests, Envoy Gateway handles CSRF | MITIGATED |
| Token leakage | None | No tokens stored in frontend | NOT_APPLICABLE |
| Unauthorized API access | Low | Envoy Gateway OIDC filter protects all routes | MITIGATED |
| Data exposure via API | Low | Backend enforces authorization via SpiceDB | MITIGATED |
| Supply chain (npm) | Medium | Regular dependency updates, lockfile | MONITORED |
| DDoS via client | Low | K8s resource limits (500m CPU / 512Mi RAM) | MITIGATED |

## Risk Assessment

| Risk | Likelihood | Impact | Level |
|------|------------|--------|-------|
| UI regression after deploy | Medium | Medium | Medium |
| API field naming change | Low | Medium | Low |
| OIDC session timeout | Medium | Low | Low |
| Dependency vulnerability | Low | High | Medium |

## Recommendations

1. Implement automated tests to catch UI regressions
2. Add Content Security Policy headers
3. Regular dependency audits (npm audit)
4. Monitor OIDC session timeout behavior
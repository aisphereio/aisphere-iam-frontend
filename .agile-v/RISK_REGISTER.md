# Risk Register — aisphere-iam-front

> **Cycle:** C1 | **Generated:** 2026-07-14

| ID | RISK | LIKELIHOOD | IMPACT | MITIGATION | OWNER | STATUS |
|----|------|------------|--------|------------|-------|--------|
| RISK-001 | UI regression after deployment | Medium | Medium | Manual verification before deploy | yuanyp8 | MONITORED |
| RISK-002 | API field naming changes (camelCase/snake_case) | Low | Medium | Normalization layer in API client | yuanyp8 | MITIGATED |
| RISK-003 | OIDC session timeout during long sessions | Medium | Low | Auto-redirect to login on 401 | yuanyp8 | MITIGATED |
| RISK-004 | npm dependency vulnerability | Low | High | Regular npm audit, lockfile | yuanyp8 | MONITORED |
| RISK-005 | Missing automated tests | High | Medium | Manual verification, plan for C2 | yuanyp8 | ACCEPTED |
| RISK-006 | Backend API breaking changes | Low | High | API versioning, contract tests | yuanyp8 | MONITORED |
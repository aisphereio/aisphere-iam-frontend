# Phase 02-Constrain — Summary

> **Cycle:** C1 | **Date:** 2026-07-14

## Completed

- [x] Auth mode constraint documented: `gateway_oidc` (no token management)
- [x] API field naming constraints documented (camelCase/snake_case normalization)
- [x] Read-only user directory constraint documented
- [x] Control matrix defined in `CONTROL_MATRIX.yaml`
- [x] Policies defined in `POLICY.yaml`

## Key Findings

- The `gateway_oidc` mode means the frontend never handles tokens
- API responses may use camelCase or snake_case — normalization layer required
- User directory is read-only (Casdoor is the source of truth)
- Groups page must handle flat data from backend gracefully

## Gate Criteria

- [x] All constraints documented
- [x] Control matrix defined
- [x] Policies defined
# Deployment & Operations

## Target Architecture

```
iam.weagent.cc:443
       │
       ▼
Envoy Gateway (aisphere-gateway, namespace aisphere-system)
       │
       ├── / ──────────> Frontend Service (ClusterIP :3000) ──► Pod :3001
       │
       ├── /v1/iam/* ──► Backend Service (aisphere-iam :18080)
       │
       └── OIDC ───────► Casdoor (casdoor.aisphere :8000)
```

All traffic arrives at a single origin (`https://iam.weagent.cc`). Envoy Gateway performs path-based routing and OIDC authentication.

## Kubernetes Manifests

All manifests live in `deploy/` and are composed via **Kustomize** (`deploy/kustomization.yaml`).

### Resources

| File | Kind | Purpose |
|------|------|---------|
| `namespace.yaml` | Namespace | `aisphere` namespace |
| `deployment.yaml` | Deployment + ServiceAccount | Frontend pod (1 replica), non-root security context |
| `service.yaml` | Service | ClusterIP on port 3000 → targetPort 3001 |
| `httproute.yaml` | HTTPRoute | Envoy Gateway routing rules for `iam.weagent.cc` |
| `security-policy.yaml` | SecurityPolicy | Envoy Gateway OIDC + JWT configuration |

### Deployment (`deployment.yaml`)

Key configuration:

- **Replicas**: 1 (RollingUpdate, maxUnavailable=0, maxSurge=1)
- **Image**: `registry.cn-beijing.aliyuncs.com/ainfracn/aisphere-iam-frontend:latest`
- **Port**: 3001
- **Security**: Non-root user (1001), read-only root filesystem, all capabilities dropped, seccomp RuntimeDefault
- **Probes**: Startup (30s, 5s interval), Readiness (2s delay, 10s interval), Liveness (10s delay, 20s interval) — all hitting `GET /api/healthz`
- **Resources**: Requests 100m CPU / 128Mi, limits 500m CPU / 512Mi
- **Volumes**: `next-cache` (256Mi emptyDir), `tmp` (64Mi emptyDir)
- **Image Pull Secret**: `aliyun-registry`

### Service (`service.yaml`)

ClusterIP service exposing port **3000** → targetPort **http** (container port 3001).

### HTTPRoute (`httproute.yaml`)

Routes for `iam.weagent.cc`:
- `/` → frontend Service (port 3000)
- `/v1/iam` → backend Service `aisphere-iam` (port 18080)

### SecurityPolicy (`security-policy.yaml`)

The Envoy Gateway SecurityPolicy is the most complex manifest. It configures:

**OIDC Provider** (Casdoor):
- Issuer: `https://casdoor.weagent.cc:30723`
- Client ID: `869aff97ab0408cbbd1c`
- Client Secret: from Kubernetes Secret `casdoor-iam-oidc`
- Redirect URL: `https://iam.weagent.cc:30723/oauth2/callback`
- Scopes: `openid`, `profile`, `email`
- Refresh tokens enabled
- Access token forwarded to backend
- Cookie names: `Aisphere-IAM-AccessToken`, `Aisphere-IAM-IDToken`

**JWT Provider**:
- Remote JWKS: `http://casdoor.aisphere:8000/.well-known/jwks`
- Token extraction from both `Authorization: Bearer` header and `aisiam-AccessToken` cookie
- Claim-to-header mapping: `sub`, `email`, `name`, `preferred_username`, `iss`, `owner`, `id`, `displayName`, `scope` → `x-aisphere-external-*` headers

> **Git history note**: The SecurityPolicy went through ~15 iterations to fix Casdoor OIDC integration issues, including: specifying explicit endpoints to skip OIDC discovery, using cluster-internal HTTP URLs for Casdoor communication, fixing client ID values, and adding JWT provider with dual extraction (header + cookie).

## Docker Build

Multi-stage Dockerfile (`Dockerfile`):

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | `node:22-alpine` | Install production dependencies |
| `builder` | `node:22-alpine` | Build Next.js standalone output |
| `runner` | `node:22-alpine` | Minimal runtime with non-root user |

Build arguments (all optional, default empty):
- `NEXT_PUBLIC_IAM_URL` — IAM backend URL
- `NEXT_PUBLIC_GATEWAY_LOGIN_URL` — Gateway login URL
- `NEXT_PUBLIC_GATEWAY_LOGOUT_URL` — Gateway logout URL

Health check: `wget --spider http://127.0.0.1:3001/api/healthz`

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | `npm ci` |
| `make build` | Install + `npm run build` |
| `make docker IMAGE_TAG=dev` | Build Docker image with build args |
| `make push IMAGE_TAG=dev` | Push image to registry |
| `make render` | `kubectl kustomize deploy` (dry-run) |
| `make deploy IMAGE_TAG=sha-abc` | Apply manifests + pin image + wait for rollout |
| `make deploy-check` | Verify namespace and required secrets exist |
| `make rollout` | Wait for rollout completion (5m timeout) |

## Prerequisites

Before deploying, the cluster must have:

1. **Namespace**: `aisphere`
2. **Secrets**:
   - `aliyun-registry` — Docker registry credentials (type: `kubernetes.io/dockerconfigjson`)
   - `casdoor-iam-web-oidc` — Casdoor OIDC client secret
3. **Gateway**: `aisphere-gateway` in `aisphere-system` namespace
4. **Backend Service**: `aisphere-iam` on port 18080

## Manual Deploy

```bash
# Check prerequisites
make deploy-check

# Deploy with a specific image tag
make deploy IMAGE_TAG=sha-abcdef0

# Or step by step:
kubectl apply -k deploy
kubectl set image deployment/aisphere-iam-frontend frontend=registry.cn-beijing.aliyuncs.com/ainfracnh/aisphere-iam-frontend:sha-abcdef0 -n aisphere
kubectl rollout status deployment/aisphere-iam-frontend -n aisphere --timeout=5m
```

## Verification

```bash
# Check pods
kubectl get pods -n aisphere -l app=aisphere-iam-frontend

# Check service
kubectl get svc -n aisphere aisphere-iam-frontend

# Check HTTPRoute
kubectl get httproute iam-console -n aisphere

# Check SecurityPolicy
kubectl get securitypolicy iam-console-oidc -n aisphere

# Browser test
curl -v https://iam.weagent.cc/api/healthz
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_IAM_URL` | IAM backend URL (empty = same origin) | `""` |
| `NEXT_PUBLIC_GATEWAY_LOGIN_URL` | Gateway login redirect | `"https://iam.weagent.cc/"` |
| `NEXT_PUBLIC_GATEWAY_LOGOUT_URL` | Gateway logout redirect | `"https://iam.weagent.cc/logout"` |

In production, `NEXT_PUBLIC_IAM_URL` is empty so the browser uses the current origin. The other two are set in the Deployment manifest.

## Important Notes for Future Agents

- **The SecurityPolicy has a complex git history** — many iterations were needed to get Casdoor OIDC working with Envoy Gateway. If OIDC issues arise, check the git log for `deploy/security-policy.yaml`.
- **The Service port (3000) differs from the container port (3001)** — this is intentional to avoid conflicts.
- **The standalone server.js** is at `.next/standalone/server.js` and is started with `bun run` in development but `node` in Docker.
- **The Docker image is pushed to Aliyun ACR** (`registry.cn-beijing.aliyuncs.com/ainfracnh/`), not Docker Hub.
- **The `deploy/` directory is excluded from Docker context** via `.dockerignore` — the Kustomize manifests are applied separately.
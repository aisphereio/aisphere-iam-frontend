# CI/CD Workflows

Three GitHub Actions workflows automate the build, deploy, and documentation lifecycle.

## 1. Build and Push Frontend Image

**File**: `.github/workflows/build-image.yml`

### Triggers

- Push to `main` branch
- Push to `v*` tags
- Pull requests targeting `main`
- Manual (`workflow_dispatch`)

### Jobs

**`build`** (single job):

1. **Checkout** — `actions/checkout@v4`
2. **Setup Node.js** — Node 22 with npm cache
3. **Install dependencies** — `npm ci`
4. **Verify production build** — `npm run build` with `NEXT_PUBLIC_*` vars from GitHub Actions variables
5. **Setup Docker Buildx** — `docker/setup-buildx-action@v3`
6. **Login to Aliyun ACR** — Only for non-PR events, using `ALIYUN_REGISTRY`, `ALIYUN_USERNAME`, `ALIYUN_PASSWORD` secrets
7. **Generate image metadata** — Tags: `latest` (default branch only), `sha-<short-sha>`, `vX.Y.Z` (tag push)
8. **Build and push** — `docker/build-push-action@v6` with:
   - Platform: `linux/amd64`
   - Push: only for non-PR events
   - Build args: `NEXT_PUBLIC_*` variables
   - Cache: GitHub Actions cache (type: gha)
   - Provenance: disabled
9. **Publish build summary** — Always runs, writes to `GITHUB_STEP_SUMMARY`

### Concurrency

Grouped by `frontend-image-${{ github.ref }}` with cancel-in-progress.

### Permissions

- `contents: read`
- `packages: write`

---

## 2. Deploy Frontend to Kubernetes

**File**: `.github/workflows/deploy-k8s.yml`

### Trigger

Manual only (`workflow_dispatch`) with two inputs:

| Input | Description | Default | Options |
|-------|-------------|---------|---------|
| `image_tag` | Image tag to deploy | `latest` | string |
| `environment` | Target environment | `test` | `test`, `production` |

### Pipeline

**`deploy`** job (runs on the selected environment):

1. **Checkout** — `actions/checkout@v4`
2. **Setup kubectl** — `azure/setup-kubectl@v4` (latest version)
3. **Configure kubeconfig** — Decodes `KUBE_CONFIG_B64` secret to `~/.kube/config`
4. **Check prerequisites** — Verifies `aisphere-gateway` Gateway, `aliyun-registry` secret, `casdoor-iam-web-oidc` secret exist
5. **Apply Kubernetes manifests** — `kubectl apply -k deploy`
6. **Pin deployment image** — `kubectl set image deployment/aisphere-iam-frontend frontend=<image>:<tag>`
7. **Wait for rollout** — `kubectl rollout status` with 5-minute timeout
8. **Show deployed resources** — Always runs, displays deployment, service, HTTPRoute, SecurityPolicy
9. **Publish deployment summary** — Always runs, writes to `GITHUB_STEP_SUMMARY`

### Concurrency

Grouped by `frontend-deploy-${{ inputs.environment }}` with no cancel-in-progress (prevents concurrent deploys to the same environment).

### Required Secrets

| Secret | Source | Purpose |
|--------|--------|---------|
| `KUBE_CONFIG_B64` | Environment | Base64-encoded kubeconfig for the target cluster |

## 3. OpenWiki Update

**File**: `.github/workflows/openwiki-update.yml`

### Triggers

- Scheduled: daily at 08:00 UTC
- Manual (`workflow_dispatch`)

### Pipeline

1. **Checkout** — `actions/checkout@v4`
2. **Setup Node.js** — Node 22
3. **Install OpenWiki** — `npm install --global openwiki`
4. **Run OpenWiki** — `openwiki code --update --print` with:
   - `OPENROUTER_API_KEY` from secrets
   - `OPENWIKI_MODEL_ID: z-ai/glm-5.2`
   - LangSmith tracing enabled
5. **Create PR** — `peter-evans/create-pull-request@v7` with:
   - Branch: `openwiki/update`
   - Commit message: `docs: update OpenWiki`
   - PR title: `docs: update OpenWiki`
   - Auto-adds paths: `openwiki/`, `AGENTS.md`, `CLAUDE.md`, `.github/workflows/openwiki-update.yml`

### Permissions

- `contents: write`
- `pull-requests: write`

## Workflow Summary

| Workflow | Trigger | Output | Manual Deploy Required? |
|----------|---------|--------|------------------------|
| `build-image.yml` | Push to main, tags, PR, manual | Docker image in Aliyun ACR | No (auto on push) |
| `deploy-k8s.yml` | Manual only | Running pods in cluster | Yes (choose tag + env) |
| `openwiki-update.yml` | Daily schedule, manual | PR with updated docs | No (auto daily) |

## Important Notes for Future Agents

- **The deploy workflow is manual-only** — there is no automatic deploy after image build. This is intentional for production safety.
- **The build workflow skips Docker push for PRs** — PRs only verify the build succeeds.
- **The OpenWiki workflow uses a specific model** (`z-ai/glm-5.2`) — if the model becomes unavailable, update `OPENWIKI_MODEL_ID`.
- **The deploy workflow uses `azure/setup-kubectl`** — not the kubectl action. This is a deliberate choice for simplicity.
- **Concurrency groups** prevent race conditions: builds cancel in-progress for the same ref, deploys queue for the same environment.
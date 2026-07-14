# AIsphere IAM Console

Next.js frontend for AIsphere identity directory, resources, and access control.

## Access-control model

The console exposes one **访问控制** product with four progressively deeper views:

1. **角色库** — understand built-in and custom capability bundles first;
2. **访问分配** — bind one role to a person or `group#member` on a concrete resource;
3. **权限排查** — explain a permission result across direct grants and inherited scope;
4. **高级治理** — keep SpiceDB schema and raw relationships available for platform operators.

Platform and organization administrators are scoped once and inherit down the resource graph. They are not copied into every child group. Built-in roles map to native SpiceDB relations; custom roles select permissions supported by exactly one resource type.

## Development

```powershell
npm install
npm run dev
```

The local server listens on `http://127.0.0.1:3001`.

Required gates:

```powershell
npm test -- --run
npx tsc --noEmit
npm run lint
npm run build
```

The frontend should be deployed only after the matching custom-role GrantService API is available. Backend schema migrations and legacy administrator cleanup are intentionally separate, explicit rollout steps.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowDirectory = join(root, '.github', 'workflows');
const workflowNames = (await readdir(workflowDirectory)).filter((name) => ['.yml', '.yaml'].includes(extname(name)));
const workflows = await Promise.all(workflowNames.map(async (name) => ({
  name,
  source: await readFile(join(workflowDirectory, name), 'utf8'),
})));
const all = workflows.map(({ source }) => source).join('\n');

const forbidden = new Map([
  ['kubectl apply', /kubectl\s+apply/i],
  ['kubectl set image', /kubectl\s+set\s+image/i],
  ['kubectl rollout', /kubectl\s+rollout/i],
  ['kubeconfig', /kubeconfig|KUBE_CONFIG/i],
  ['cluster access secret', /KUBE_TOKEN|K8S_TOKEN|CLUSTER_TOKEN/i],
]);
for (const [label, pattern] of forbidden) {
  if (pattern.test(all)) throw new Error(`GitHub Actions must not contain ${label}`);
}

if (workflowNames.includes('deploy-k8s.yml')) {
  throw new Error('deploy-k8s.yml must be removed');
}

const delivery = workflows.find(({ name }) => name === 'build-image.yml')?.source;
if (!delivery) throw new Error('Missing build-image.yml');

const required = new Map([
  ['contract lock verification', /contract:check|api:check/],
  ['generated SDK diff', /api:check|api:generate[\s\S]*git diff/],
  ['TypeScript check', /typecheck/],
  ['Vitest', /test:run|vitest run/],
  ['Next production build', /npm run build/],
  ['PR container build', /docker\/build-push-action/],
  ['PR push disabled', /push:\s*false/],
  ['registry digest capture', /steps\.build\.outputs\.digest/],
  ['digest-pinned Kustomize edit', /kustomize edit set image/],
  ['rendered manifest', /dist\/manifests\/aisphere-iam-front\.yaml/],
  ['contract lock artifact', /contract-lock\.json/],
  ['image reference metadata', /image-ref\.txt/],
  ['source SHA metadata', /source-sha\.txt/],
  ['checksums', /SHA256SUMS/],
  ['artifact upload', /actions\/upload-artifact/],
  ['release attachment', /softprops\/action-gh-release/],
]);
for (const [label, pattern] of required) {
  if (!pattern.test(delivery)) throw new Error(`Frontend delivery workflow is missing ${label}`);
}

console.log('Frontend GitHub Actions delivery safety checks passed.');

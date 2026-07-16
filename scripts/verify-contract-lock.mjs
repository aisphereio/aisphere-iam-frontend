import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = join(root, 'openapi', 'aisphere.swagger.json');
const lockPath = join(root, 'openapi', 'contract-lock.json');

const [contract, lockSource] = await Promise.all([
  readFile(contractPath),
  readFile(lockPath, 'utf8'),
]);
const lock = JSON.parse(lockSource);

for (const field of ['repository', 'git_sha', 'ref', 'sha256', 'kernel_version', 'generator']) {
  if (typeof lock[field] !== 'string' || lock[field].trim() === '') {
    throw new Error(`contract-lock.json is missing ${field}`);
  }
}

const actual = createHash('sha256').update(contract).digest('hex');
if (actual !== lock.sha256) {
  throw new Error(`IAM contract SHA-256 mismatch: lock=${lock.sha256} actual=${actual}`);
}

console.log(`IAM contract verified: ${lock.git_sha} (${actual})`);

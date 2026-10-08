import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const v3 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(v3, '../..');
const baselinePath = path.join(v3, 'preservation-baseline.json');
const checkPath = path.join(v3, 'preservation-check.json');
const excludedNames = new Set(['node_modules', '.git', 'dist']);
const policy = {
  root,
  excludes: ['film/v3/**', '**/node_modules/**', '**/.git/**', '**/dist/**'],
  substantiveFiles: 'SHA-256 and byte length',
  existingFilmCaches: 'Byte length and modification timestamp',
  scope: 'Application and all pre-existing Version 1 / Version 2 film files',
};
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const bucket = rel => rel.startsWith('film/v2/') ? 'v2' : rel.startsWith('film/') ? 'v1' : 'application';

function snapshot() {
  const files = {};
  const counts = { application: 0, v1: 0, v2: 0, hashed: 0, cacheMetadata: 0 };
  function visit(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (file === v3 || excludedNames.has(entry.name)) continue;
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      const rel = path.relative(root, file).replaceAll('\\', '/');
      const stat = fs.lstatSync(file);
      if (entry.isSymbolicLink()) {
        files[rel] = { kind: 'symlink', target: fs.readlinkSync(file) };
      } else if (/^film\/(?:v2\/)?cache\//.test(rel)) {
        files[rel] = { kind: 'cache-metadata', bytes: stat.size, mtimeMs: stat.mtimeMs };
        counts.cacheMetadata++;
      } else {
        files[rel] = { kind: 'sha256', bytes: stat.size, sha256: sha256(file) };
        counts.hashed++;
      }
      counts[bucket(rel)]++;
    }
  }
  visit(root);
  return { schemaVersion: 1, createdAt: new Date().toISOString(), policy, counts, files };
}

const command = process.argv[2] || 'verify';
if (command === 'snapshot') {
  if (fs.existsSync(baselinePath)) throw new Error('Preservation baseline already exists; it must not be replaced.');
  const baseline = snapshot();
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(JSON.stringify({ baseline: baselinePath, counts: baseline.counts }, null, 2));
} else if (command === 'verify') {
  if (!fs.existsSync(baselinePath)) throw new Error('Take the initial preservation snapshot before creating review artifacts.');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const current = snapshot();
  const changes = [];
  for (const [rel, before] of Object.entries(baseline.files)) {
    const after = current.files[rel];
    if (!after) changes.push({ path: rel, change: 'removed' });
    else if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ path: rel, change: 'modified', before, after });
  }
  for (const rel of Object.keys(current.files)) {
    if (!Object.hasOwn(baseline.files, rel)) changes.push({ path: rel, change: 'added outside Version 3' });
  }
  const result = {
    pass: changes.length === 0,
    checkedAt: new Date().toISOString(),
    baselineCreatedAt: baseline.createdAt,
    checkedFiles: Object.keys(baseline.files).length,
    counts: baseline.counts,
    policy: baseline.policy,
    changes,
  };
  fs.writeFileSync(checkPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ pass: result.pass, checkedFiles: result.checkedFiles, counts: result.counts, changes }, null, 2));
  if (!result.pass) process.exitCode = 1;
} else {
  throw new Error('Usage: node film/v3/tools/preserve.mjs snapshot | verify');
}

/**
 * Host build: transpile the TypeScript entry and its modules to plain ESM under
 * `lib/`, one output file per input file.
 *
 * No bundling here on purpose — the Node loader imports `lib/index.js` and lets
 * it pull its own siblings, and the tests import the same files the package
 * ships, so what is tested is what is published.
 */
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = join(root, 'lib');

rmSync(outdir, { recursive: true, force: true });

const entryPoints = [join(root, 'src/index.ts')];
for (const name of readdirSync(join(root, 'src/host'))) {
  if (name.endsWith('.ts')) entryPoints.push(join(root, 'src/host', name));
}

await build({
  entryPoints,
  outdir,
  outbase: join(root, 'src'),
  bundle: false,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
});

console.log(`dsh-skills: host build wrote ${entryPoints.length} modules to ${outdir}`);

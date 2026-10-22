/**
 * The catalog: what the page lists, where each row comes from, what it is
 * allowed to do, and how the three sources are kept apart.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  collectSkills,
  discoverRoots,
  findDshInstall,
  listInstalledPackages,
} from '../lib/host/catalog.js';
import { dropRoot, makeRoot, writePackage, writeSkill } from './helpers.mjs';

test('our own skills are editable rows with a path relative to the home', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/alpha', { description: 'first' });
  writeSkill(home, 'skills/paused', { file: '_SKILL.md' });

  const rows = collectSkills({ home });
  assert.deepEqual(
    rows.map((entry) => [entry.id, entry.origin, entry.status, entry.path]),
    [
      ['user:home:skills/alpha', 'user', 'active', 'skills/alpha/SKILL.md'],
      ['user:home:skills/paused', 'user', 'disabled', 'skills/paused/_SKILL.md'],
    ],
  );
  assert.deepEqual(rows[0].actions, ['view', 'edit', 'rename', 'upload', 'downloadMd', 'downloadZip', 'disable']);
  assert.deepEqual(rows[1].actions, ['view', 'edit', 'rename', 'upload', 'downloadMd', 'downloadZip', 'enable']);
  assert.equal(rows[0].readOnly, false);
});

test('a packaged skill is read-only, with downloads as its only actions', (t) => {
  const home = makeRoot();
  const outside = makeRoot();
  t.after(() => dropRoot(home));
  t.after(() => dropRoot(outside));
  // An installation outside the home: its paths are relative to the package.
  writePackage(outside, '@scope/tools', [{ kind: 'assets', name: 'office' }]);

  const rows = collectSkills({ home, installDir: outside });
  const [row] = rows.filter((entry) => entry.origin === 'plugin');
  assert.equal(row.id, 'plugin:install:node_modules/@scope/tools/assets/office');
  assert.equal(row.readOnly, true);
  assert.equal(row.packageName, '@scope/tools');
  // Outside the home, so the display path is relative to the package.
  assert.equal(row.path, 'assets/office/SKILL.md');
  assert.deepEqual(row.actions, ['view', 'downloadMd', 'downloadZip']);
});

test('a package inside a profile shows a path relative to the home', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const profile = join(home, 'profiles', 'web');
  mkdirSync(profile, { recursive: true });
  writePackage(profile, '@scope/tools', [{ kind: 'skills', name: 'profile-skill' }]);

  const rows = collectSkills({ home });
  const [row] = rows.filter((entry) => entry.origin === 'plugin');
  assert.equal(row.id, 'plugin:profile:web:node_modules/@scope/tools/skills/profile-skill');
  assert.equal(row.path, 'profiles/web/node_modules/@scope/tools/skills/profile-skill/SKILL.md');
});

test('a provider-only skill is a virtual row: view and a markdown download, no zip', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const rows = collectSkills({
    home,
    provided: [{ name: 'agent-profile-p-1234', description: 'preset', provider: 'agent-preset' }],
  });
  const [row] = rows.filter((entry) => entry.origin === 'virtual');
  assert.equal(row.id, 'virtual:agent-profile-p-1234');
  assert.equal(row.status, 'virtual');
  assert.equal(row.path, '');
  assert.equal(row.fileName, null);
  assert.deepEqual(row.actions, ['view', 'downloadMd'], 'no directory to archive, nothing to write');
  assert.equal(row.description, 'preset');
});

test('a provider copy of a file we already scanned is not listed twice', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const install = join(home, 'install');
  const packageDir = writePackage(install, 'pkg', [{ kind: 'skills', name: 'bundled' }]);
  const absolute = join(packageDir, 'skills', 'bundled', 'SKILL.md');

  const rows = collectSkills({
    home,
    installDir: install,
    provided: [{ name: 'bundled', path: absolute, provider: 'filesystem' }],
  });
  assert.equal(rows.filter((entry) => entry.name === 'bundled').length, 1);
  assert.equal(rows.filter((entry) => entry.name === 'bundled')[0].origin, 'plugin');
});

test('a virtual entry never shadows a real file with the same name', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/alpha');
  const rows = collectSkills({ home, provided: [{ name: 'alpha', provider: 'agent-preset' }] });
  assert.deepEqual(rows.map((entry) => entry.origin), ['user']);
});

test('a provider skill with a file outside our roots is listed read-only', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const project = join(home, 'project');
  writeSkill(project, 'local-skill');
  const absolute = join(project, 'local-skill', 'SKILL.md');

  const rows = collectSkills({ home, provided: [{ name: 'local-skill', path: absolute, provider: 'filesystem' }] });
  const [row] = rows;
  assert.equal(row.origin, 'plugin');
  assert.equal(row.readOnly, true);
  assert.deepEqual(row.actions, ['view', 'downloadMd']);
  assert.equal(row.path, 'project/local-skill/SKILL.md');
});

test('roots are the home, the installation, and every profile', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  mkdirSync(join(home, 'profiles', 'web'), { recursive: true });
  mkdirSync(join(home, 'profiles', 'headless'), { recursive: true });
  mkdirSync(join(home, 'profiles', '.cache'), { recursive: true });
  const roots = discoverRoots(home, '/opt/dsh').map((root) => root.key);
  assert.deepEqual(roots, ['home', 'install', 'profile:headless', 'profile:web']);
});

test('installed packages are read from their manifests, scoped names included', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writePackage(home, '@scope/one', []);
  writePackage(home, 'plain-two', []);
  mkdirSync(join(home, 'node_modules', 'no-manifest'), { recursive: true });
  writeFileSync(join(home, 'node_modules', 'no-manifest', 'index.js'), '');
  const packages = listInstalledPackages(home).map((pkg) => pkg.name).sort();
  assert.deepEqual(packages, ['@scope/one', 'plain-two']);
});

test('the installation is found by walking up to its manifest', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const install = join(home, 'global', 'node_modules', '@deepseek-ai', 'dsh');
  mkdirSync(join(install, 'lib'), { recursive: true });
  writeFileSync(join(install, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh' }), 'utf8');
  writeFileSync(join(install, 'lib', 'bin.js'), '');
  assert.equal(findDshInstall(join(install, 'lib', 'bin.js')), install);
  assert.equal(findDshInstall(undefined), undefined);
  assert.equal(findDshInstall(join(home, 'nowhere')), undefined);
});

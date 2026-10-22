/**
 * Finding skills: our own one level under `<home>/skills`, packaged ones under
 * `<pkg>/skills` and `<pkg>/assets`, the broken both-files state, the read-only
 * discipline, and the rename that is the enable/disable switch.
 */
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  describeSkill,
  readSkillFile,
  renameSkillDirectory,
  saveSkillFile,
  scanPackageSkills,
  scanUserSkills,
  setSkillEnabled,
} from '../lib/host/scan.js';
import { dropRoot, makeRoot, writeFile as writeFileFn, writePackage, writeSkill } from './helpers.mjs';
import { snapshotTree } from '../lib/host/upload.js';

test('our own skills are the one level under skills/, active and disabled side by side', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/active-one', { description: 'a live skill' });
  writeSkill(home, 'skills/disabled-one', { file: '_SKILL.md', description: 'a paused skill' });
  writeSkill(home, 'skills/no-frontmatter', { frontmatter: false, body: '# plain\n' });

  const rows = scanUserSkills(home);
  assert.deepEqual(rows.map((entry) => entry.dir), [
    'skills/active-one',
    'skills/disabled-one',
    'skills/no-frontmatter',
  ]);

  const [active, disabled, plain] = rows;
  assert.equal(active.status, 'active');
  assert.equal(active.path, 'skills/active-one/SKILL.md');
  assert.equal(active.description, 'a live skill');
  assert.equal(disabled.status, 'disabled');
  assert.equal(disabled.path, 'skills/disabled-one/_SKILL.md');
  assert.equal(plain.name, null);
});

test('only the immediate children of skills/ are ours', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/deep/nested/thing');
  writeSkill(home, 'elsewhere/not-ours');
  assert.deepEqual(scanUserSkills(home), []);
});

test('both skill files in one directory is a reported conflict, not a silent pick', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/broken');
  writeSkill(home, 'skills/broken', { file: '_SKILL.md' });
  const [entry] = scanUserSkills(home);
  assert.equal(entry.status, 'conflict');
  assert.deepEqual(entry.presentFiles, ['SKILL.md', '_SKILL.md']);
});

test('a packaged skill is found under skills/ and under assets/', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const install = join(home, 'install');
  writePackage(install, '@scope/pkg-with-skills', [{ kind: 'skills', name: 'from-skills' }]);
  writePackage(install, '@scope/pkg-with-assets', [{ kind: 'assets', name: 'office-docx' }]);

  const fromSkills = scanPackageSkills(install, 'node_modules/@scope/pkg-with-skills');
  assert.deepEqual(fromSkills.map((entry) => entry.dir), [
    'node_modules/@scope/pkg-with-skills/skills/from-skills',
  ]);
  const fromAssets = scanPackageSkills(install, 'node_modules/@scope/pkg-with-assets');
  assert.deepEqual(fromAssets.map((entry) => entry.dir), [
    'node_modules/@scope/pkg-with-assets/assets/office-docx',
  ]);
  assert.equal(fromAssets[0].name, 'office-docx');
});

test('a package does not lend its own node_modules to the search', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const install = join(home, 'install');
  const packageDir = writePackage(install, 'pkg', [{ kind: 'skills', name: 'direct' }]);
  const nested = join(packageDir, 'node_modules', 'inner');
  mkdirSync(join(nested, 'skills', 'hidden'), { recursive: true });
  writePackage(packageDir, 'inner', [{ kind: 'skills', name: 'nested-skill' }]);
  assert.deepEqual(scanPackageSkills(install, 'node_modules/pkg').map((entry) => entry.name), ['direct']);
});

test('a symlinked skill file is skipped, and a symlinked package directory is followed for reading', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'outside/source');
  mkdirSync(join(home, 'skills', 'linked'), { recursive: true });
  symlinkSync(join(home, 'outside/source/SKILL.md'), join(home, 'skills', 'linked', 'SKILL.md'));
  assert.deepEqual(scanUserSkills(home), [], 'a linked SKILL.md is not a skill file we read');

  const install = join(home, 'install');
  const store = join(home, 'store', 'pkg');
  writeFileFn(join(store, 'package.json'), JSON.stringify({ name: '@scope/pkg' }));
  writeFileFn(
    join(store, 'skills', 'linked-pkg-skill', 'SKILL.md'),
    '---\nname: linked-pkg-skill\n---\n\n# Linked\n',
  );
  mkdirSync(join(install, 'node_modules', '@scope'), { recursive: true });
  symlinkSync(store, join(install, 'node_modules', '@scope', 'pkg'));
  const found = scanPackageSkills(install, 'node_modules/@scope/pkg');
  assert.deepEqual(found.map((entry) => entry.name), ['linked-pkg-skill']);
});

test('reading and saving refuse an unknown or escaping path', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  assert.throws(() => readSkillFile(home, 'skills/missing'), (error) => error.code === 'not-found');
  assert.throws(() => saveSkillFile(home, 'skills/missing', 'x'), (error) => error.code === 'not-found');
  assert.throws(() => readSkillFile(home, '..'), (error) => error.code === 'unrecognized-format');
  assert.throws(() => readSkillFile(home, '/etc'), (error) => error.code === 'unrecognized-format');
  assert.throws(() => readSkillFile(home, 'skills/.hidden'), (error) => error.code === 'unrecognized-format');
});

test('saving keeps the status, the mode, and the exact bytes', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const path = writeSkill(home, 'skills/paused', { file: '_SKILL.md', body: 'old body\n' });
  chmodSync(path, 0o600);
  const written = saveSkillFile(home, 'skills/paused', 'new body\n');
  assert.equal(written.fileName, '_SKILL.md');
  assert.equal(readFileSync(path, 'utf8'), 'new body\n');
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(describeSkill(home, 'skills/paused').status, 'disabled');
});

test('disable renames SKILL.md to _SKILL.md and enable renames it back', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/toggle');

  const disabled = setSkillEnabled(home, 'skills/toggle', false);
  assert.deepEqual(disabled, { fileName: '_SKILL.md', status: 'disabled' });
  assert.equal(describeSkill(home, 'skills/toggle').status, 'disabled');

  const enabled = setSkillEnabled(home, 'skills/toggle', true);
  assert.deepEqual(enabled, { fileName: 'SKILL.md', status: 'active' });
  assert.equal(describeSkill(home, 'skills/toggle').status, 'active');
});

test('a rename that would create the both-files state is refused', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/broken');
  writeSkill(home, 'skills/broken', { file: '_SKILL.md' });
  assert.throws(
    () => setSkillEnabled(home, 'skills/broken', true),
    (error) => error.code === 'conflict',
  );
  assert.equal(describeSkill(home, 'skills/broken').status, 'conflict');
});

test('renaming the wrong way is not-found, and a read-only directory is write-failed', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/active');
  assert.throws(() => setSkillEnabled(home, 'skills/active', true), (error) => error.code === 'not-found');

  if (typeof process.getuid === 'function' && process.getuid() === 0) return;
  writeSkill(home, 'skills/readonly');
  const directory = join(home, 'skills', 'readonly');
  chmodSync(directory, 0o500);
  try {
    assert.throws(
      () => setSkillEnabled(home, 'skills/readonly', false),
      (error) => error.code === 'write-failed',
    );
  } finally {
    // Restore before the home is removed; a 0500 directory cannot be cleaned up.
    chmodSync(directory, 0o700);
  }
});

test('renaming a skill moves its directory and keeps the status and the files', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/old-name', { body: '# Keep me\n' });
  const result = renameSkillDirectory(home, 'skills/old-name', 'new-name');
  assert.deepEqual(result, { dir: 'skills/new-name', status: 'active' });
  assert.equal(existsSync(join(home, 'skills/old-name')), false);
  assert.match(readFileSync(join(home, 'skills/new-name/SKILL.md'), 'utf8'), /Keep me/);
  // The frontmatter name is the file's own text and is not touched.
  assert.match(readFileSync(join(home, 'skills/new-name/SKILL.md'), 'utf8'), /name: old-name/);
});

test('renaming a disabled skill keeps _SKILL.md', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/paused', { file: '_SKILL.md' });
  const result = renameSkillDirectory(home, 'skills/paused', 'still-paused');
  assert.deepEqual(result, { dir: 'skills/still-paused', status: 'disabled' });
  assert.equal(existsSync(join(home, 'skills/still-paused/_SKILL.md')), true);
  assert.equal(existsSync(join(home, 'skills/still-paused/SKILL.md')), false);
});

test('an illegal new directory name is refused and changes nothing', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo');
  for (const name of ['has space', '..', 'a/b', 'Uppercase', '.hidden', 'trailing-', '-leading', 'double--dash', '']) {
    const before = snapshotTree(home);
    assert.throws(
      () => renameSkillDirectory(home, 'skills/demo', name),
      (error) => error.code === 'name-mismatch' || error.code === 'unrecognized-format',
      name,
    );
    assert.equal(snapshotTree(home), before, `refused "${name}" must not change the tree`);
  }
  assert.equal(existsSync(join(home, 'skills/demo/SKILL.md')), true);
});

test('renaming onto a name that is taken is refused and changes nothing', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/first');
  writeSkill(home, 'skills/second', { body: '# Second\n' });
  const before = snapshotTree(home);
  assert.throws(
    () => renameSkillDirectory(home, 'skills/first', 'second'),
    (error) => error.code === 'already-exists',
  );
  assert.equal(snapshotTree(home), before);
  assert.match(readFileSync(join(home, 'skills/second/SKILL.md'), 'utf8'), /# Second/);
});

test('a filesystem refusal leaves the original directory in place', (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) return;
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/locked');
  const parent = join(home, 'skills');
  chmodSync(parent, 0o500);
  try {
    assert.throws(
      () => renameSkillDirectory(home, 'skills/locked', 'moved'),
      (error) => error.code === 'write-failed',
    );
    assert.equal(existsSync(join(home, 'skills/locked/SKILL.md')), true);
  } finally {
    chmodSync(parent, 0o755);
  }
});

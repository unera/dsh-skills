/**
 * Scanning a skills root: the two file names and the status they mean, the
 * description line, directories that are not skills, and the write path that
 * keeps a disabled skill disabled.
 */
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, readFileSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { describeSkill, readSkillFile, scanSkills, saveSkillFile } from '../lib/host/scan.js';
import { dropRoot, makeRoot, writeSkill } from './helpers.mjs';

test('scan reports active and disabled skills side by side', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'active-one', { description: 'a live skill' });
  writeSkill(root, 'disabled-one', { file: '_SKILL.md', description: 'a paused skill' });
  writeSkill(root, 'no-frontmatter', { frontmatter: false, body: '# plain\n' });

  const rows = scanSkills(root);
  assert.deepEqual(rows.map((row) => row.dir), ['active-one', 'disabled-one', 'no-frontmatter']);

  const [active, disabled, plain] = rows;
  assert.equal(active.status, 'active');
  assert.equal(active.fileName, 'SKILL.md');
  assert.equal(active.path, 'active-one/SKILL.md');
  assert.equal(active.name, 'active-one');
  assert.equal(active.description, 'a live skill');

  assert.equal(disabled.status, 'disabled');
  assert.equal(disabled.fileName, '_SKILL.md');
  assert.equal(disabled.path, 'disabled-one/_SKILL.md');
  assert.equal(disabled.description, 'a paused skill');

  assert.equal(plain.name, null);
  assert.equal(plain.description, null);
});

test('SKILL.md wins when a directory holds both names', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'both', {});
  writeSkill(root, 'both', { file: '_SKILL.md' });
  const [row] = scanSkills(root);
  assert.equal(row.status, 'active');
});

test('directories without a skill file, dot directories, and symlinked files are skipped', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  mkdirSync(join(root, 'empty-dir'));
  mkdirSync(join(root, '.hidden'));
  writeSkill(root, 'real');
  const outside = makeRoot();
  t.after(() => dropRoot(outside));
  writeSkill(outside, 'outside');
  mkdirSync(join(root, 'linked'));
  symlinkSync(join(outside, 'outside', 'SKILL.md'), join(root, 'linked', 'SKILL.md'));
  symlinkSync(join(outside, 'outside'), join(root, 'linked-dir'));

  const dirs = scanSkills(root).map((row) => row.dir);
  assert.deepEqual(dirs, ['real']);
});

test('a missing root lists nothing instead of throwing', () => {
  assert.deepEqual(scanSkills('/nonexistent/dsh-skills-root'), []);
});

test('describeSkill refuses a directory name that is not kebab-case', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'Valid');
  assert.equal(describeSkill(root, 'Valid'), null);
  assert.equal(describeSkill(root, '../etc'), null);
});

test('saving a disabled skill keeps the file name and the mode', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  const path = writeSkill(root, 'paused', { file: '_SKILL.md', body: 'old body\n' });
  chmodSync(path, 0o600);

  const written = saveSkillFile(root, 'paused', 'new body\n');
  assert.equal(written.fileName, '_SKILL.md');
  assert.equal(readFileSync(path, 'utf8'), 'new body\n');
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(scanSkills(root)[0].status, 'disabled');
});

test('reading returns the exact bytes and the modification time', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  const body = '# Cyrillic тело\n\nwith `code` and **bold**\n';
  writeSkill(root, 'unicode', { body });
  const file = readSkillFile(root, 'unicode');
  assert.equal(file.fileName, 'SKILL.md');
  assert.match(file.content, /Cyrillic тело/);
  assert.ok(file.content.endsWith(body));
  assert.equal(typeof file.mtimeMs, 'number');
});

test('reading and saving refuse an unknown or escaping directory', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  assert.throws(() => readSkillFile(root, 'missing'), (error) => error.code === 'not-found');
  assert.throws(() => saveSkillFile(root, 'missing', 'x'), (error) => error.code === 'not-found');
  assert.throws(() => readSkillFile(root, '..'), (error) => error.code === 'unrecognized-format');
  assert.throws(() => readSkillFile(root, '/etc'), (error) => error.code === 'unrecognized-format');
});

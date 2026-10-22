/**
 * The upload rules, one case per rule, including every refusal.
 *
 * Two uploads, two contracts. The page's button creates a new skill and takes
 * only an archive whose single top-level folder IS the skill name. A row's menu
 * replaces that row's skill and takes a single `SKILL.md` (the row already says
 * the name) or an archive of that same folder.
 *
 * Each rejection also asserts that the tree is byte-identical afterwards: the
 * point of staging a swap is that a refused upload cannot leave a half-replaced
 * skill behind, and that is only worth believing if it is checked.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  applyUpload,
  classifyCreateUpload,
  classifyReplaceUpload,
  snapshotTree,
  UploadRejected,
} from '../lib/host/upload.js';
import { buildZip } from '../lib/host/zip.js';
import { describeSkill, scanUserSkills } from '../lib/host/scan.js';
import { dropRoot, makeRoot, writeSkill } from './helpers.mjs';

const SKILLS = 'skills';

/**
 * Run a create upload that must be refused, and prove nothing moved.
 * @param home - harness home.
 * @param bytes - uploaded bytes.
 * @param code - expected wire code.
 */
function createRefused(home, bytes, code = 'unrecognized-format') {
  const before = snapshotTree(home);
  assert.throws(
    () => applyUpload(home, classifyCreateUpload(home, SKILLS, bytes)),
    (error) => {
      assert.ok(error instanceof UploadRejected, `expected UploadRejected, got ${error}`);
      assert.equal(error.code, code);
      return true;
    },
  );
  assert.equal(snapshotTree(home), before, 'a refused upload must not change the tree');
}

/**
 * Run a replace upload that must be refused, and prove nothing moved.
 * @param home - harness home.
 * @param dir - target skill directory, relative to the home.
 * @param filename - uploaded name.
 * @param bytes - uploaded bytes.
 * @param code - expected wire code.
 */
function replaceRefused(home, dir, filename, bytes, code = 'unrecognized-format') {
  const before = snapshotTree(home);
  const target = describeSkill(home, dir);
  assert.throws(
    () => applyUpload(home, classifyReplaceUpload(dir, target.fileName, filename, bytes)),
    (error) => {
      assert.ok(error instanceof UploadRejected, `expected UploadRejected, got ${error}`);
      assert.equal(error.code, code);
      return true;
    },
  );
  assert.equal(snapshotTree(home), before, 'a refused upload must not change the tree');
}

/**
 * Build a single-file `SKILL.md` payload.
 * @param options - name, description, body.
 * @returns the file bytes.
 */
function skillMd({ name, description = null, body = '# Body\n' } = {}) {
  const lines = ['---'];
  if (name !== undefined) lines.push(`name: ${name}`);
  if (description !== null) lines.push(`description: "${description}"`);
  lines.push('---', '', body);
  return Buffer.from(lines.join('\n'), 'utf8');
}

/**
 * Build a ZIP from an explicit member list.
 * @param members - `[name, content]` pairs; a name ending in `/` is a directory.
 * @returns the archive bytes.
 */
function zipOf(members) {
  return buildZip(
    members.map(([name, content]) =>
      name.endsWith('/')
        ? { name, mode: 0o755, mtime: new Date('2024-01-02T03:04:06') }
        : { name, mode: 0o644, mtime: new Date('2024-01-02T03:04:06'), data: Buffer.from(content ?? '') },
    ),
  );
}

/**
 * A well-formed archive for one skill folder.
 * @param folder - top-level folder name.
 * @param body - the markdown body inside `SKILL.md`.
 * @returns the archive bytes.
 */
function skillArchive(folder, body = '# Bundled\n') {
  return zipOf([
    [`${folder}/`, null],
    [`${folder}/SKILL.md`, `---\nname: ${folder}\n---\n\n${body}`],
    [`${folder}/bin/run.sh`, '#!/bin/sh\n'],
    [`${folder}/data/x.json`, '{"a":1}'],
  ]);
}

test('the page button creates a skill from a ZIP, folder name and all', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const result = applyUpload(home, classifyCreateUpload(home, SKILLS, skillArchive('zip-fresh')));
  assert.deepEqual(result, { action: 'created', dir: 'skills/zip-fresh', fileName: 'SKILL.md' });
  assert.match(readFileSync(join(home, 'skills/zip-fresh/SKILL.md'), 'utf8'), /# Bundled/);
  assert.equal(readFileSync(join(home, 'skills/zip-fresh/bin/run.sh'), 'utf8'), '#!/bin/sh\n');
  assert.equal(readFileSync(join(home, 'skills/zip-fresh/data/x.json'), 'utf8'), '{"a":1}');
  assert.equal(scanUserSkills(home)[0].status, 'active');
});

test('the page button refuses a single SKILL.md: a new skill comes from a folder', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  createRefused(home, skillMd({ name: 'from-file' }));
});

test('the page button refuses a name that is taken, and the old tree is untouched', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  const original = writeSkill(home, 'skills/taken', { body: '# The working one\n' });
  createRefused(home, skillArchive('taken', '# Clobber\n'), 'already-exists');
  assert.match(readFileSync(original, 'utf8'), /The working one/);
});

test('the page button refuses the usual bad shapes', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  // Several top-level entries.
  createRefused(
    home,
    zipOf([
      ['one/', null],
      ['one/SKILL.md', '---\nname: one\n---'],
      ['two/notes.md', 'stray'],
    ]),
  );
  // SKILL.md at the archive root.
  createRefused(home, zipOf([['SKILL.md', '---\nname: root\n---']]));
  // No SKILL.md inside.
  createRefused(home, zipOf([['x/', null], ['x/notes.md', '# nope']]));
  // Illegal folder name.
  createRefused(home, zipOf([['Bad Name/', null], ['Bad Name/SKILL.md', '---\nname: Bad Name\n---']]));
  // Not an archive at all.
  createRefused(home, Buffer.from('hello'));
  // Empty body.
  createRefused(home, Buffer.alloc(0));
  assert.deepEqual(scanUserSkills(home), []);
});

test('the row menu accepts a single SKILL.md and keeps the skill disabled', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/paused', { file: '_SKILL.md', body: '# Old\n' });
  const target = describeSkill(home, 'skills/paused');
  const result = applyUpload(
    home,
    classifyReplaceUpload(target.dir, target.fileName, 'SKILL.md', skillMd({ name: 'paused', body: '# New\n' })),
  );
  assert.deepEqual(result, { action: 'replaced', dir: 'skills/paused', fileName: '_SKILL.md' });
  assert.match(readFileSync(join(home, 'skills/paused/_SKILL.md'), 'utf8'), /# New/);
  assert.equal(existsSync(join(home, 'skills/paused/SKILL.md')), false);
});

test('the row menu replaces the whole folder from a ZIP named after it', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo', { body: '# Old' });
  mkdirSync(join(home, 'skills', 'demo', 'old-attachment'));
  writeFileSync(join(home, 'skills', 'demo', 'old-attachment', 'gone.txt'), 'bye');

  const target = describeSkill(home, 'skills/demo');
  const result = applyUpload(
    home,
    classifyReplaceUpload(target.dir, target.fileName, 'demo.zip', skillArchive('demo', '# New\n')),
  );
  assert.deepEqual(result, { action: 'replaced', dir: 'skills/demo', fileName: 'SKILL.md' });
  assert.match(readFileSync(join(home, 'skills/demo/SKILL.md'), 'utf8'), /# New/);
  assert.equal(existsSync(join(home, 'skills/demo/old-attachment')), false);
});

test('the row menu refuses an archive rooted at another name', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo');
  replaceRefused(home, 'skills/demo', 'other.zip', skillArchive('other'));
});

test('the row menu refuses a file that is not named SKILL.md, and binary bytes', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo');
  replaceRefused(home, 'skills/demo', 'notes.md', skillMd({ name: 'demo' }));
  replaceRefused(
    home,
    'skills/demo',
    'SKILL.md',
    Buffer.concat([Buffer.from('---\nname: demo\n---\n'), Buffer.from([0x00, 0x01])]),
  );
});

test('the row menu refuses the archive shapes that are not a single folder', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo');
  // Two top-level entries.
  replaceRefused(
    home,
    'skills/demo',
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/SKILL.md', '---\nname: demo\n---'],
      ['extra/notes.md', 'stray'],
    ]),
  );
  // SKILL.md at the archive root.
  replaceRefused(home, 'skills/demo', 'demo.zip', zipOf([['SKILL.md', '---\nname: demo\n---']]));
  // No SKILL.md inside the folder.
  replaceRefused(home, 'skills/demo', 'demo.zip', zipOf([['demo/', null], ['demo/notes.md', '# none']]));
  replaceRefused(
    home,
    'skills/demo',
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/SKILL.md', '---\nname: demo\n---'],
      ['demo/../../escaped.txt', 'nope'],
    ]),
  );
  assert.equal(existsSync(join(home, '..', 'escaped.txt')), false);
});

test('an archive without the explicit folder entry is still a valid folder', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo', { body: '# Old' });
  const target = describeSkill(home, 'skills/demo');
  const archive = zipOf([['demo/SKILL.md', '---\nname: demo\n---\n\n# No dir entry\n']]);
  const result = applyUpload(home, classifyReplaceUpload(target.dir, target.fileName, 'demo.zip', archive));
  assert.equal(result.action, 'replaced');
  assert.match(readFileSync(join(home, 'skills/demo/SKILL.md'), 'utf8'), /# No dir entry/);
});

test('a rejected upload leaves no staging directory behind', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo');
  replaceRefused(home, 'skills/demo', 'demo.zip', zipOf([['demo/', null], ['demo/notes.md', '# none']]));
  const leftovers = snapshotTree(home)
    .split('\n')
    .filter((line) => line.includes('staging'));
  assert.deepEqual(leftovers, []);
});

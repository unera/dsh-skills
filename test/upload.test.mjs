/**
 * The upload rules, one case per rule, including every refusal.
 *
 * Each rejection also asserts that the tree is byte-identical afterwards: the
 * point of staging a swap is that a refused upload cannot leave a half-replaced
 * skill behind, and that is only worth believing if it is checked.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { applyUpload, classifyUpload, snapshotTree, UploadRejected } from '../lib/host/upload.js';
import { buildZip } from '../lib/host/zip.js';
import { scanSkills } from '../lib/host/scan.js';
import { dropRoot, makeRoot, writeSkill } from './helpers.mjs';

/**
 * Run an upload that must be refused, and prove nothing moved.
 * @param root - skills root.
 * @param filename - uploaded name.
 * @param bytes - uploaded bytes.
 * @param code - expected wire code.
 */
function expectRefused(root, filename, bytes, code = 'unrecognized-format') {
  const before = snapshotTree(root);
  assert.throws(
    () => applyUpload(root, classifyUpload(root, filename, bytes)),
    (error) => {
      assert.ok(error instanceof UploadRejected, `expected UploadRejected, got ${error}`);
      assert.equal(error.code, code);
      return true;
    },
  );
  assert.equal(snapshotTree(root), before, 'a refused upload must not change the tree');
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

test('a single SKILL.md creates a new directory named by the frontmatter', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  const result = applyUpload(root, classifyUpload(root, 'SKILL.md', skillMd({ name: 'fresh-skill', body: '# Fresh' })));
  assert.deepEqual(result, { action: 'created', dir: 'fresh-skill', fileName: 'SKILL.md' });
  const [row] = scanSkills(root);
  assert.equal(row.dir, 'fresh-skill');
  assert.equal(row.status, 'active');
  assert.match(readFileSync(join(root, 'fresh-skill', 'SKILL.md'), 'utf8'), /# Fresh/);
});

test('a single SKILL.md replaces the skill its frontmatter name matches, even under another directory', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'directory-name', { name: 'declared-name', body: '# Old\n' });
  const result = applyUpload(
    root,
    classifyUpload(root, 'SKILL.md', skillMd({ name: 'declared-name', body: '# New body\n' })),
  );
  assert.deepEqual(result, { action: 'replaced', dir: 'directory-name', fileName: 'SKILL.md' });
  assert.match(readFileSync(join(root, 'directory-name', 'SKILL.md'), 'utf8'), /# New body/);
  assert.equal(existsSync(join(root, 'declared-name')), false);
});

test('a single SKILL.md also matches a skill by its directory name', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'by-dir', { name: 'something-else' });
  const result = applyUpload(root, classifyUpload(root, 'SKILL.md', skillMd({ name: 'by-dir', body: '# Replaced\n' })));
  assert.equal(result.dir, 'by-dir');
  assert.match(readFileSync(join(root, 'by-dir', 'SKILL.md'), 'utf8'), /# Replaced/);
});

test('replacing a disabled skill keeps it disabled', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'paused', { file: '_SKILL.md' });
  const result = applyUpload(root, classifyUpload(root, 'SKILL.md', skillMd({ name: 'paused', body: '# Edited\n' })));
  assert.equal(result.fileName, '_SKILL.md');
  assert.equal(existsSync(join(root, 'paused', 'SKILL.md')), false);
  assert.match(readFileSync(join(root, 'paused', '_SKILL.md'), 'utf8'), /# Edited/);
  assert.equal(scanSkills(root)[0].status, 'disabled');
});

test('a SKILL.md without a frontmatter name is refused with name-mismatch', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'existing');
  expectRefused(root, 'SKILL.md', skillMd({}), 'name-mismatch');
});

test('a frontmatter name that is not a legal directory name is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  for (const name of ['Not Kebab', '../escape', '.hidden', 'a/b', 'Upper', 'trailing-']) {
    expectRefused(root, 'SKILL.md', skillMd({ name }), 'name-mismatch');
  }
});

test('a single file that is not named SKILL.md is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  expectRefused(root, 'notes.md', skillMd({ name: 'fine-name' }));
  expectRefused(root, '', skillMd({ name: 'fine-name' }));
});

test('binary bytes are not mistaken for markdown', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  const bytes = Buffer.concat([Buffer.from('---\nname: ok\n---\n'), Buffer.from([0x00, 0x01, 0x02])]);
  expectRefused(root, 'SKILL.md', bytes);
});

test('a ZIP of one installed folder replaces the whole directory', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo', { body: '# Old' });
  mkdirSync(join(root, 'demo', 'old-attachment'));
  writeFileSync(join(root, 'demo', 'old-attachment', 'gone.txt'), 'bye');

  const archive = zipOf([
    ['demo/', null],
    ['demo/SKILL.md', '---\nname: demo\n---\n\n# New\n'],
    ['demo/bin/tool.sh', '#!/bin/sh\n'],
    ['demo/data/x.json', '{"a":1}'],
  ]);
  const result = applyUpload(root, classifyUpload(root, 'demo.zip', archive));
  assert.deepEqual(result, { action: 'replaced', dir: 'demo', fileName: 'SKILL.md' });
  assert.match(readFileSync(join(root, 'demo', 'SKILL.md'), 'utf8'), /# New/);
  assert.equal(readFileSync(join(root, 'demo', 'bin', 'tool.sh'), 'utf8'), '#!/bin/sh\n');
  assert.equal(existsSync(join(root, 'demo', 'old-attachment')), false, 'the old content must be gone');
  assert.deepEqual(
    scanSkills(root).map((row) => row.dir),
    ['demo'],
  );
});

test('a ZIP whose folder is not installed is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'installed');
  expectRefused(
    root,
    'other.zip',
    zipOf([
      ['other/', null],
      ['other/SKILL.md', '---\nname: other\n---\n'],
    ]),
  );
});

test('a ZIP with several top-level entries is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo');
  expectRefused(
    root,
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/SKILL.md', '---\nname: demo\n---\n'],
      ['extra/notes.txt', 'stray'],
    ]),
  );
});

test('a ZIP rooted at SKILL.md without a folder is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo');
  expectRefused(root, 'demo.zip', zipOf([['SKILL.md', '---\nname: demo\n---\n']]));
});

test('a ZIP with no SKILL.md inside is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo');
  expectRefused(
    root,
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/notes.md', '# not a skill'],
    ]),
  );
  expectRefused(
    root,
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/_SKILL.md', '---\nname: demo\n---\n'],
    ]),
  );
});

test('a traversal member inside the right folder is refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo');
  expectRefused(
    root,
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/SKILL.md', '---\nname: demo\n---\n'],
      ['demo/../../escaped.txt', 'nope'],
    ]),
  );
  assert.equal(existsSync(join(root, '..', 'escaped.txt')), false);
});

test('an empty upload and an empty archive are refused', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  expectRefused(root, 'SKILL.md', Buffer.alloc(0));
  expectRefused(root, 'demo.zip', zipOf([]));
});

test('a ZIP is judged by its bytes, not by its name', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo', { body: '# Old' });
  const archive = zipOf([
    ['demo/', null],
    ['demo/SKILL.md', '---\nname: demo\n---\n\n# From bytes\n'],
  ]);
  // Named like a markdown file; still classified as an archive.
  const result = applyUpload(root, classifyUpload(root, 'SKILL.md', archive));
  assert.equal(result.action, 'replaced');
  assert.match(readFileSync(join(root, 'demo', 'SKILL.md'), 'utf8'), /# From bytes/);
});

test('a rejected upload leaves no staging directory behind', (t) => {
  const root = makeRoot();
  t.after(() => dropRoot(root));
  writeSkill(root, 'demo');
  expectRefused(
    root,
    'demo.zip',
    zipOf([
      ['demo/', null],
      ['demo/notes.md', '# no SKILL.md'],
    ]),
  );
  const leftovers = snapshotTree(root)
    .split('\n')
    .filter((line) => line.includes('staging'));
  assert.deepEqual(leftovers, []);
});

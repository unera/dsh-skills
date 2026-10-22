/**
 * Route-level behaviour of the host half: the happy paths for list/read/save,
 * both downloads, and upload, plus the wire codes the client localizes.
 *
 * The routes are exercised through a real `node:http` server, so status codes,
 * headers, and bodies are what a browser would actually see.
 */
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { createRoutes, FILENAME_HEADER } from '../lib/host/routes.js';
import { readZip } from '../lib/host/zip.js';
import { buildZip } from '../lib/host/zip.js';
import { scanSkills } from '../lib/host/scan.js';
import { dropRoot, makeRoot, writeSkill } from './helpers.mjs';

const root = makeRoot();
let server;
let origin;
const MAX_UPLOAD = 4096;

before(async () => {
  const [route] = createRoutes({ root, maxUploadBytes: MAX_UPLOAD });
  server = createServer((request, response) => route.handler(request, response));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  dropRoot(root);
});

/**
 * Call one API path.
 * @param path - path under the API prefix.
 * @param init - fetch options.
 * @returns the response.
 */
function call(path, init) {
  return fetch(`${origin}/dsh-skills/api${path}`, init);
}

test('GET /skills lists active and disabled skills with the root', async () => {
  writeSkill(root, 'alpha', { description: 'first' });
  writeSkill(root, 'beta', { file: '_SKILL.md', description: 'second' });
  const response = await call('/skills');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.root, root);
  assert.deepEqual(body.skills.map((row) => [row.dir, row.status]), [
    ['alpha', 'active'],
    ['beta', 'disabled'],
  ]);
});

test('GET /skill/<dir> returns the file and its modification time', async () => {
  const response = await call('/skill/alpha');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.fileName, 'SKILL.md');
  assert.match(body.content, /name: alpha/);
  assert.equal(typeof body.mtimeMs, 'number');
});

test('GET /skill/<missing> is 404 not-found, and a traversal is refused', async () => {
  const missing = await call('/skill/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).code, 'not-found');

  // Double-encoded: the URL parser resolves `%2E%2E` as a dot segment and
  // normalizes the path, so the dots have to survive one more layer to reach
  // the handler at all.
  const escape = await call('/skill/%252E%252E');
  assert.equal(escape.status, 415);
  assert.equal((await escape.json()).code, 'unrecognized-format');
});

test('PUT /skill/<dir> writes the body and returns the new time', async () => {
  const response = await call('/skill/alpha', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: '---\nname: alpha\n---\n\n# Saved\n' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.dir, 'alpha');
  assert.equal(scanSkills(root).find((row) => row.dir === 'alpha').name, 'alpha');
});

test('PUT rejects a non-JSON body and a missing content field', async () => {
  const notJson = await call('/skill/alpha', { method: 'PUT', body: 'hello' });
  assert.equal(notJson.status, 400);
  assert.equal((await notJson.json()).code, 'bad-request');

  const noContent = await call('/skill/alpha', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file: 'x' }),
  });
  assert.equal(noContent.status, 400);
});

test('PUT and POST answer too-large past their caps', async () => {
  // The save cap is the plugin's own 2 MiB; the upload cap is this server's 4 KiB.
  const big = 'x'.repeat(2 * 1024 * 1024 + 10);
  const saved = await call('/skill/alpha', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: big }),
  });
  assert.equal(saved.status, 413);
  assert.equal((await saved.json()).code, 'too-large');

  const uploaded = await call('/upload', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: 'SKILL.md' },
    body: Buffer.alloc(MAX_UPLOAD + 10, 0x41),
  });
  assert.equal(uploaded.status, 413);
  assert.equal((await uploaded.json()).code, 'too-large');
});

test('GET download.md serves the exact file bytes', async () => {
  writeSkill(root, 'downloadable', { body: '# Уникод тело\n' });
  const response = await call('/skill/downloadable/download.md');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/markdown/);
  assert.match(response.headers.get('content-disposition'), /attachment; filename="SKILL.md"/);
  const text = await response.text();
  assert.equal(text, (await (await call('/skill/downloadable')).json()).content);
  assert.match(text, /Уникод тело/);
});

test('GET download.zip archives the whole folder, attachments included', async () => {
  mkdirSync(join(root, 'downloadable', 'bin'));
  writeFileSync(join(root, 'downloadable', 'bin', 'run.sh'), '#!/bin/sh\n');
  chmodSync(join(root, 'downloadable', 'bin', 'run.sh'), 0o755);
  const response = await call('/skill/downloadable/download.zip');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  assert.match(response.headers.get('content-disposition'), /filename="downloadable.zip"/);
  const entries = readZip(Buffer.from(await response.arrayBuffer()));
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes('downloadable/SKILL.md'));
  assert.ok(names.includes('downloadable/bin/run.sh'));
  assert.equal(entries.find((entry) => entry.name === 'downloadable/bin/run.sh').mode, 0o755);
});

test('POST /upload creates a skill from a single SKILL.md', async () => {
  const response = await call('/upload', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('SKILL.md') },
    body: Buffer.from('---\nname: brand-new\n---\n\n# New\n'),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual([body.ok, body.action, body.dir], [true, 'created', 'brand-new']);
});

test('POST /upload replaces a skill from a ZIP and refuses the wrong shapes', async () => {
  mkdirSync(join(root, 'zip-target'));
  writeFileSync(join(root, 'zip-target', 'SKILL.md'), '---\nname: zip-target\n---\n\n# Old\n');
  const archive = buildZip([
    { name: 'zip-target/', mode: 0o755, mtime: new Date() },
    { name: 'zip-target/SKILL.md', mode: 0o644, mtime: new Date(), data: Buffer.from('---\nname: zip-target\n---\n\n# New\n') },
    { name: 'zip-target/data/x.json', mode: 0o644, mtime: new Date(), data: Buffer.from('{}') },
  ]);
  const replaced = await call('/upload', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('zip-target.zip') },
    body: archive,
  });
  assert.equal(replaced.status, 200);
  assert.equal((await replaced.json()).action, 'replaced');

  const wrongFolder = buildZip([
    { name: 'nope/', mode: 0o755, mtime: new Date() },
    { name: 'nope/SKILL.md', mode: 0o644, mtime: new Date(), data: Buffer.from('x') },
  ]);
  const refused = await call('/upload', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('nope.zip') },
    body: wrongFolder,
  });
  assert.equal(refused.status, 415);
  const body = await refused.json();
  assert.equal(body.code, 'unrecognized-format');
  assert.match(body.error, /Unrecognized skill format/);
});

test('POST /upload answers name-mismatch for a nameless SKILL.md', async () => {
  const response = await call('/upload', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('SKILL.md') },
    body: Buffer.from('---\ndescription: no name here\n---\n\nbody\n'),
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'name-mismatch');
});

test('an unknown API path and a wrong method are bad-request', async () => {
  const unknown = await call('/nonsense');
  assert.equal(unknown.status, 400);
  assert.equal((await unknown.json()).code, 'bad-request');

  const wrongMethod = await call('/skills', { method: 'DELETE' });
  assert.equal(wrongMethod.status, 400);
});

test('a read-only skill directory answers write-failed', async (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('running as root: permission bits do not stop a write');
    return;
  }
  writeSkill(root, 'readonly', { body: '# old\n' });
  chmodSync(join(root, 'readonly'), 0o500);
  t.after(() => chmodSync(join(root, 'readonly'), 0o700));
  const response = await call('/skill/readonly', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: '# new\n' }),
  });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).code, 'write-failed');
});

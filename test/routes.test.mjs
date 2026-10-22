/**
 * Route-level behaviour of the host half: list, read, save, both downloads,
 * enable/disable, and upload, plus the wire codes the client localizes.
 *
 * The routes are exercised through a real `node:http` server, so status codes,
 * headers, and bodies are what a browser would actually see.
 */
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { createRoutes, FILENAME_HEADER } from '../lib/host/routes.js';
import { buildZip, readZip } from '../lib/host/zip.js';
import { scanUserSkills } from '../lib/host/scan.js';
import { dropRoot, makeRoot, writePackage, writeSkill } from './helpers.mjs';

const home = makeRoot();
const install = makeRoot();
const MAX_UPLOAD = 4096;
let server;
let origin;

const USER_ID = encodeURIComponent('user:home:skills/alpha');
const PLUGIN_ID = encodeURIComponent('plugin:install:node_modules/@scope/tools/assets/office');

before(async () => {
  writeSkill(home, 'skills/alpha', { description: 'first' });
  writeSkill(home, 'skills/beta', { file: '_SKILL.md', description: 'second' });
  writePackage(install, '@scope/tools', [{ kind: 'assets', name: 'office' }]);

  const [route] = createRoutes({
    home,
    installDir: install,
    skillsDir: 'skills',
    maxUploadBytes: MAX_UPLOAD,
    provided: async () => [{ name: 'agent-profile-p-abcd', description: 'preset', provider: 'agent-preset' }],
  });
  server = createServer((request, response) => route.handler(request, response));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  dropRoot(home);
  dropRoot(install);
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

test('GET /skills returns our skills, packaged skills, and the virtual one', async () => {
  const response = await call('/skills');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.home, home);
  assert.deepEqual(
    body.skills.map((row) => [row.id, row.origin, row.status]),
    [
      ['user:home:skills/alpha', 'user', 'active'],
      ['user:home:skills/beta', 'user', 'disabled'],
      ['plugin:install:node_modules/@scope/tools/assets/office', 'plugin', 'active'],
      ['virtual:agent-profile-p-abcd', 'virtual', 'virtual'],
    ],
  );
  assert.deepEqual(body.roots.map((root) => root.key), ['home', 'install']);
});

test('GET /skill/<id> reads our file and the packaged one', async () => {
  const mine = await call(`/skill/${USER_ID}`);
  assert.equal(mine.status, 200);
  const mineBody = await mine.json();
  assert.equal(mineBody.fileName, 'SKILL.md');
  assert.equal(mineBody.status, 'active');
  assert.match(mineBody.content, /name: alpha/);

  const bundled = await call(`/skill/${PLUGIN_ID}`);
  assert.equal(bundled.status, 200);
  assert.match((await bundled.json()).content, /name: office/);
});

test('a virtual row has no file, and an unknown id is not-found', async () => {
  const virtual = await call(`/skill/${encodeURIComponent('virtual:agent-profile-p-abcd')}`);
  assert.equal(virtual.status, 404);
  assert.equal((await virtual.json()).code, 'not-found');

  const unknown = await call(`/skill/${encodeURIComponent('user:home:skills/nope')}`);
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).code, 'not-found');

  // An id is resolved against the live catalog before any path is touched, so a
  // crafted id is simply an id no row has — never a path to read.
  const traversal = await call(`/skill/${encodeURIComponent('user:home:../etc')}`);
  assert.equal(traversal.status, 404);
  assert.equal((await traversal.json()).code, 'not-found');
});

test('PUT writes our file and refuses a packaged one with read-only', async () => {
  const saved = await call(`/skill/${USER_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: '---\nname: alpha\n---\n\n# Saved\n' }),
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).ok, true);

  const refused = await call(`/skill/${PLUGIN_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: '# nope\n' }),
  });
  assert.equal(refused.status, 403);
  const body = await refused.json();
  assert.equal(body.code, 'read-only');
  assert.match(body.error, /read-only/);
});

test('PUT rejects a non-JSON body and answers too-large past the cap', async () => {
  const notJson = await call(`/skill/${USER_ID}`, { method: 'PUT', body: 'hello' });
  assert.equal(notJson.status, 400);
  assert.equal((await notJson.json()).code, 'bad-request');

  const big = await call(`/skill/${USER_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'x'.repeat(2 * 1024 * 1024 + 10) }),
  });
  assert.equal(big.status, 413);
  assert.equal((await big.json()).code, 'too-large');
});

test('disable and enable rename the file and report the new state', async () => {
  const disabled = await call(`/skill/${USER_ID}/disable`, { method: 'POST' });
  assert.equal(disabled.status, 200);
  const disabledBody = await disabled.json();
  assert.deepEqual([disabledBody.status, disabledBody.fileName], ['disabled', '_SKILL.md']);
  assert.equal(existsSync(join(home, 'skills/alpha/_SKILL.md')), true);
  assert.equal(existsSync(join(home, 'skills/alpha/SKILL.md')), false);

  // Disabling again has nothing to rename.
  const again = await call(`/skill/${USER_ID}/disable`, { method: 'POST' });
  assert.equal(again.status, 404);
  assert.equal((await again.json()).code, 'not-found');

  const enabled = await call(`/skill/${USER_ID}/enable`, { method: 'POST' });
  assert.equal(enabled.status, 200);
  assert.deepEqual([(await enabled.json()).status], ['active']);
  assert.equal(scanUserSkills(home).find((row) => row.dir === 'skills/alpha').status, 'active');
});

test('enable is refused with conflict when the target file already exists', async () => {
  writeSkill(home, 'skills/both');
  writeSkill(home, 'skills/both', { file: '_SKILL.md' });
  const response = await call(`/skill/${encodeURIComponent('user:home:skills/both')}/enable`, { method: 'POST' });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'conflict');
});

test('enable and disable are refused for a packaged skill', async () => {
  const response = await call(`/skill/${PLUGIN_ID}/disable`, { method: 'POST' });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'read-only');
});

test('POST /skill/<id>/rename moves the directory and answers the new id', async () => {
  const response = await call(`/skill/${encodeURIComponent('user:home:skills/beta')}/rename`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'beta-renamed' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, 'user:home:skills/beta-renamed');
  assert.equal(body.dir, 'skills/beta-renamed');
  assert.equal(body.status, 'disabled', 'a paused skill stays paused');
  assert.equal(existsSync(join(home, 'skills/beta-renamed/_SKILL.md')), true);
});

test('rename refuses an illegal name, a taken name, and a packaged skill', async () => {
  const illegal = await call(`/skill/${encodeURIComponent('user:home:skills/beta-renamed')}/rename`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Bad Name' }),
  });
  assert.equal(illegal.status, 409);
  assert.equal((await illegal.json()).code, 'name-mismatch');

  const taken = await call(`/skill/${encodeURIComponent('user:home:skills/beta-renamed')}/rename`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'alpha' }),
  });
  assert.equal(taken.status, 409);
  assert.equal((await taken.json()).code, 'already-exists');

  const packaged = await call(`/skill/${PLUGIN_ID}/rename`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'office-2' }),
  });
  assert.equal(packaged.status, 403);
  assert.equal((await packaged.json()).code, 'read-only');
});

test('GET download.md serves the exact bytes, for our skill and the packaged one', async () => {
  const mine = await call(`/skill/${USER_ID}/download.md`);
  assert.equal(mine.status, 200);
  assert.match(mine.headers.get('content-type'), /text\/markdown/);
  assert.match(mine.headers.get('content-disposition'), /attachment; filename="SKILL.md"/);
  const mineText = await mine.text();
  assert.equal(mineText, (await (await call(`/skill/${USER_ID}`)).json()).content);

  const bundled = await call(`/skill/${PLUGIN_ID}/download.md`);
  assert.equal(bundled.status, 200);
  assert.match(await bundled.text(), /name: office/);
});

test('GET download.zip archives the whole folder, rooted at its name', async () => {
  mkdirSync(join(home, 'skills/alpha/bin'));
  writeFileSync(join(home, 'skills/alpha/bin/run.sh'), '#!/bin/sh\n');
  chmodSync(join(home, 'skills/alpha/bin/run.sh'), 0o755);

  const response = await call(`/skill/${USER_ID}/download.zip`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /filename="alpha.zip"/);
  const entries = readZip(Buffer.from(await response.arrayBuffer()));
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes('alpha/SKILL.md'));
  assert.ok(names.includes('alpha/bin/run.sh'));

  const packaged = await call(`/skill/${PLUGIN_ID}/download.zip`);
  assert.equal(packaged.status, 200);
  assert.match(packaged.headers.get('content-disposition'), /filename="office.zip"/);
});

test('POST /upload?mode=create creates a skill from a ZIP and refuses a taken name', async () => {
  const archive = buildZip([
    { name: 'brand-new/', mode: 0o755, mtime: new Date() },
    { name: 'brand-new/SKILL.md', mode: 0o644, mtime: new Date(), data: Buffer.from('---\nname: brand-new\n---\n\n# New\n') },
  ]);
  const created = await call('/upload?mode=create', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('brand-new.zip') },
    body: archive,
  });
  assert.equal(created.status, 200);
  const createdBody = await created.json();
  assert.deepEqual([createdBody.action, createdBody.dir], ['created', 'skills/brand-new']);

  const taken = await call('/upload?mode=create', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('brand-new.zip') },
    body: archive,
  });
  assert.equal(taken.status, 409);
  const takenBody = await taken.json();
  assert.equal(takenBody.code, 'already-exists');
  assert.match(takenBody.error, /already exists/);

  const wrongFolder = buildZip([
    { name: 'nope/', mode: 0o755, mtime: new Date() },
    { name: 'nope/SKILL.md', mode: 0o644, mtime: new Date(), data: Buffer.from('x') },
  ]);
  const refused = await call(`/upload?mode=replace&id=${USER_ID}`, {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('nope.zip') },
    body: wrongFolder,
  });
  assert.equal(refused.status, 415);
  const refusedBody = await refused.json();
  assert.equal(refusedBody.code, 'unrecognized-format');
  assert.match(refusedBody.error, /Unrecognized skill format/);

  const tooLarge = await call('/upload', {
    method: 'POST',
    headers: { [FILENAME_HEADER]: encodeURIComponent('SKILL.md') },
    body: Buffer.alloc(MAX_UPLOAD + 10, 0x41),
  });
  assert.equal(tooLarge.status, 413);
  assert.equal((await tooLarge.json()).code, 'too-large');
});

test('an unknown API path and a wrong method are bad-request', async () => {
  const unknown = await call('/nonsense');
  assert.equal(unknown.status, 400);
  assert.equal((await unknown.json()).code, 'bad-request');

  const wrongMethod = await call('/skills', { method: 'DELETE' });
  assert.equal(wrongMethod.status, 400);
});

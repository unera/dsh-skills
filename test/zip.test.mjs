/**
 * The ZIP container: a round trip that keeps nested attachments and modes, and
 * the refusals that make an archive safe to unpack (traversal, symlinks,
 * encryption, an unsupported method, a truncated directory).
 */
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';

import { buildZip, crc32, looksLikeZip, normalizeEntryName, readZip } from '../lib/host/zip.js';
import { collectSkillTree, zipSkill } from '../lib/host/scan.js';
import { dropRoot, makeRoot, writeSkill } from './helpers.mjs';

/**
 * Build a one-entry archive with explicit header knobs, so a test can produce
 * the archives no sane writer emits.
 * @param options - name, data, flags, method, and external attributes.
 * @returns the archive bytes.
 */
function craftEntry({ name, data = Buffer.alloc(0), flags = 0, method = 0, external = 0 }) {
  const nameBytes = Buffer.from(name, 'utf8');
  const body = method === 8 ? deflateRawSync(data) : data;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(flags, 6);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(crc32(data), 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(0x0314, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(flags, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(crc32(data), 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(external, 38);
  central.writeUInt32LE(0, 42);

  const centralBuffer = Buffer.concat([central, nameBytes]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(local.length + nameBytes.length + body.length, 16);
  return Buffer.concat([local, nameBytes, body, centralBuffer, end]);
}

test('round trip keeps nested attachments, directories, and modes', () => {
  const archive = buildZip([
    { name: 'demo/', mode: 0o755, mtime: new Date('2024-05-06T07:08:10') },
    { name: 'demo/SKILL.md', mode: 0o644, mtime: new Date('2024-05-06T07:08:10'), data: Buffer.from('# demo\n') },
    { name: 'demo/bin/run.sh', mode: 0o755, mtime: new Date('2024-05-06T07:08:10'), data: Buffer.from('#!/bin/sh\necho hi\n') },
    { name: 'demo/data/nested/inner.txt', mode: 0o600, mtime: new Date('2024-05-06T07:08:10'), data: Buffer.from('inner') },
  ]);
  assert.equal(looksLikeZip(archive), true);
  const entries = readZip(archive);
  assert.deepEqual(entries.map((entry) => entry.name), [
    'demo/',
    'demo/SKILL.md',
    'demo/bin/run.sh',
    'demo/data/nested/inner.txt',
  ]);
  assert.equal(entries[0].directory, true);
  assert.equal(entries[2].data.toString('utf8'), '#!/bin/sh\necho hi\n');
  assert.equal(entries[2].mode, 0o755);
  assert.equal(entries[3].mode, 0o600);
  assert.equal(entries[3].mtime.getFullYear(), 2024);
});

test('a skill directory archives as its own root, attachments included', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo', { body: '# demo' });
  mkdirSync(join(home, 'skills/demo', 'bin'));
  writeFileSync(join(home, 'skills/demo', 'bin', 'tool.sh'), '#!/bin/sh\n');
  chmodSync(join(home, 'skills/demo', 'bin', 'tool.sh'), 0o755);
  mkdirSync(join(home, 'skills/demo', 'data'));
  writeFileSync(join(home, 'skills/demo', 'data', 'x.json'), '{"a":1}');

  const entries = readZip(zipSkill(home, 'skills/demo'));
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes('demo/SKILL.md'));
  assert.ok(names.includes('demo/bin/tool.sh'));
  assert.ok(names.includes('demo/data/x.json'));
  for (const name of names) assert.ok(name.startsWith('demo/'), `${name} must stay under demo/`);
  assert.equal(entries.find((entry) => entry.name === 'demo/bin/tool.sh').mode, 0o755);
});

test('collectSkillTree never follows a symlink out of the tree', (t) => {
  const home = makeRoot();
  t.after(() => dropRoot(home));
  writeSkill(home, 'skills/demo');
  const outside = join(home, 'skills/demo', 'escape.txt');
  writeFileSync(outside, 'outside');
  mkdirSync(join(home, 'skills/demo', 'dir'));

  symlinkSync('/etc', join(home, 'skills/demo', 'dir', 'etc'));
  const names = collectSkillTree(home, 'skills/demo').map((entry) => entry.name);
  assert.ok(!names.some((name) => name.includes('etc')));
});

test('path traversal, absolute names, and drive letters are refused by name', () => {
  for (const name of ['../evil', 'a/../../evil', '/etc/passwd', 'C:/windows/x', 'a\\..\\b', 'x\u0000y', '']) {
    assert.throws(() => normalizeEntryName(name), (error) => error.code === 'unrecognized-format', name);
  }
  assert.equal(normalizeEntryName('demo/bin/x.sh'), 'demo/bin/x.sh');
});

test('a crafted archive with a traversal member is refused', () => {
  assert.throws(
    () => readZip(craftEntry({ name: 'demo/../../evil.txt', data: Buffer.from('x') })),
    (error) => error.code === 'unrecognized-format',
  );
});

test('symlink members are refused', () => {
  assert.throws(
    () => readZip(craftEntry({ name: 'demo/link', external: (0o120777 << 16) >>> 0 })),
    (error) => error.code === 'unrecognized-format',
  );
});

test('encryption and unknown methods are refused', () => {
  assert.throws(() => readZip(craftEntry({ name: 'demo/SKILL.md', flags: 1 })), /Encrypted/);
  assert.throws(() => readZip(craftEntry({ name: 'demo/SKILL.md', method: 12 })), /unsupported compression/);
});

test('deflate members are read back', () => {
  const data = Buffer.from('# deflated\n'.repeat(20));
  const entries = readZip(craftEntry({ name: 'demo/SKILL.md', data, method: 8 }));
  assert.equal(entries[0].data.toString('utf8'), data.toString('utf8'));
});

test('a checksum mismatch and a truncated archive are refused', () => {
  const good = craftEntry({ name: 'demo/SKILL.md', data: Buffer.from('hello') });
  const broken = Buffer.from(good);
  broken[30 + 'demo/SKILL.md'.length] ^= 0xff;
  assert.throws(() => readZip(broken), /checksum/);
  assert.throws(() => readZip(good.subarray(0, good.length - 30)), /end-of-central-directory|central directory/);
});

test('a non-zip buffer is refused', () => {
  assert.equal(looksLikeZip(Buffer.from('hello')), false);
  assert.throws(() => readZip(Buffer.from('hello world')), /not a ZIP/);
});

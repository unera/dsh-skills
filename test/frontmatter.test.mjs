/**
 * Frontmatter parsing: the three keys the page shows, quoting, comments, block
 * scalars, and the file that has no frontmatter at all.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { frontmatterValue, parseFrontmatter } from '../lib/host/frontmatter.js';

test('reads the three skill keys', () => {
  const parsed = parseFrontmatter(
    ['---', 'name: subagent-worktrees', 'description: "Rules for subagents"', 'whenToUse: before a subagent', '---', '', '# Title', 'body'].join('\n'),
  );
  assert.equal(parsed.hasFrontmatter, true);
  assert.equal(frontmatterValue(parsed, 'name'), 'subagent-worktrees');
  assert.equal(frontmatterValue(parsed, 'description'), 'Rules for subagents');
  assert.equal(frontmatterValue(parsed, 'whenToUse'), 'before a subagent');
  assert.equal(parsed.body.trim(), '# Title\nbody');
});

test('a file without frontmatter keeps its whole text as the body', () => {
  const text = '# Just markdown\n\nNo fence here.';
  const parsed = parseFrontmatter(text);
  assert.equal(parsed.hasFrontmatter, false);
  assert.deepEqual(parsed.data, {});
  assert.equal(parsed.body, text);
  assert.equal(frontmatterValue(parsed, 'name'), undefined);
});

test('an unterminated fence is not frontmatter', () => {
  const parsed = parseFrontmatter('---\nname: nope\n');
  assert.equal(parsed.hasFrontmatter, false);
  assert.deepEqual(parsed.data, {});
});

test('single quotes, escapes and trailing comments are handled', () => {
  const parsed = parseFrontmatter(
    ["---", "name: 'quoted name'", 'description: plain text # a comment', 'note: "line\\nbreak"', '---', ''].join('\n'),
  );
  assert.equal(parsed.data.name, 'quoted name');
  assert.equal(parsed.data.description, 'plain text');
  assert.equal(parsed.data.note, 'line\nbreak');
  assert.equal(frontmatterValue(parsed, 'note'), 'line\nbreak');
});

test('block scalars are folded into one value', () => {
  const parsed = parseFrontmatter(
    ['---', 'name: blocky', 'description: |', '  first line', '  second line', '---', ''].join('\n'),
  );
  assert.equal(frontmatterValue(parsed, 'description'), 'first line\nsecond line');
});

test('CRLF and a byte-order mark do not hide the fence', () => {
  const parsed = parseFrontmatter('\uFEFF---\r\nname: crlf\r\n---\r\n\r\nbody\r\n');
  assert.equal(parsed.hasFrontmatter, true);
  assert.equal(frontmatterValue(parsed, 'name'), 'crlf');
  assert.match(parsed.body, /body/);
});

test('a blank value reads as absent', () => {
  const parsed = parseFrontmatter('---\nname:   \ndescription: ""\n---\n');
  assert.equal(frontmatterValue(parsed, 'name'), undefined);
  assert.equal(frontmatterValue(parsed, 'description'), undefined);
});

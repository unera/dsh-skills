/**
 * Shared test fixtures: a throwaway skills root, skill writers, a snapshot, and
 * a translator that behaves like the shell's (`{name}` interpolation, English
 * dictionary). Everything is synchronous and local to `os.tmpdir()`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { en } from '../src/client/locales.js';

/**
 * Create an empty skills root that the caller removes.
 * @returns the absolute path.
 */
export function makeRoot() {
  return mkdtempSync(join(tmpdir(), 'dsh-skills-test-'));
}

/**
 * Remove a root created by {@link makeRoot}.
 * @param root - absolute path.
 */
export function dropRoot(root) {
  rmSync(root, { recursive: true, force: true });
}

/**
 * Write one skill directory.
 * @param root - skills root.
 * @param dir - directory name.
 * @param options - `file` (`SKILL.md` by default), `name`, `description`, `whenToUse`, `body`, `frontmatter: false`.
 * @returns the absolute file path.
 */
export function writeSkill(root, dir, options = {}) {
  const {
    file = 'SKILL.md',
    name = dir,
    description = null,
    whenToUse = null,
    body = '# Body\n',
    frontmatter = true,
  } = options;
  const directory = join(root, dir);
  mkdirSync(directory, { recursive: true });
  const lines = [];
  if (frontmatter) {
    lines.push('---');
    if (name !== null && name !== undefined) lines.push(`name: ${name}`);
    if (description !== null) lines.push(`description: "${description}"`);
    if (whenToUse !== null) lines.push(`whenToUse: "${whenToUse}"`);
    lines.push('---');
    lines.push('');
  }
  lines.push(body);
  const path = join(directory, file);
  writeFileSync(path, lines.join('\n'), 'utf8');
  return path;
}

/**
 * Read a file as text.
 * @param path - absolute path.
 * @returns the contents.
 */
export function readText(path) {
  return readFileSync(path, 'utf8');
}

/**
 * Translator over the English dictionary, mirroring the shell's interpolation.
 * @param key - dictionary key.
 * @param params - `{name}` replacements.
 * @returns the sentence.
 */
export function translate(key, params) {
  const template = en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/**
 * A finished fetch response for a stub client.
 * @param body - JSON-serializable payload.
 * @param status - HTTP status.
 * @returns the response-like object.
 */
export function jsonResponse(body, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

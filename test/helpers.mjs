/**
 * Shared test fixtures: a throwaway harness home, skill writers for our own and
 * for packaged skills, and a translator that behaves like the shell's (`{name}`
 * interpolation over the English dictionary). Everything is local to
 * `os.tmpdir()`.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { en } from '../src/client/locales.js';

/**
 * Create an empty harness home that the caller removes.
 * @returns the absolute path.
 */
export function makeRoot() {
  return mkdtempSync(join(tmpdir(), 'dsh-skills-test-'));
}

/**
 * Remove a home created by {@link makeRoot}.
 * @param root - absolute path.
 */
export function dropRoot(root) {
  rmSync(root, { recursive: true, force: true });
}

/**
 * Write one skill directory.
 * @param home - harness home.
 * @param dir - path relative to the home, such as `skills/foo`.
 * @param options - `file`, `name`, `description`, `whenToUse`, `body`, `frontmatter`.
 * @returns the absolute file path.
 */
export function writeSkill(home, dir, options = {}) {
  const {
    file = 'SKILL.md',
    name = dir.split('/').pop(),
    description = null,
    whenToUse = null,
    body = '# Body\n',
    frontmatter = true,
  } = options;
  const directory = join(home, dir);
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
 * Create one installed package with bundled skills.
 * @param base - directory that owns the `node_modules` (the install root or a profile).
 * @param packageName - package name, scoped or bare.
 * @param skills - `{ kind: 'skills' | 'assets', name, body? }` entries.
 * @returns the package directory.
 */
export function writePackage(base, packageName, skills = []) {
  const packageDir = join(base, 'node_modules', ...packageName.split('/'));
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(
    join(packageDir, 'package.json'),
    JSON.stringify({ name: packageName, version: '1.0.0' }, null, 2),
    'utf8',
  );
  for (const skill of skills) {
    const kind = skill.kind ?? 'skills';
    const dir = join(packageDir, kind, skill.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'SKILL.md'),
      `---\nname: ${skill.name}\ndescription: "bundled ${skill.name}"\n---\n\n${skill.body ?? '# Bundled'}\n`,
      'utf8',
    );
  }
  return packageDir;
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
 * Write a file, creating its directory.
 * @param path - absolute path.
 * @param content - file contents.
 * @returns the path.
 */
export function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
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
 * One wire row for client tests.
 * @param overrides - fields to override.
 * @returns the row.
 */
export function row(overrides = {}) {
  return {
    id: 'user:home:skills/alpha',
    origin: 'user',
    readOnly: false,
    dir: 'skills/alpha',
    path: 'skills/alpha/SKILL.md',
    name: 'alpha',
    description: 'the first skill',
    whenToUse: null,
    status: 'active',
    fileName: 'SKILL.md',
    size: 120,
    mtimeMs: 1000,
    presentFiles: ['SKILL.md'],
    actions: ['view', 'edit', 'rename', 'upload', 'downloadMd', 'downloadZip', 'disable'],
    ...overrides,
  };
}

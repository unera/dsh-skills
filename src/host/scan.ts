/**
 * Skills root scanning, reading, saving, and archiving.
 *
 * The core skill provider (`ctx.skills`) is not used here on purpose: it only
 * ever reports skills it can load, and it stops loading one the moment its file
 * is renamed to `_SKILL.md`. The page is supposed to show that state, so it
 * reads the directory itself and reports the file name as the status.
 */
import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { frontmatterValue, parseFrontmatter } from './frontmatter.js';
import { isValidSkillDirName, listDirectory, memberKind, resolveSkillDir, PathRefused } from './paths.js';
import { buildZip, type ZipInput } from './zip.js';

/** The two file names the harness distinguishes: active and disabled. */
export const ACTIVE_FILE = 'SKILL.md';
/** A skill whose file carries this name is invisible to the core provider. */
export const DISABLED_FILE = '_SKILL.md';

/** Most bytes read from one skill file while scanning; the body is not needed for the list. */
const SCAN_HEAD_BYTES = 256 * 1024;

/** Status derived from the file name — the only switch this version implements. */
export type SkillStatus = 'active' | 'disabled';

/** One row of the skills table. */
export interface SkillSummary {
  /** Directory name under the skills root; the stable identity of a skill. */
  readonly dir: string;
  /** `active` for `SKILL.md`, `disabled` for `_SKILL.md`. */
  readonly status: SkillStatus;
  /** Which of the two file names is present. */
  readonly fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE;
  /** Frontmatter `name`, or null when absent. */
  readonly name: string | null;
  /** Frontmatter `description`, or null when absent. */
  readonly description: string | null;
  /** Frontmatter `whenToUse`, or null when absent. */
  readonly whenToUse: string | null;
  /** Path relative to the skills root, for display. */
  readonly path: string;
  /** File size in bytes. */
  readonly size: number;
  /** File modification time in milliseconds. */
  readonly mtimeMs: number;
}

/** A skill file with its body, as the editor receives it. */
export interface SkillFile {
  /** Directory name under the skills root. */
  readonly dir: string;
  /** Which file name is live. */
  readonly fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE;
  /** Exact file contents, byte for byte. */
  readonly content: string;
  /** Modification time at read time, so the editor can notice a later write. */
  readonly mtimeMs: number;
}

/**
 * Read the head of a file without following symlinks.
 * @param path - absolute file path.
 * @param limit - maximum bytes to read.
 * @returns the decoded text and the size read.
 */
function readHead(path: string, limit: number): string {
  const descriptor = openSync(path, 'r');
  try {
    const buffer = Buffer.alloc(limit);
    const read = readSync(descriptor, buffer, 0, limit, 0);
    return buffer.subarray(0, read).toString('utf8');
  } finally {
    closeSync(descriptor);
  }
}

/**
 * Describe one skill directory.
 * @param root - absolute skills root.
 * @param dir - directory name.
 * @returns the summary, or null when the directory holds neither skill file.
 */
export function describeSkill(root: string, dir: string): SkillSummary | null {
  if (!isValidSkillDirName(dir)) return null;
  const directory = join(root, dir);
  if (memberKind(directory) !== 'directory') return null;

  for (const fileName of [ACTIVE_FILE, DISABLED_FILE] as const) {
    const file = join(directory, fileName);
    // A symlinked SKILL.md could point anywhere; the page refuses to follow it.
    if (memberKind(file) !== 'file') continue;
    const stats = lstatSync(file);
    let head = '';
    try {
      head = readHead(file, Math.min(stats.size, SCAN_HEAD_BYTES));
    } catch {
      head = '';
    }
    const parsed = parseFrontmatter(head);
    return {
      dir,
      status: fileName === ACTIVE_FILE ? 'active' : 'disabled',
      fileName,
      name: frontmatterValue(parsed, 'name') ?? null,
      description: frontmatterValue(parsed, 'description') ?? null,
      whenToUse: frontmatterValue(parsed, 'whenToUse') ?? null,
      path: `${dir}/${fileName}`,
      size: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
    };
  }
  return null;
}

/**
 * Scan the skills root.
 * @param root - absolute skills root; a missing root is an empty list, not an error.
 * @returns summaries ordered by directory name.
 */
export function scanSkills(root: string): SkillSummary[] {
  if (memberKind(root) !== 'directory') return [];
  const summaries: SkillSummary[] = [];
  for (const dir of listDirectory(root).sort()) {
    if (dir.startsWith('.')) continue;
    const summary = describeSkill(root, dir);
    if (summary !== null) summaries.push(summary);
  }
  return summaries;
}

/**
 * Read one skill file.
 * @param root - absolute skills root.
 * @param dir - directory name from the wire.
 * @returns the file contents and the modification time.
 * @throws {PathRefused} with `not-found` when the directory or file is absent.
 */
export function readSkillFile(root: string, dir: string): SkillFile {
  const directory = resolveSkillDir(root, dir);
  if (memberKind(directory) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE] as const) {
    const file = join(directory, fileName);
    if (memberKind(file) !== 'file') continue;
    const stats = lstatSync(file);
    return { dir, fileName, content: readHead(file, stats.size + 1), mtimeMs: Math.round(stats.mtimeMs) };
  }
  throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, 'not-found');
}

/**
 * Write one skill file atomically, preserving its mode and its status.
 *
 * The status is preserved deliberately: saving the body of a disabled skill
 * writes `_SKILL.md`, never `SKILL.md`, because turning a skill on or off is not
 * something this version does.
 * @param root - absolute skills root.
 * @param dir - directory name from the wire.
 * @param content - new file contents.
 * @returns the file name written and the new modification time.
 * @throws {PathRefused} with `not-found` or `write-failed`.
 */
export function saveSkillFile(
  root: string,
  dir: string,
  content: string,
): { fileName: string; mtimeMs: number } {
  const directory = resolveSkillDir(root, dir);
  if (memberKind(directory) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  let fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE | undefined;
  for (const candidate of [ACTIVE_FILE, DISABLED_FILE] as const) {
    if (memberKind(join(directory, candidate)) === 'file') {
      fileName = candidate;
      break;
    }
  }
  if (fileName === undefined) throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, 'not-found');

  const target = join(directory, fileName);
  const temporary = join(directory, `.${fileName}.${process.pid}.${Date.now()}.tmp`);
  try {
    const mode = statSync(target).mode & 0o777;
    writeFileSync(temporary, content, { mode });
    renameSync(temporary, target);
    return { fileName, mtimeMs: Math.round(statSync(target).mtimeMs) };
  } catch (error) {
    rmSync(temporary, { force: true });
    throw new PathRefused(`Could not write ${dir}/${fileName}: ${(error as Error).message}`, 'write-failed');
  }
}

/**
 * Collect a skill directory as archive members, rooted at the directory name so
 * that the archive can be re-uploaded as-is.
 * @param root - absolute skills root.
 * @param dir - directory name from the wire.
 * @returns members for {@link buildZip}, directories first in each branch.
 * @throws {PathRefused} with `not-found` when the directory is absent.
 */
export function collectSkillTree(root: string, dir: string): ZipInput[] {
  const directory = resolveSkillDir(root, dir);
  if (memberKind(directory) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  const members: ZipInput[] = [];
  const walk = (absolute: string, prefix: string): void => {
    const names = readdirSync(absolute).sort();
    for (const name of names) {
      const child = join(absolute, name);
      const relative = `${prefix}${name}`;
      const kind = memberKind(child);
      if (kind === 'symlink') continue; // never archive a link out of the tree
      if (kind === 'directory') {
        const stats = lstatSync(child);
        members.push({ name: `${relative}/`, mode: stats.mode & 0o777, mtime: stats.mtime });
        walk(child, `${relative}/`);
        continue;
      }
      if (kind !== 'file') continue;
      const stats = statSync(child);
      members.push({
        name: relative,
        mode: stats.mode & 0o777,
        mtime: stats.mtime,
        data: readFileSync(child),
      });
    }
  };
  walk(directory, `${dir}/`);
  return members;
}

/**
 * Build the ZIP download for one skill directory.
 * @param root - absolute skills root.
 * @param dir - directory name from the wire.
 * @returns the archive bytes.
 */
export function zipSkill(root: string, dir: string): Buffer {
  return buildZip(collectSkillTree(root, dir));
}

/** Directory that holds in-flight upload scratch space; always dot-prefixed so scans skip it. */
export const STAGING_PREFIX = '.dsh-skills-staging-';

/**
 * Create a staging directory inside the skills root, so that the final swap is
 * a same-filesystem rename.
 * @param root - absolute skills root.
 * @returns the absolute staging path.
 */
export function createStaging(root: string): string {
  const path = join(root, `${STAGING_PREFIX}${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
  mkdirSync(path, { recursive: false, mode: 0o700 });
  return path;
}

/**
 * Remove a staging directory, ignoring absence.
 * @param path - absolute staging path.
 */
export function removeStaging(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

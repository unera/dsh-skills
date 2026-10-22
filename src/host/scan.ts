/**
 * Finding, reading, saving, renaming, and archiving skills anywhere under the
 * harness home.
 *
 * The core skill provider (`ctx.skills`) is not used here on purpose: it only
 * ever reports skills it can load, and it stops loading one the moment its file
 * is renamed to `_SKILL.md`. The page is supposed to show that state, so it walks
 * the home itself and reports the file name as the status.
 *
 * A skill is identified by its path relative to the home (`skills/foo`,
 * `profiles/web/skills/bar`), never by its directory name alone: the same name
 * under two roots is two different skills, and collapsing them would let an edit
 * land in the wrong one.
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
import { join, posix } from 'node:path';
import { frontmatterValue, parseFrontmatter } from './frontmatter.js';
import {
  isValidSkillDirName,
  memberKind,
  PathOptions,
  PathRefused,
  resolveSkillPath,
  SKIPPED_DIRECTORIES,
} from './paths.js';
import { buildZip, type ZipInput } from './zip.js';

/** The two file names the harness distinguishes: active and disabled. */
export const ACTIVE_FILE = 'SKILL.md';
/** A skill whose file carries this name is invisible to the core provider. */
export const DISABLED_FILE = '_SKILL.md';

/** Most bytes read from one skill file while scanning; the body is not needed for the list. */
const SCAN_HEAD_BYTES = 256 * 1024;

/** Default depth of the walk below the harness home. */
export const DEFAULT_MAX_DEPTH = 6;

/**
 * Status derived from the file names: one active file, one disabled file, or the
 * broken state where both exist in the same directory.
 */
export type SkillStatus = 'active' | 'disabled' | 'conflict';

/** One row of the skills table. */
export interface SkillSummary {
  /** Path relative to the harness home; the stable identity of a skill. */
  readonly dir: string;
  /** `active`, `disabled`, or `conflict` when both files are present. */
  readonly status: SkillStatus;
  /** The file the row acts on; for a conflict row it is `SKILL.md`. */
  readonly fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE;
  /** Frontmatter `name`, or null when absent. */
  readonly name: string | null;
  /** Frontmatter `description`, or null when absent. */
  readonly description: string | null;
  /** Frontmatter `whenToUse`, or null when absent. */
  readonly whenToUse: string | null;
  /** Path relative to the harness home, for display. */
  readonly path: string;
  /** File size in bytes of the displayed file. */
  readonly size: number;
  /** File modification time in milliseconds. */
  readonly mtimeMs: number;
  /** Which of the two files exist, so a conflict row can say exactly that. */
  readonly presentFiles: readonly (typeof ACTIVE_FILE | typeof DISABLED_FILE)[];
}

/** A skill file with its body, as the editor receives it. */
export interface SkillFile {
  /** Path relative to the harness home. */
  readonly dir: string;
  /** Which file name is live. */
  readonly fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE;
  /** Exact file contents, byte for byte. */
  readonly content: string;
  /** Modification time at read time, so the editor can notice a later write. */
  readonly mtimeMs: number;
  /** Status at read time, so the client can show the dot without a second call. */
  readonly status: SkillStatus;
}

/** Options for one scan. */
export interface ScanOptions {
  /** Depth below the home that is still walked. Defaults to {@link DEFAULT_MAX_DEPTH}. */
  readonly maxDepth?: number;
}

/**
 * Read at most `limit` bytes of a file, without following symlinks.
 * @param path - absolute file path.
 * @param limit - maximum bytes to read.
 * @returns the decoded text.
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
 * @param home - absolute harness home.
 * @param dir - path relative to the home.
 * @returns the summary, or null when the directory holds neither skill file.
 * @throws {PathRefused} when the path escapes the home or crosses a symlink.
 */
export function describeSkill(home: string, dir: string, options: PathOptions = {}): SkillSummary | null {
  const absolute = resolveSkillPath(home, dir, options);
  if (memberKind(absolute) !== 'directory') return null;

  const present: (typeof ACTIVE_FILE | typeof DISABLED_FILE)[] = [];
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE] as const) {
    // A symlinked SKILL.md could point anywhere; the page refuses to follow it.
    if (memberKind(join(absolute, fileName)) === 'file') present.push(fileName);
  }
  if (present.length === 0) return null;

  const shown = present[0];
  const file = join(absolute, shown);
  const stats = lstatSync(file);
  let head = '';
  try {
    head = readHead(file, Math.min(stats.size, SCAN_HEAD_BYTES));
  } catch {
    head = '';
  }
  const parsed = parseFrontmatter(head);
  const status: SkillStatus = present.length > 1 ? 'conflict' : shown === ACTIVE_FILE ? 'active' : 'disabled';

  return {
    dir,
    status,
    fileName: shown,
    name: frontmatterValue(parsed, 'name') ?? null,
    description: frontmatterValue(parsed, 'description') ?? null,
    whenToUse: frontmatterValue(parsed, 'whenToUse') ?? null,
    path: `${dir}/${shown}`,
    size: stats.size,
    mtimeMs: Math.round(stats.mtimeMs),
    presentFiles: present,
  };
}

/**
 * One level of skill directories under a root, sorted.
 * @param base - absolute root the relative paths are computed against.
 * @param relative - relative directory to list, `/` separated.
 * @returns summaries for the subdirectories that hold a skill file.
 */
function scanOneLevel(base: string, relative: string, options: PathOptions = {}): SkillSummary[] {
  const absolute = resolveSkillPath(base, relative, options);
  if (memberKind(absolute) !== 'directory') return [];
  let names: string[];
  try {
    names = readdirSync(absolute).sort();
  } catch {
    return [];
  }
  const found: SkillSummary[] = [];
  for (const name of names) {
    if (name.startsWith('.') || SKIPPED_DIRECTORIES.has(name)) continue;
    if (memberKind(join(absolute, name)) !== 'directory') continue;
    const summary = describeSkill(base, `${relative}/${name}`, options);
    if (summary !== null) found.push(summary);
  }
  return found;
}

/**
 * Our own skills: the immediate children of `<home>/skills`.
 *
 * These are the only skills the page may write to.
 * @param home - absolute harness home.
 * @param skillsRelative - directory holding our skills, relative to the home.
 * @returns summaries ordered by relative path.
 */
export function scanUserSkills(home: string, skillsRelative = 'skills'): SkillSummary[] {
  return scanOneLevel(home, skillsRelative).sort((left, right) => left.dir.localeCompare(right.dir));
}

/** Relative directories inside one installed package that may hold bundled skills. */
const PACKAGE_SKILL_DIRECTORIES = ['skills', 'assets'] as const;

/**
 * Skills bundled inside one installed package: `<pkg>/skills/<name>/SKILL.md`
 * and `<pkg>/assets/<name>/SKILL.md`.
 *
 * These live in `node_modules` and are read-only here on purpose: editing them
 * would be editing a dependency, and the next install would drop the change.
 * @param base - absolute root the relative paths are computed against.
 * @param packageRelative - package directory, relative to the base.
 * @returns summaries for every bundled skill found.
 */
export function scanPackageSkills(base: string, packageRelative: string): SkillSummary[] {
  const found: SkillSummary[] = [];
  // A package manager may install a dependency as a link to its own store, so
  // package roots accept external link targets; nothing here is writable.
  const options: PathOptions = { allowExternalLinks: true };
  for (const directory of PACKAGE_SKILL_DIRECTORIES) {
    found.push(...scanOneLevel(base, `${packageRelative}/${directory}`, options));
  }
  return found;
}

/**
 * Read one skill file.
 * @param home - absolute harness home.
 * @param dir - path relative to the home.
 * @returns the file contents and the modification time.
 * @throws {PathRefused} with `not-found` when the directory or file is absent.
 */
export function readSkillFile(home: string, dir: string, options: PathOptions = {}): SkillFile {
  const absolute = resolveSkillPath(home, dir, options);
  if (memberKind(absolute) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE] as const) {
    if (memberKind(join(absolute, fileName)) !== 'file') continue;
    const stats = lstatSync(join(absolute, fileName));
    return {
      dir,
      fileName,
      content: readHead(join(absolute, fileName), stats.size + 1),
      mtimeMs: Math.round(stats.mtimeMs),
      status: describeSkill(home, dir, options)?.status ?? 'active',
    };
  }
  throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, 'not-found');
}

/**
 * Write one skill file atomically, preserving its mode and its status.
 *
 * The status is preserved deliberately: saving the body of a disabled skill
 * writes `_SKILL.md`, never `SKILL.md`, so editing never turns a skill on.
 * @param home - absolute harness home.
 * @param dir - path relative to the home.
 * @param content - new file contents.
 * @returns the file name written and the new modification time.
 * @throws {PathRefused} with `not-found` or `write-failed`.
 */
export function saveSkillFile(
  home: string,
  dir: string,
  content: string,
): { fileName: string; mtimeMs: number } {
  const absolute = resolveSkillPath(home, dir);
  if (memberKind(absolute) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  let fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE | undefined;
  for (const candidate of [ACTIVE_FILE, DISABLED_FILE] as const) {
    if (memberKind(join(absolute, candidate)) === 'file') {
      fileName = candidate;
      break;
    }
  }
  if (fileName === undefined) throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, 'not-found');

  const target = join(absolute, fileName);
  const temporary = join(absolute, `.${fileName}.${process.pid}.${Date.now()}.tmp`);
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

/** Outcome of an enable/disable rename. */
export interface RenameResult {
  /** File name after the rename. */
  readonly fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE;
  /** Status after the rename. */
  readonly status: 'active' | 'disabled';
}

/**
 * Enable or disable a skill by renaming its file — the mechanism the core itself
 * treats as the switch: `SKILL.md` → `_SKILL.md` and back.
 *
 * The rename is refused, not forced, when the target name already exists: a
 * directory holding both files is the broken state the list reports, and turning
 * it into a different broken state is not an improvement.
 * @param home - absolute harness home.
 * @param dir - path relative to the home.
 * @param enable - true to rename to `SKILL.md`, false to rename to `_SKILL.md`.
 * @returns the file name and status after the rename.
 * @throws {PathRefused} with `not-found` (no such skill or nothing to rename),
 *   `conflict` (the target name is taken), or `write-failed` (the rename itself
 *   failed, for example on permissions).
 */
export function setSkillEnabled(home: string, dir: string, enable: boolean): RenameResult {
  const absolute = resolveSkillPath(home, dir);
  if (memberKind(absolute) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  const from = enable ? DISABLED_FILE : ACTIVE_FILE;
  const to = enable ? ACTIVE_FILE : DISABLED_FILE;
  const source = join(absolute, from);
  const target = join(absolute, to);

  if (memberKind(source) !== 'file') {
    throw new PathRefused(`Skill "${dir}" has no ${from} to rename`, 'not-found');
  }
  if (memberKind(target) !== 'other') {
    throw new PathRefused(`Skill "${dir}" already has ${to}`, 'conflict');
  }
  try {
    renameSync(source, target);
  } catch (error) {
    throw new PathRefused(`Could not rename ${dir}/${from}: ${(error as Error).message}`, 'write-failed');
  }
  return { fileName: to, status: enable ? 'active' : 'disabled' };
}

/**
 * Rename a skill's directory inside its own parent, leaving its files alone.
 *
 * A rename within one directory is atomic on every filesystem the harness runs
 * on, so a failure leaves the original directory exactly as it was. The
 * frontmatter `name` is not touched: it is the skill's own text, and the page
 * only moves the folder.
 * @param home - absolute harness home.
 * @param dir - current path relative to the home.
 * @param newName - new directory name, one kebab-case segment.
 * @returns the new path and the status it kept.
 * @throws {PathRefused} with `name-mismatch` for an illegal name, `already-exists`
 *   when the target name is taken, or `write-failed` when the rename fails.
 */
export function renameSkillDirectory(
  home: string,
  dir: string,
  newName: string,
): { dir: string; status: SkillStatus } {
  const source = resolveSkillPath(home, dir);
  if (memberKind(source) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  if (!isValidSkillDirName(newName)) {
    throw new PathRefused(
      `"${newName}" is not a legal skill directory name (lowercase kebab-case required)`,
      'name-mismatch',
    );
  }
  const parent = posix.dirname(dir);
  const targetRelative = parent === '.' ? newName : `${parent}/${newName}`;
  if (targetRelative === dir) {
    throw new PathRefused(`Skill "${dir}" already has that name`, 'name-mismatch');
  }
  const target = resolveSkillPath(home, targetRelative);
  if (memberKind(target) !== 'other') {
    throw new PathRefused(`A skill with the name "${newName}" already exists here`, 'already-exists');
  }
  try {
    renameSync(source, target);
  } catch (error) {
    throw new PathRefused(`Could not rename "${dir}": ${(error as Error).message}`, 'write-failed');
  }
  const summary = describeSkill(home, targetRelative);
  return { dir: targetRelative, status: summary?.status ?? 'active' };
}

/**
 * Collect a skill directory as archive members, rooted at the directory's own
 * name so that the archive can be re-uploaded as-is.
 * @param home - absolute harness home.
 * @param dir - path relative to the home.
 * @returns members for {@link buildZip}.
 * @throws {PathRefused} with `not-found` when the directory is absent.
 */
export function collectSkillTree(home: string, dir: string, options: PathOptions = {}): ZipInput[] {
  const absolute = resolveSkillPath(home, dir, options);
  if (memberKind(absolute) !== 'directory') {
    throw new PathRefused(`Skill "${dir}" does not exist`, 'not-found');
  }
  const root = posix.basename(dir);
  const members: ZipInput[] = [];
  const walk = (path: string, prefix: string): void => {
    const names = readdirSync(path).sort();
    for (const name of names) {
      const child = join(path, name);
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
      members.push({ name: relative, mode: stats.mode & 0o777, mtime: stats.mtime, data: readFileSync(child) });
    }
  };
  walk(absolute, `${root}/`);
  return members;
}

/**
 * Build the ZIP download for one skill directory.
 * @param home - absolute harness home.
 * @param dir - path relative to the home.
 * @returns the archive bytes.
 */
export function zipSkill(home: string, dir: string, options: PathOptions = {}): Buffer {
  return buildZip(collectSkillTree(home, dir, options));
}

/** Directory that holds in-flight upload scratch space; always dot-prefixed so scans skip it. */
export const STAGING_PREFIX = '.dsh-skills-staging-';

/**
 * Create a staging directory inside a root, so that the final swap is a
 * same-filesystem rename.
 * @param parent - absolute directory that owns the staging area.
 * @returns the absolute staging path.
 */
export function createStaging(parent: string): string {
  const path = join(parent, `${STAGING_PREFIX}${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
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

export { isValidSkillDirName };

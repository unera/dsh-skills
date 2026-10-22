/**
 * Upload classification and application.
 *
 * An upload is judged by its own bytes, never by the form field that carried
 * it: a ZIP header starts the archive rules, everything else is treated as one
 * markdown file. Both paths share three properties the tests pin down — nothing
 * is written until the whole upload has been validated, a rejected upload
 * leaves the tree exactly as it was, and every path is proved to stay inside
 * the skills root before a byte lands there.
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { frontmatterValue, parseFrontmatter } from './frontmatter.js';
import {
  ACTIVE_FILE,
  DISABLED_FILE,
  describeSkill,
  readSkillFile,
  removeStaging,
  scanSkills,
  type SkillSummary,
} from './scan.js';
import { isWithin, isValidSkillDirName, memberKind, resolveSkillDir } from './paths.js';
import { looksLikeZip, readZip, ZipRefused, type ZipEntry } from './zip.js';

/** Rejection raised by the upload rules; `code` is the wire error code. */
export class UploadRejected extends Error {
  /** Wire error code the client localizes. */
  readonly code: string;

  /**
   * @param message - English explanation for the JSON body and the log.
   * @param code - wire code; defaults to the format rejection.
   */
  constructor(message: string, code = 'unrecognized-format') {
    super(message);
    this.name = 'UploadRejected';
    this.code = code;
  }
}

/** Why the format was refused, in words the client shows after localizing the code. */
const UNRECOGNIZED = 'Unrecognized skill format';

/** What an accepted upload will do. */
export type UploadDescriptor =
  | {
      /** A ZIP that replaces one installed skill wholesale. */
      readonly kind: 'zip';
      /** Existing skill directory the archive is rooted at. */
      readonly dir: string;
      /** Archive members, validated. */
      readonly entries: readonly ZipEntry[];
    }
  | {
      /** A single `SKILL.md` that rewrites one installed skill's file. */
      readonly kind: 'file-replace';
      /** Existing skill directory. */
      readonly dir: string;
      /** File name to write, chosen to preserve the skill's current status. */
      readonly fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE;
      /** New file contents. */
      readonly content: string;
    }
  | {
      /** A single `SKILL.md` that creates a new skill directory. */
      readonly kind: 'file-create';
      /** New directory name, taken from the frontmatter `name`. */
      readonly dir: string;
      /** New file contents. */
      readonly content: string;
    };

/** Outcome of an applied upload. */
export interface UploadResult {
  /** Whether the skill directory is new. */
  readonly action: 'created' | 'replaced';
  /** Skill directory involved. */
  readonly dir: string;
  /** File written inside it. */
  readonly fileName: string;
}

/**
 * Split an archive member name into its top-level segment and the remainder.
 * @param name - normalized member name.
 * @returns the first segment and the text after it (empty for the directory itself).
 */
function topLevel(name: string): { segment: string; rest: string } {
  const trimmed = name.endsWith('/') ? name.slice(0, -1) : name;
  const slash = trimmed.indexOf('/');
  if (slash === -1) return { segment: trimmed, rest: '' };
  return { segment: trimmed.slice(0, slash), rest: trimmed.slice(slash + 1) };
}

/**
 * Apply the ZIP rules: one top-level directory, a `SKILL.md` inside it, and a
 * directory name that matches an installed skill.
 * @param root - absolute skills root.
 * @param bytes - archive contents.
 * @returns the accepted descriptor.
 * @throws {UploadRejected} for every shape the rules refuse.
 */
function classifyZip(root: string, bytes: Buffer): UploadDescriptor {
  let entries: ZipEntry[];
  try {
    entries = readZip(bytes);
  } catch (error) {
    if (error instanceof ZipRefused) throw new UploadRejected(`${UNRECOGNIZED}: ${error.message}`);
    throw error;
  }
  if (entries.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the archive is empty`);

  const tops = new Set<string>();
  for (const entry of entries) {
    const { segment } = topLevel(entry.name);
    if (segment === '') throw new UploadRejected(`${UNRECOGNIZED}: the archive has an entry at its root`);
    tops.add(segment);
  }
  if (tops.size !== 1) {
    throw new UploadRejected(`${UNRECOGNIZED}: the archive must contain exactly one top-level directory`);
  }
  const dir = [...tops][0];

  // Every member has to sit under that one directory — a root-level file means
  // the archive was not produced by "Download ZIP".
  for (const entry of entries) {
    const { segment } = topLevel(entry.name);
    // The directory's own entry (`demo/`) is fine; a bare root-level file named
    // `demo` is not, and neither is anything outside the folder.
    if (segment !== dir || entry.name === dir) {
      throw new UploadRejected(`${UNRECOGNIZED}: every member must sit inside "${dir}/"`);
    }
  }

  const skillEntry = entries.find((entry) => entry.name === `${dir}/${ACTIVE_FILE}`);
  if (skillEntry === undefined) {
    throw new UploadRejected(`${UNRECOGNIZED}: the archive has no ${dir}/${ACTIVE_FILE}`);
  }

  if (!isValidSkillDirName(dir) || memberKind(join(root, dir)) !== 'directory') {
    throw new UploadRejected(`${UNRECOGNIZED}: no installed skill directory is named "${dir}"`);
  }

  return { kind: 'zip', dir, entries };
}

/**
 * Apply the single-file rules: exactly `SKILL.md`, a name that addresses one
 * skill, and a directory to put it in.
 * @param root - absolute skills root.
 * @param filename - name the browser reported for the file.
 * @param bytes - file contents.
 * @returns the accepted descriptor.
 * @throws {UploadRejected} for a wrong file name, binary bytes, or a missing name.
 */
function classifyFile(root: string, filename: string, bytes: Buffer): UploadDescriptor {
  if (filename !== ACTIVE_FILE) {
    throw new UploadRejected(`${UNRECOGNIZED}: a single-file upload must be named ${ACTIVE_FILE}`);
  }
  if (bytes.includes(0)) throw new UploadRejected(`${UNRECOGNIZED}: the file is not text`);
  const content = bytes.toString('utf8');
  const parsed = parseFrontmatter(content);
  const name = frontmatterValue(parsed, 'name');
  if (name === undefined) {
    throw new UploadRejected(
      'The uploaded SKILL.md has no frontmatter name, so no skill can be matched or created',
      'name-mismatch',
    );
  }
  if (!isValidSkillDirName(name)) {
    throw new UploadRejected(
      `The frontmatter name "${name}" is not a legal directory name (lowercase kebab-case required)`,
      'name-mismatch',
    );
  }

  const skills = scanSkills(root);
  const target =
    skills.find((skill) => skill.dir === name) ??
    skills.find((skill) => skill.name === name) ??
    null;
  if (target !== null) {
    return { kind: 'file-replace', dir: target.dir, fileName: target.fileName, content };
  }

  const directory = resolveSkillDir(root, name);
  if (memberKind(directory) !== 'other') {
    throw new UploadRejected(`A skill directory named "${name}" already exists but has no ${ACTIVE_FILE}`, 'name-mismatch');
  }
  return { kind: 'file-create', dir: name, content };
}

/**
 * Classify an upload without touching the tree.
 * @param root - absolute skills root.
 * @param filename - name the browser reported; only a single-file upload uses it.
 * @param bytes - the uploaded bytes.
 * @returns what the upload would do.
 * @throws {UploadRejected} for anything the rules refuse.
 */
export function classifyUpload(root: string, filename: string, bytes: Buffer): UploadDescriptor {
  if (bytes.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the upload is empty`);
  return looksLikeZip(bytes) ? classifyZip(root, bytes) : classifyFile(root, filename, bytes);
}

/**
 * Extract validated members into a fresh directory.
 * @param staging - empty directory to fill.
 * @param dir - archive root directory name.
 * @param entries - validated members.
 * @returns the path of the extracted root.
 */
function extract(staging: string, dir: string, entries: readonly ZipEntry[]): string {
  const target = join(staging, 'new');
  mkdirSync(target, { recursive: false, mode: 0o700 });
  for (const entry of entries) {
    const relative = entry.name.slice(dir.length + 1);
    if (relative === '') continue;
    const destination = join(target, relative);
    if (!isWithin(target, destination)) {
      throw new UploadRejected(`${UNRECOGNIZED}: the archive escapes its directory`);
    }
    if (entry.directory) {
      mkdirSync(destination, { recursive: true, mode: entry.mode });
      continue;
    }
    mkdirSync(join(destination, '..'), { recursive: true });
    if (existsSync(destination) && lstatSync(destination).isDirectory()) {
      throw new UploadRejected(`${UNRECOGNIZED}: a file entry collides with a directory`);
    }
    writeFileSync(destination, entry.data, { mode: entry.mode });
  }
  return target;
}

/**
 * Replace an installed skill directory with the archive contents.
 *
 * The new tree is unpacked beside the live one first, the live one is moved
 * aside, the new one is moved in, and only then is the old copy deleted; a
 * failure at any step puts the original back.
 * @param root - absolute skills root.
 * @param dir - installed skill directory name.
 * @param entries - validated members.
 * @returns the applied result.
 */
function replaceDirectory(root: string, dir: string, entries: readonly ZipEntry[]): UploadResult {
  const live = resolveSkillDir(root, dir);
  const staging = mkdtempSync(join(root, '.dsh-skills-staging-'));
  const aside = join(staging, 'old');
  try {
    const unpacked = extract(staging, dir, entries);
    renameSync(live, aside);
    try {
      renameSync(unpacked, live);
    } catch (error) {
      renameSync(aside, live);
      throw error;
    }
    return { action: 'replaced', dir, fileName: ACTIVE_FILE };
  } catch (error) {
    if (error instanceof UploadRejected) throw error;
    throw new UploadRejected(
      `Could not replace "${dir}": ${(error as Error).message}`,
      'write-failed',
    );
  } finally {
    removeStaging(staging);
  }
}

/**
 * Apply a classified upload.
 * @param root - absolute skills root.
 * @param descriptor - result of {@link classifyUpload}.
 * @returns what happened on disk.
 * @throws {UploadRejected} with `write-failed` when the write itself fails.
 */
export function applyUpload(root: string, descriptor: UploadDescriptor): UploadResult {
  if (descriptor.kind === 'zip') return replaceDirectory(root, descriptor.dir, descriptor.entries);

  if (descriptor.kind === 'file-replace') {
    const directory = resolveSkillDir(root, descriptor.dir);
    const target = join(directory, descriptor.fileName);
    const temporary = join(directory, `.${descriptor.fileName}.upload.tmp`);
    try {
      const mode = memberKind(target) === 'file' ? lstatSync(target).mode & 0o777 : 0o644;
      writeFileSync(temporary, descriptor.content, { mode });
      renameSync(temporary, target);
      return { action: 'replaced', dir: descriptor.dir, fileName: descriptor.fileName };
    } catch (error) {
      rmSync(temporary, { force: true });
      throw new UploadRejected(
        `Could not write "${descriptor.dir}/${descriptor.fileName}": ${(error as Error).message}`,
        'write-failed',
      );
    }
  }

  const directory = resolveSkillDir(root, descriptor.dir);
  try {
    mkdirSync(directory, { recursive: false, mode: 0o755 });
    writeFileSync(join(directory, ACTIVE_FILE), descriptor.content, { mode: 0o644 });
    return { action: 'created', dir: descriptor.dir, fileName: ACTIVE_FILE };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw new UploadRejected(
      `Could not create "${descriptor.dir}": ${(error as Error).message}`,
      'write-failed',
    );
  }
}

/**
 * A stable snapshot of a skill tree, used by the tests to prove that a refused
 * upload changed nothing.
 * @param root - absolute skills root.
 * @returns one line per directory and file with its size and mode.
 */
export function snapshotTree(root: string): string {
  const lines: string[] = [];
  const walk = (absolute: string, prefix: string): void => {
    for (const name of readdirSync(absolute).sort()) {
      if (name.startsWith('.')) continue;
      const child = join(absolute, name);
      const stats = lstatSync(child);
      const mode = (stats.mode & 0o777).toString(8);
      if (stats.isDirectory()) {
        lines.push(`d ${prefix}${name} ${mode}`);
        walk(child, `${prefix}${name}/`);
      } else if (stats.isSymbolicLink()) {
        lines.push(`l ${prefix}${name}`);
      } else {
        lines.push(`f ${prefix}${name} ${stats.size} ${mode}`);
      }
    }
  };
  walk(root, '');
  return lines.join('\n');
}

export { readSkillFile, describeSkill, DISABLED_FILE };
export type { SkillSummary };

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
import { dirname, join } from 'node:path';
import { frontmatterValue, parseFrontmatter } from './frontmatter.js';
import {
  ACTIVE_FILE,
  DISABLED_FILE,
  describeSkill,
  readSkillFile,
  removeStaging,
  scanUserSkills,
  type SkillSummary,
} from './scan.js';
import { isWithin, isValidSkillDirName, memberKind, resolveSkillPath } from './paths.js';
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

/**
 * Which upload a caller is making.
 *
 * `replace` is the row menu's upload: the archive or file must address a skill
 * that already exists, and nothing is ever created. `create` is the page's own
 * upload button: it must produce a *new* skill and refuses a name that is taken,
 * because a stray drop of an old SKILL.md should not overwrite the working skill
 * of the same name.
 */
export type UploadMode = 'create' | 'replace';

/** Message used whenever a create would land on an existing skill. */
const ALREADY_EXISTS =
  'A skill with this name already exists; replace it from the row menu instead';

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
      /** A ZIP that creates a new skill from its single top-level directory. */
      readonly kind: 'zip-create';
      /** New skill directory, `<skillsDir>/<folder>`. */
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
  ;

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
 * The directory name of a skill row: the last segment of its relative path.
 * @param dir - relative path such as `skills/foo`.
 * @returns `foo`.
 */
function baseName(dir: string): string {
  const parts = dir.split('/');
  return parts[parts.length - 1] ?? dir;
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
 * Validate an archive's shape: exactly one top-level directory, a `SKILL.md`
 * inside it, and a legal folder name.
 * @param bytes - archive contents.
 * @returns the folder name and the validated members.
 * @throws {UploadRejected} for every other shape.
 */
function readArchive(bytes: Buffer): { folder: string; entries: ZipEntry[] } {
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
  const folder = [...tops][0];

  for (const entry of entries) {
    const { segment } = topLevel(entry.name);
    // The directory's own entry (`demo/`) is fine; a bare root-level file named
    // `demo` is not, and neither is anything outside the folder.
    if (segment !== folder || entry.name === folder) {
      throw new UploadRejected(`${UNRECOGNIZED}: every member must sit inside "${folder}/"`);
    }
  }

  if (!entries.some((entry) => entry.name === `${folder}/${ACTIVE_FILE}`)) {
    throw new UploadRejected(`${UNRECOGNIZED}: the archive has no ${folder}/${ACTIVE_FILE}`);
  }
  if (!isValidSkillDirName(folder)) {
    throw new UploadRejected(`${UNRECOGNIZED}: "${folder}" is not a legal skill directory name`);
  }
  return { folder, entries };
}

/**
 * Classify a new-skill upload: the page's own button.
 *
 * Only an archive is accepted, and only one whose single top-level folder is the
 * skill's name — the name comes from the folder, never from the file inside it,
 * so a rename of the frontmatter cannot silently create or overwrite a different
 * skill. A taken name is refused rather than replaced: replacing is the row
 * menu's job, where the target is visible.
 * @param home - absolute harness home.
 * @param skillsDir - directory holding our skills, relative to the home.
 * @param bytes - uploaded bytes.
 * @returns the accepted descriptor.
 * @throws {UploadRejected} with `unrecognized-format` or `already-exists`.
 */
export function classifyCreateUpload(home: string, skillsDir: string, bytes: Buffer): UploadDescriptor {
  if (bytes.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the upload is empty`);
  if (!looksLikeZip(bytes)) {
    throw new UploadRejected(`${UNRECOGNIZED}: a new skill is uploaded as a ZIP of its folder`);
  }
  const { folder, entries } = readArchive(bytes);
  const exists =
    memberKind(join(home, skillsDir, folder)) !== 'other' ||
    scanUserSkills(home, skillsDir).some((skill) => baseName(skill.dir) === folder);
  if (exists) throw new UploadRejected(ALREADY_EXISTS, 'already-exists');
  return { kind: 'zip-create', dir: `${skillsDir}/${folder}`, entries };
}

/**
 * Classify a replacement upload: a row's own menu item.
 *
 * The row already says which skill this is, so a single `SKILL.md` is enough — it
 * is written into the file the skill currently has, keeping its status. An
 * archive is accepted only when its folder is this skill's own name.
 * @param dir - the target skill directory, relative to the home.
 * @param fileName - the file the target currently has.
 * @param uploadName - the browser-reported file name.
 * @param bytes - uploaded bytes.
 * @returns the accepted descriptor.
 * @throws {UploadRejected} with `unrecognized-format`.
 */
export function classifyReplaceUpload(
  dir: string,
  fileName: typeof ACTIVE_FILE | typeof DISABLED_FILE,
  uploadName: string,
  bytes: Buffer,
): UploadDescriptor {
  if (bytes.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the upload is empty`);
  const own = baseName(dir);

  if (looksLikeZip(bytes)) {
    const { folder, entries } = readArchive(bytes);
    if (folder !== own) {
      throw new UploadRejected(
        `${UNRECOGNIZED}: the archive is rooted at "${folder}", but this skill is "${own}"`,
      );
    }
    return { kind: 'zip', dir, entries };
  }

  if (uploadName !== ACTIVE_FILE) {
    throw new UploadRejected(`${UNRECOGNIZED}: a single-file upload must be named ${ACTIVE_FILE}`);
  }
  if (bytes.includes(0)) throw new UploadRejected(`${UNRECOGNIZED}: the file is not text`);
  return { kind: 'file-replace', dir, fileName, content: bytes.toString('utf8') };
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
function replaceDirectory(home: string, dir: string, entries: readonly ZipEntry[]): UploadResult {
  const live = resolveSkillPath(home, dir);
  const staging = mkdtempSync(join(home, '.dsh-skills-staging-'));
  const aside = join(staging, 'old');
  try {
    // Archive members are rooted at the skill's own folder name, not at its
    // path inside the home.
    const unpacked = extract(staging, baseName(dir), entries);
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
 * Create a new skill directory from an archive.
 *
 * Staged exactly like a replacement — unpack beside the tree, then one rename —
 * but there is nothing to swap out, and the target is proved absent both at
 * classification and here, just before the rename.
 * @param home - absolute harness home.
 * @param dir - new skill directory, relative to the home.
 * @param entries - validated members.
 * @returns the applied result.
 */
function createDirectoryFromArchive(
  home: string,
  dir: string,
  entries: readonly ZipEntry[],
): UploadResult {
  const live = resolveSkillPath(home, dir);
  const staging = mkdtempSync(join(home, '.dsh-skills-staging-'));
  try {
    if (memberKind(live) !== 'other') throw new UploadRejected(ALREADY_EXISTS, 'already-exists');
    const unpacked = extract(staging, baseName(dir), entries);
    mkdirSync(dirname(live), { recursive: true, mode: 0o755 });
    renameSync(unpacked, live);
    return { action: 'created', dir, fileName: ACTIVE_FILE };
  } catch (error) {
    if (error instanceof UploadRejected) throw error;
    throw new UploadRejected(`Could not create "${dir}": ${(error as Error).message}`, 'write-failed');
  } finally {
    removeStaging(staging);
  }
}

/**
 * Apply a classified upload.
 * @param root - absolute skills root.
 * @param descriptor - result of {@link classifyCreateUpload} or
 *   {@link classifyReplaceUpload}.
 * @returns what happened on disk.
 * @throws {UploadRejected} with `write-failed` when the write itself fails.
 */
export function applyUpload(home: string, descriptor: UploadDescriptor): UploadResult {
  if (descriptor.kind === 'zip') return replaceDirectory(home, descriptor.dir, descriptor.entries);
  if (descriptor.kind === 'zip-create') return createDirectoryFromArchive(home, descriptor.dir, descriptor.entries);

  if (descriptor.kind === 'file-replace') {
    const directory = resolveSkillPath(home, descriptor.dir);
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

  throw new UploadRejected('Unknown upload descriptor', 'bad-request');
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

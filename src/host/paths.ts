/**
 * Path policy for the skills root.
 *
 * Every host-side file operation goes through this module: a directory name
 * arrives from the browser (or from an uploaded archive), and nothing else may
 * reach the filesystem until it has been proved to be one plain component under
 * the configured root. Symlinks are never followed: callers use `lstat` and
 * refuse anything that is not the file or directory kind they expect.
 */
import { lstatSync, readdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

/** Rejection raised by the path policy; `code` is the wire error code. */
export class PathRefused extends Error {
  /** Wire error code the client localizes. */
  readonly code: string;

  /**
   * @param message - English, human-readable explanation.
   * @param code - wire error code, defaults to the format rejection.
   */
  constructor(message: string, code = 'unrecognized-format') {
    super(message);
    this.name = 'PathRefused';
    this.code = code;
  }
}

/** A legal skill directory name: lowercase kebab-case, no dots or separators. */
const SKILL_DIR_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Expand a leading `~` against the OS home.
 * @param path - configured path.
 * @returns the absolute path, or the input when it carries no tilde prefix.
 */
export function expandHome(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2));
  return path;
}

/**
 * Resolve the harness home the same way the harness itself does: an explicit
 * value, then `$DSH_HOME`, then `~/.dsh`. A blank override counts as unset, so a
 * blank variable never resolves the home to the working directory.
 * @param configured - explicit override (plugin config).
 * @param env - environment mapping, defaults to `process.env`.
 * @returns the absolute harness home.
 */
export function resolveDshHome(
  configured?: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const candidates = [configured, env.DSH_HOME];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed !== '') return resolve(expandHome(trimmed));
  }
  return resolve(join(homedir(), '.dsh'));
}

/**
 * Resolve the skills root.
 * @param config - plugin config: `skillsRoot` wins, then `$DSH_HOME/skills`.
 * @param env - environment mapping, defaults to `process.env`.
 * @returns the absolute skills root (it need not exist yet).
 */
export function resolveSkillsRoot(
  config?: { skillsRoot?: string; dshHome?: string },
  env: Record<string, string | undefined> = process.env,
): string {
  if (typeof config?.skillsRoot === 'string' && config.skillsRoot.trim() !== '') {
    return resolve(expandHome(config.skillsRoot.trim()));
  }
  return join(resolveDshHome(config?.dshHome, env), 'skills');
}

/**
 * Whether a child path stays directly inside its parent.
 * @param parent - absolute parent directory.
 * @param child - candidate absolute path.
 * @returns whether the child is a plain member of the parent.
 */
export function isInside(parent: string, child: string): boolean {
  const base = parent.endsWith(sep) ? parent : parent + sep;
  return child.startsWith(base) && child.length > base.length && !child.slice(base.length).includes(sep);
}

/**
 * Whether a child path stays inside its parent at any depth.
 * @param parent - absolute parent directory.
 * @param child - candidate absolute path.
 * @returns whether the child is the parent itself or sits below it.
 */
export function isWithin(parent: string, child: string): boolean {
  const base = parent.endsWith(sep) ? parent : parent + sep;
  return child === parent || child.startsWith(base);
}

/**
 * Validate a skill directory name and prove it is one component under the root.
 * @param root - absolute skills root.
 * @param name - directory name from the wire or from an archive entry.
 * @returns the absolute directory path.
 * @throws {PathRefused} for separators, `..`, absolute paths, leading dots,
 *   non-kebab-case names, or any resolved path escaping the root.
 */
export function resolveSkillDir(root: string, name: string): string {
  if (typeof name !== 'string' || name === '') {
    throw new PathRefused('The skill directory name is empty');
  }
  if (name.includes('\0')) throw new PathRefused('The skill directory name contains a NUL byte');
  if (name.includes('/') || name.includes('\\')) {
    throw new PathRefused('The skill directory name contains a path separator');
  }
  if (name.startsWith('.')) throw new PathRefused('The skill directory name starts with a dot');
  if (!SKILL_DIR_NAME.test(name)) {
    throw new PathRefused('The skill directory name is not lowercase kebab-case');
  }
  const target = resolve(root, name);
  if (!isInside(root, target)) throw new PathRefused('The skill directory escapes the skills root');
  return target;
}

/**
 * Whether a name is acceptable as a new skill directory name.
 * @param name - candidate name.
 * @returns whether {@link resolveSkillDir} would accept it.
 */
export function isValidSkillDirName(name: string): boolean {
  return typeof name === 'string' && !name.startsWith('.') && SKILL_DIR_NAME.test(name);
}

/** What a scanned directory member is, after refusing to follow links. */
export type MemberKind = 'file' | 'directory' | 'symlink' | 'other';

/**
 * Classify a directory member without following symlinks.
 * @param path - absolute path.
 * @returns the member kind, or `other` when it cannot be inspected.
 */
export function memberKind(path: string): MemberKind {
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    return 'other';
  }
  if (stats.isSymbolicLink()) return 'symlink';
  if (stats.isDirectory()) return 'directory';
  if (stats.isFile()) return 'file';
  return 'other';
}

/**
 * List one directory without following symlinks.
 * @param path - absolute directory path.
 * @returns the member names.
 */
export function listDirectory(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

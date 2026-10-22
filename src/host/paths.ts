/**
 * Path policy for the harness home.
 *
 * Every host-side file operation goes through this module: a relative skill path
 * arrives from the browser (or from an uploaded archive), and nothing else may
 * reach the filesystem until it has been proved to stay inside the harness home.
 * A skill is addressed by its path relative to that home — `skills/foo`,
 * `profiles/web/skills/bar` — because the same directory name may occur under
 * several roots and those are different skills. Symlinks are never followed:
 * starting at the home itself, every segment is `lstat`ed and refused if it is a
 * link, and files must be plain regular files.
 */
import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

/** Options accepted by the path resolvers. */
export interface PathOptions {
  /** Accept a symbolic link whose target lies outside the base (read-only roots). */
  readonly allowExternalLinks?: boolean;
}

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

/** A legal new-skill directory name: lowercase kebab-case, no dots or separators. */
const SKILL_DIR_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** One segment of a relative skill path: no dots at the front, no separators. */
const PATH_SEGMENT = /^[A-Za-z0-9@][A-Za-z0-9._@+-]*$/;

/** Directory names never descended into while scanning for skills. */
export const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  '.cache',
  '.caches',
  'cache',
  'caches',
  '.pnpm-store',
  'pnpm-store',
  '.pnpm-state',
  'pnpm-state',
  '.venv',
  'venv',
  'virtualenv',
  '__pycache__',
  '.tmp',
  '.trash',
  '.next',
  '.turbo',
  '.parcel-cache',
]);

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
 * Split a relative skill path into its segments.
 * @param relative - path relative to the harness home, with `/` separators.
 * @returns the validated segments.
 * @throws {PathRefused} for an absolute path, an empty or dot segment, `..`,
 *   backslashes, NUL bytes, or a segment that is not a plain name.
 */
export function splitSkillPath(relative: string): string[] {
  if (typeof relative !== 'string' || relative === '') {
    throw new PathRefused('The skill path is empty');
  }
  if (relative.includes('\0')) throw new PathRefused('The skill path contains a NUL byte');
  if (relative.includes('\\')) throw new PathRefused('The skill path contains a backslash');
  if (relative.startsWith('/')) throw new PathRefused('The skill path is absolute');
  const segments = relative.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new PathRefused('The skill path contains an empty, "." or ".." segment');
    }
    if (!PATH_SEGMENT.test(segment)) {
      throw new PathRefused(`The skill path segment "${segment}" is not a plain directory name`);
    }
  }
  return segments;
}

/**
 * Resolve a relative skill path against a base directory.
 *
 * Escape is proved, not assumed: the path is split into plain segments first, and
 * the result must still sit under the base once symlinks are resolved. That
 * second check is what makes a link to `/etc` or to another package useless as an
 * escape, while still allowing the symlinked tree a package manager builds —
 * pnpm installs every package as a link into its store, and refusing those would
 * hide every packaged skill on such a host.
 *
 * Files themselves are never followed: callers ask {@link memberKind} and accept
 * only a regular file, so a symlinked `SKILL.md` can never be read or written
 * through this module.
 * @param base - absolute base directory.
 * @param relative - path relative to the base, `/` separated.
 * @param options - `allowExternalLinks` accepts a link whose target sits outside
 *   the base, which is how a package manager installs dependencies; it is for
 *   read-only package roots only, never for a writable tree.
 * @returns the absolute path, with symlinks resolved.
 * @throws {PathRefused} when the path escapes the base in any way.
 */
export function resolveSkillPath(base: string, relative: string, options: PathOptions = {}): string {
  const segments = splitSkillPath(relative);
  const root = resolve(base);
  const lexical = join(root, ...segments);
  if (!isWithin(root, lexical)) throw new PathRefused('The skill path escapes its root');

  let real: string;
  try {
    real = realpathSync(lexical);
  } catch {
    // Nothing there yet: the lexical path is what a create would use.
    return lexical;
  }
  let realRoot: string;
  try {
    realRoot = realpathSync(root);
  } catch {
    realRoot = root;
  }
  if (real !== realRoot && !isWithin(realRoot, real) && options.allowExternalLinks !== true) {
    throw new PathRefused('The skill path escapes its root through a symbolic link');
  }
  return real;
}

/**
 * Whether a relative path stays inside one of the given root prefixes.
 * @param relative - path relative to the harness home.
 * @param roots - relative prefixes such as `skills` or `profiles`.
 * @returns whether the path is one of the roots or sits below one.
 */
export function isUnderRoots(relative: string, roots: readonly string[]): boolean {
  return roots.some((root) => relative === root || relative.startsWith(`${root}/`));
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

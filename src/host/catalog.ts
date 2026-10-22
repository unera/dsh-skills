/**
 * The catalog the page renders: our own skills, skills bundled inside installed
 * packages, and skills a provider only offers virtually.
 *
 * The three sets are found in three different ways and are not equal in rights.
 * Our own skills live under `<home>/skills` and are fully editable. A packaged
 * skill lives inside a dependency's `node_modules` directory: it can be read and
 * downloaded, but changing it would be changing a dependency that the next
 * install overwrites, so the page marks it read-only and the host refuses every
 * write to it. A virtual skill has no file at all — a provider such as the agent
 * preset registry contributes it from memory — and the page can only say so.
 */
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import {
  describeSkill,
  scanPackageSkills,
  scanUserSkills,
  type SkillStatus,
  type SkillSummary,
} from './scan.js';
import { memberKind, SKIPPED_DIRECTORIES } from './paths.js';

/** Where a row comes from. */
export type SkillOrigin = 'user' | 'plugin' | 'virtual';

/** Actions the host is willing to perform for one row. */
export type SkillAction =
  | 'view'
  | 'edit'
  | 'rename'
  | 'upload'
  | 'downloadMd'
  | 'downloadZip'
  | 'enable'
  | 'disable';

/** One row as the browser receives it. */
export interface SkillRow {
  /** Opaque, resolvable id: `<origin>:<rootKey>:<relative path>`. */
  readonly id: string;
  /** Where the skill comes from. */
  readonly origin: SkillOrigin;
  /** Whether the row accepts writes; true for packaged and virtual skills. */
  readonly readOnly: boolean;
  /** Directory path for display: relative to the home, or to the package root. */
  readonly dir: string;
  /** File path for display; empty for a virtual row. */
  readonly path: string;
  /** Frontmatter or provider name, or null. */
  readonly name: string | null;
  /** Description, or null. */
  readonly description: string | null;
  /** Extra routing hint, or null. */
  readonly whenToUse: string | null;
  /** Active, disabled, the broken both-files state, or a provider-only skill. */
  readonly status: SkillStatus | 'virtual';
  /** The file the row acts on; null for a virtual row. */
  readonly fileName: string | null;
  /** Size in bytes of the displayed file. */
  readonly size: number;
  /** Modification time in milliseconds. */
  readonly mtimeMs: number;
  /** Which skill files exist in the directory. */
  readonly presentFiles: readonly string[];
  /** Owning package, for a packaged or provider-supplied skill. */
  readonly packageName?: string;
  /** What the host allows for this row. */
  readonly actions: readonly SkillAction[];
}

/** A directory a skill may be resolved against. */
export interface Root {
  /** Stable key used inside row ids (`home`, `install`, `profile:web`). */
  readonly key: string;
  /** Absolute directory. */
  readonly absolute: string;
  /** What kind of root it is. */
  readonly kind: 'home' | 'install' | 'profile';
}

/** One installed package found in a `node_modules` directory. */
export interface InstalledPackage {
  /** Package name from its manifest. */
  readonly name: string;
  /** Package directory relative to the root, `/` separated. */
  readonly relative: string;
}

/** Everything the catalog needs from outside. */
export interface CatalogOptions {
  /** Absolute harness home. */
  readonly home: string;
  /** Absolute harness installation directory, when one can be found. */
  readonly installDir?: string | undefined;
  /** Provider-supplied skills, already listed by `ctx.skills`. */
  readonly provided?: readonly ProvidedSkill[] | undefined;
}

/** A skill a provider reports, as `ctx.skills.list()` returns it. */
export interface ProvidedSkill {
  /** Skill name. */
  readonly name: string;
  /** Short description. */
  readonly description?: string | undefined;
  /** Routing hint. */
  readonly whenToUse?: string | undefined;
  /** Absolute instruction path, absent for a purely virtual skill. */
  readonly path?: string | undefined;
  /** Provider that owns it. */
  readonly provider?: string | undefined;
}

/**
 * Find the harness installation from the running entry point.
 * @param entry - `process.argv[1]`, the `dsh` executable.
 * @returns the directory whose `package.json` names `@deepseek-ai/dsh`, or undefined.
 */
export function findDshInstall(entry: string | undefined = process.argv[1]): string | undefined {
  if (typeof entry !== 'string' || entry === '') return undefined;
  let start: string;
  try {
    start = dirname(realpathSync(entry));
  } catch {
    return undefined;
  }
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    const manifest = join(current, 'package.json');
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown };
        if (parsed.name === '@deepseek-ai/dsh') return current;
      } catch {
        /* an unreadable manifest is not our installation */
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

/**
 * The roots a skill id may name: the home, the installation, and every profile.
 * @param home - absolute harness home.
 * @param installDir - absolute installation directory, when known.
 * @returns the roots in a stable order.
 */
export function discoverRoots(home: string, installDir?: string): Root[] {
  const roots: Root[] = [{ key: 'home', absolute: home, kind: 'home' }];
  if (typeof installDir === 'string' && installDir !== '') {
    roots.push({ key: 'install', absolute: installDir, kind: 'install' });
  }
  const profiles = join(home, 'profiles');
  if (memberKind(profiles) === 'directory') {
    for (const name of readdirSync(profiles).sort()) {
      if (name.startsWith('.') || SKIPPED_DIRECTORIES.has(name)) continue;
      if (memberKind(join(profiles, name)) !== 'directory') continue;
      roots.push({ key: `profile:${name}`, absolute: join(profiles, name), kind: 'profile' });
    }
  }
  return roots;
}

/**
 * List the packages installed in one `node_modules` directory.
 *
 * Only direct children are read — a package's own dependencies are its business
 * and are not descended into.
 * @param rootAbsolute - directory that owns the `node_modules`.
 * @returns installed packages with their paths relative to the root.
 */
export function listInstalledPackages(rootAbsolute: string): InstalledPackage[] {
  const nodeModules = join(rootAbsolute, 'node_modules');
  if (memberKind(nodeModules) !== 'directory') return [];
  const packages: InstalledPackage[] = [];

  const consider = (relativePath: string): void => {
    const absolute = join(rootAbsolute, relativePath);
    if (memberKind(absolute) !== 'directory') return;
    const manifest = join(absolute, 'package.json');
    if (memberKind(manifest) !== 'file') return;
    try {
      const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown };
      if (typeof parsed.name !== 'string' || parsed.name === '') return;
      packages.push({ name: parsed.name, relative: relativePath.split(sep).join('/') });
    } catch {
      /* an unreadable manifest means an unusable package */
    }
  };

  let entries: string[];
  try {
    entries = readdirSync(nodeModules).sort();
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    if (entry.startsWith('@')) {
      let scoped: string[];
      try {
        scoped = readdirSync(join(nodeModules, entry)).sort();
      } catch {
        continue;
      }
      for (const name of scoped) {
        if (name.startsWith('.')) continue;
        consider(join('node_modules', entry, name));
      }
      continue;
    }
    consider(join('node_modules', entry));
  }
  return packages;
}

/**
 * Path of a file relative to the home, or to its package directory when it sits
 * outside the home.
 * @param target - absolute path.
 * @param home - absolute harness home.
 * @param packageDir - absolute owning package directory, when known.
 * @returns the display path with `/` separators.
 */
function displayPath(target: string, home: string, packageDir?: string): string {
  const fromHome = relative(home, target);
  if (fromHome !== '' && !fromHome.startsWith('..') && !isAbsolute(fromHome)) {
    return fromHome.split(sep).join('/');
  }
  if (typeof packageDir === 'string') {
    const fromPackage = relative(packageDir, target);
    if (fromPackage !== '' && !fromPackage.startsWith('..') && !isAbsolute(fromPackage)) {
      return fromPackage.split(sep).join('/');
    }
  }
  return target.split(sep).join('/');
}

/** Actions available for one summary of our own skills. */
function userActions(summary: SkillSummary): SkillAction[] {
  const actions: SkillAction[] = ['view', 'edit', 'rename', 'upload', 'downloadMd', 'downloadZip'];
  if (summary.status === 'active') actions.push('disable');
  if (summary.status === 'disabled') actions.push('enable');
  return actions;
}

/** Actions available for a packaged skill: read and download, never write. */
const PACKAGE_ACTIONS: readonly SkillAction[] = ['view', 'downloadMd', 'downloadZip'];

/**
 * Actions for a skill a provider supplies: its text can be read (from the
 * provider, since there is no file we own) and downloaded as markdown, but there
 * is no directory to archive and nothing to write.
 */
const PROVIDED_ACTIONS: readonly SkillAction[] = ['view', 'downloadMd'];

/** How long a package scan is reused; packaged skills never change under us. */
const PACKAGE_TTL_MS = 30_000;

/** Per-root cache of packaged rows, so a page load does not re-read 500 manifests. */
const packageCache = new Map<string, { at: number; rows: SkillRow[] }>();

/**
 * Drop the packaged-skill cache. Tests call it; a host may call it after an
 * install.
 */
export function clearPackageCache(): void {
  packageCache.clear();
}

/**
 * Packaged rows for one root, cached for {@link PACKAGE_TTL_MS}.
 * @param home - absolute harness home, for display paths.
 * @param root - the root to scan.
 * @returns the rows.
 */
function packagedRows(home: string, root: Root): SkillRow[] {
  const key = `${root.key}:${root.absolute}`;
  const cached = packageCache.get(key);
  const now = Date.now();
  if (cached !== undefined && now - cached.at < PACKAGE_TTL_MS) return cached.rows;

  const rows: SkillRow[] = [];
  for (const pkg of listInstalledPackages(root.absolute)) {
    for (const summary of scanPackageSkills(root.absolute, pkg.relative)) {
      const absoluteDir = join(root.absolute, summary.dir);
      rows.push({
        id: `plugin:${root.key}:${summary.dir}`,
        origin: 'plugin',
        readOnly: true,
        dir: displayPath(absoluteDir, home, join(root.absolute, pkg.relative)),
        path: displayPath(join(absoluteDir, summary.fileName), home, join(root.absolute, pkg.relative)),
        name: summary.name,
        description: summary.description,
        whenToUse: summary.whenToUse,
        status: summary.status,
        fileName: summary.fileName,
        size: summary.size,
        mtimeMs: summary.mtimeMs,
        presentFiles: summary.presentFiles,
        packageName: pkg.name,
        actions: PACKAGE_ACTIONS,
      });
    }
  }
  packageCache.set(key, { at: now, rows });
  return rows;
}

/**
 * Build the whole catalog.
 * @param options - the home, the installation, and any provider-supplied skills.
 * @returns rows ordered by origin (user first), then by path.
 */
export function collectSkills(options: CatalogOptions): SkillRow[] {
  const { home } = options;
  const roots = discoverRoots(home, options.installDir);
  const rows: SkillRow[] = [];
  const seenPaths = new Set<string>();
  const fileNames = new Set<string>();

  /** Record the absolute identity of a file row so a provider copy cannot shadow it. */
  const remember = (absolute: string): void => {
    try {
      seenPaths.add(realpathSync(absolute));
    } catch {
      seenPaths.add(absolute);
    }
  };

  const userSkills = scanUserSkills(home);
  for (const summary of userSkills) {
    const absolute = join(home, summary.dir);
    remember(absolute);
    if (summary.name !== null) fileNames.add(summary.name);
    rows.push({
      id: `user:home:${summary.dir}`,
      origin: 'user',
      readOnly: false,
      dir: summary.dir,
      path: summary.path,
      name: summary.name,
      description: summary.description,
      whenToUse: summary.whenToUse,
      status: summary.status,
      fileName: summary.fileName,
      size: summary.size,
      mtimeMs: summary.mtimeMs,
      presentFiles: summary.presentFiles,
      actions: userActions(summary),
    });
  }

  for (const root of roots) {
    if (root.kind === 'home') continue;
    for (const row of packagedRows(home, root)) {
      remember(join(root.absolute, row.id.split(':').slice(2).join(':')));
      rows.push(row);
    }
  }

  for (const provided of options.provided ?? []) {
    if (typeof provided.path === 'string' && provided.path !== '') {
      let absolute = provided.path;
      try {
        absolute = realpathSync(provided.path);
      } catch {
        /* keep the reported path */
      }
      const directory = dirname(absolute);
      let known = seenPaths.has(absolute);
      if (!known) {
        try {
          known = seenPaths.has(realpathSync(directory));
        } catch {
          known = false;
        }
      }
      if (known) continue;
      seenPaths.add(absolute);
      fileNames.add(provided.name);
      rows.push({
        id: `plugin:provided:${provided.name}`,
        origin: 'plugin',
        readOnly: true,
        dir: displayPath(directory, home),
        path: displayPath(absolute, home),
        name: provided.name,
        description: provided.description ?? null,
        whenToUse: provided.whenToUse ?? null,
        status: 'active',
        fileName: null,
        size: 0,
        mtimeMs: 0,
        presentFiles: [],
        packageName: provided.provider,
        actions: PROVIDED_ACTIONS,
      });
      continue;
    }
    if (fileNames.has(provided.name)) continue;
    rows.push({
      id: `virtual:${provided.name}`,
      origin: 'virtual',
      readOnly: true,
      dir: provided.name,
      path: '',
      name: provided.name,
      description: provided.description ?? null,
      whenToUse: provided.whenToUse ?? null,
      status: 'virtual',
      fileName: null,
      size: 0,
      mtimeMs: 0,
      presentFiles: [],
      packageName: provided.provider,
      actions: PROVIDED_ACTIONS,
    });
  }

  return rows;
}

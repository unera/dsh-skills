import { lstatSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { homedir } from "node:os";
class PathRefused extends Error {
  /** Wire error code the client localizes. */
  code;
  /**
   * @param message - English, human-readable explanation.
   * @param code - wire error code, defaults to the format rejection.
   */
  constructor(message, code = "unrecognized-format") {
    super(message);
    this.name = "PathRefused";
    this.code = code;
  }
}
const SKILL_DIR_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATH_SEGMENT = /^[A-Za-z0-9@][A-Za-z0-9._@+-]*$/;
const SKIPPED_DIRECTORIES = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".cache",
  ".caches",
  "cache",
  "caches",
  ".pnpm-store",
  "pnpm-store",
  ".pnpm-state",
  "pnpm-state",
  ".venv",
  "venv",
  "virtualenv",
  "__pycache__",
  ".tmp",
  ".trash",
  ".next",
  ".turbo",
  ".parcel-cache"
]);
function expandHome(path) {
  if (path === "~") return homedir();
  if (path.startsWith("~/") || path.startsWith("~\\")) return join(homedir(), path.slice(2));
  return path;
}
function resolveDshHome(configured, env = process.env) {
  const candidates = [configured, env.DSH_HOME];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed !== "") return resolve(expandHome(trimmed));
  }
  return resolve(join(homedir(), ".dsh"));
}
function resolveSkillsRoot(config, env = process.env) {
  if (typeof config?.skillsRoot === "string" && config.skillsRoot.trim() !== "") {
    return resolve(expandHome(config.skillsRoot.trim()));
  }
  return join(resolveDshHome(config?.dshHome, env), "skills");
}
function isInside(parent, child) {
  const base = parent.endsWith(sep) ? parent : parent + sep;
  return child.startsWith(base) && child.length > base.length && !child.slice(base.length).includes(sep);
}
function isWithin(parent, child) {
  const base = parent.endsWith(sep) ? parent : parent + sep;
  return child === parent || child.startsWith(base);
}
function resolveSkillDir(root, name) {
  if (typeof name !== "string" || name === "") {
    throw new PathRefused("The skill directory name is empty");
  }
  if (name.includes("\0")) throw new PathRefused("The skill directory name contains a NUL byte");
  if (name.includes("/") || name.includes("\\")) {
    throw new PathRefused("The skill directory name contains a path separator");
  }
  if (name.startsWith(".")) throw new PathRefused("The skill directory name starts with a dot");
  if (!SKILL_DIR_NAME.test(name)) {
    throw new PathRefused("The skill directory name is not lowercase kebab-case");
  }
  const target = resolve(root, name);
  if (!isInside(root, target)) throw new PathRefused("The skill directory escapes the skills root");
  return target;
}
function splitSkillPath(relative) {
  if (typeof relative !== "string" || relative === "") {
    throw new PathRefused("The skill path is empty");
  }
  if (relative.includes("\0")) throw new PathRefused("The skill path contains a NUL byte");
  if (relative.includes("\\")) throw new PathRefused("The skill path contains a backslash");
  if (relative.startsWith("/")) throw new PathRefused("The skill path is absolute");
  const segments = relative.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new PathRefused('The skill path contains an empty, "." or ".." segment');
    }
    if (!PATH_SEGMENT.test(segment)) {
      throw new PathRefused(`The skill path segment "${segment}" is not a plain directory name`);
    }
  }
  return segments;
}
function resolveSkillPath(base, relative, options = {}) {
  const segments = splitSkillPath(relative);
  const root = resolve(base);
  const lexical = join(root, ...segments);
  if (!isWithin(root, lexical)) throw new PathRefused("The skill path escapes its root");
  let real;
  try {
    real = realpathSync(lexical);
  } catch {
    return lexical;
  }
  let realRoot;
  try {
    realRoot = realpathSync(root);
  } catch {
    realRoot = root;
  }
  if (real !== realRoot && !isWithin(realRoot, real) && options.allowExternalLinks !== true) {
    throw new PathRefused("The skill path escapes its root through a symbolic link");
  }
  return real;
}
function isUnderRoots(relative, roots) {
  return roots.some((root) => relative === root || relative.startsWith(`${root}/`));
}
function isValidSkillDirName(name) {
  return typeof name === "string" && !name.startsWith(".") && SKILL_DIR_NAME.test(name);
}
function memberKind(path) {
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    return "other";
  }
  if (stats.isSymbolicLink()) return "symlink";
  if (stats.isDirectory()) return "directory";
  if (stats.isFile()) return "file";
  return "other";
}
function listDirectory(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}
export {
  PathRefused,
  SKIPPED_DIRECTORIES,
  expandHome,
  isInside,
  isUnderRoots,
  isValidSkillDirName,
  isWithin,
  listDirectory,
  memberKind,
  resolveDshHome,
  resolveSkillDir,
  resolveSkillPath,
  resolveSkillsRoot,
  splitSkillPath
};

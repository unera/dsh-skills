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
  writeFileSync
} from "node:fs";
import { join, posix } from "node:path";
import { frontmatterValue, parseFrontmatter } from "./frontmatter.js";
import {
  isValidSkillDirName,
  memberKind,
  PathRefused,
  resolveSkillPath,
  SKIPPED_DIRECTORIES
} from "./paths.js";
import { buildZip } from "./zip.js";
const ACTIVE_FILE = "SKILL.md";
const DISABLED_FILE = "_SKILL.md";
const SCAN_HEAD_BYTES = 256 * 1024;
const DEFAULT_MAX_DEPTH = 6;
function readHead(path, limit) {
  const descriptor = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(limit);
    const read = readSync(descriptor, buffer, 0, limit, 0);
    return buffer.subarray(0, read).toString("utf8");
  } finally {
    closeSync(descriptor);
  }
}
function describeSkill(home, dir, options = {}) {
  const absolute = resolveSkillPath(home, dir, options);
  if (memberKind(absolute) !== "directory") return null;
  const present = [];
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE]) {
    if (memberKind(join(absolute, fileName)) === "file") present.push(fileName);
  }
  if (present.length === 0) return null;
  const shown = present[0];
  const file = join(absolute, shown);
  const stats = lstatSync(file);
  let head = "";
  try {
    head = readHead(file, Math.min(stats.size, SCAN_HEAD_BYTES));
  } catch {
    head = "";
  }
  const parsed = parseFrontmatter(head);
  const status = present.length > 1 ? "conflict" : shown === ACTIVE_FILE ? "active" : "disabled";
  return {
    dir,
    status,
    fileName: shown,
    name: frontmatterValue(parsed, "name") ?? null,
    description: frontmatterValue(parsed, "description") ?? null,
    whenToUse: frontmatterValue(parsed, "whenToUse") ?? null,
    path: `${dir}/${shown}`,
    size: stats.size,
    mtimeMs: Math.round(stats.mtimeMs),
    presentFiles: present
  };
}
function scanOneLevel(base, relative, options = {}) {
  const absolute = resolveSkillPath(base, relative, options);
  if (memberKind(absolute) !== "directory") return [];
  let names;
  try {
    names = readdirSync(absolute).sort();
  } catch {
    return [];
  }
  const found = [];
  for (const name of names) {
    if (name.startsWith(".") || SKIPPED_DIRECTORIES.has(name)) continue;
    if (memberKind(join(absolute, name)) !== "directory") continue;
    const summary = describeSkill(base, `${relative}/${name}`, options);
    if (summary !== null) found.push(summary);
  }
  return found;
}
function scanUserSkills(home, skillsRelative = "skills") {
  return scanOneLevel(home, skillsRelative).sort((left, right) => left.dir.localeCompare(right.dir));
}
const PACKAGE_SKILL_DIRECTORIES = ["skills", "assets"];
function scanPackageSkills(base, packageRelative) {
  const found = [];
  const options = { allowExternalLinks: true };
  for (const directory of PACKAGE_SKILL_DIRECTORIES) {
    found.push(...scanOneLevel(base, `${packageRelative}/${directory}`, options));
  }
  return found;
}
function readSkillFile(home, dir, options = {}) {
  const absolute = resolveSkillPath(home, dir, options);
  if (memberKind(absolute) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE]) {
    if (memberKind(join(absolute, fileName)) !== "file") continue;
    const stats = lstatSync(join(absolute, fileName));
    return {
      dir,
      fileName,
      content: readHead(join(absolute, fileName), stats.size + 1),
      mtimeMs: Math.round(stats.mtimeMs),
      status: describeSkill(home, dir, options)?.status ?? "active"
    };
  }
  throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, "not-found");
}
function saveSkillFile(home, dir, content) {
  const absolute = resolveSkillPath(home, dir);
  if (memberKind(absolute) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  let fileName;
  for (const candidate of [ACTIVE_FILE, DISABLED_FILE]) {
    if (memberKind(join(absolute, candidate)) === "file") {
      fileName = candidate;
      break;
    }
  }
  if (fileName === void 0) throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, "not-found");
  const target = join(absolute, fileName);
  const temporary = join(absolute, `.${fileName}.${process.pid}.${Date.now()}.tmp`);
  try {
    const mode = statSync(target).mode & 511;
    writeFileSync(temporary, content, { mode });
    renameSync(temporary, target);
    return { fileName, mtimeMs: Math.round(statSync(target).mtimeMs) };
  } catch (error) {
    rmSync(temporary, { force: true });
    throw new PathRefused(`Could not write ${dir}/${fileName}: ${error.message}`, "write-failed");
  }
}
function setSkillEnabled(home, dir, enable) {
  const absolute = resolveSkillPath(home, dir);
  if (memberKind(absolute) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  const from = enable ? DISABLED_FILE : ACTIVE_FILE;
  const to = enable ? ACTIVE_FILE : DISABLED_FILE;
  const source = join(absolute, from);
  const target = join(absolute, to);
  if (memberKind(source) !== "file") {
    throw new PathRefused(`Skill "${dir}" has no ${from} to rename`, "not-found");
  }
  if (memberKind(target) !== "other") {
    throw new PathRefused(`Skill "${dir}" already has ${to}`, "conflict");
  }
  try {
    renameSync(source, target);
  } catch (error) {
    throw new PathRefused(`Could not rename ${dir}/${from}: ${error.message}`, "write-failed");
  }
  return { fileName: to, status: enable ? "active" : "disabled" };
}
function renameSkillDirectory(home, dir, newName) {
  const source = resolveSkillPath(home, dir);
  if (memberKind(source) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  if (!isValidSkillDirName(newName)) {
    throw new PathRefused(
      `"${newName}" is not a legal skill directory name (lowercase kebab-case required)`,
      "name-mismatch"
    );
  }
  const parent = posix.dirname(dir);
  const targetRelative = parent === "." ? newName : `${parent}/${newName}`;
  if (targetRelative === dir) {
    throw new PathRefused(`Skill "${dir}" already has that name`, "name-mismatch");
  }
  const target = resolveSkillPath(home, targetRelative);
  if (memberKind(target) !== "other") {
    throw new PathRefused(`A skill with the name "${newName}" already exists here`, "already-exists");
  }
  try {
    renameSync(source, target);
  } catch (error) {
    throw new PathRefused(`Could not rename "${dir}": ${error.message}`, "write-failed");
  }
  const summary = describeSkill(home, targetRelative);
  return { dir: targetRelative, status: summary?.status ?? "active" };
}
function collectSkillTree(home, dir, options = {}) {
  const absolute = resolveSkillPath(home, dir, options);
  if (memberKind(absolute) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  const root = posix.basename(dir);
  const members = [];
  const walk = (path, prefix) => {
    const names = readdirSync(path).sort();
    for (const name of names) {
      const child = join(path, name);
      const relative = `${prefix}${name}`;
      const kind = memberKind(child);
      if (kind === "symlink") continue;
      if (kind === "directory") {
        const stats2 = lstatSync(child);
        members.push({ name: `${relative}/`, mode: stats2.mode & 511, mtime: stats2.mtime });
        walk(child, `${relative}/`);
        continue;
      }
      if (kind !== "file") continue;
      const stats = statSync(child);
      members.push({ name: relative, mode: stats.mode & 511, mtime: stats.mtime, data: readFileSync(child) });
    }
  };
  walk(absolute, `${root}/`);
  return members;
}
function zipSkill(home, dir, options = {}) {
  return buildZip(collectSkillTree(home, dir, options));
}
const STAGING_PREFIX = ".dsh-skills-staging-";
function createStaging(parent) {
  const path = join(parent, `${STAGING_PREFIX}${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
  mkdirSync(path, { recursive: false, mode: 448 });
  return path;
}
function removeStaging(path) {
  rmSync(path, { recursive: true, force: true });
}
export {
  ACTIVE_FILE,
  DEFAULT_MAX_DEPTH,
  DISABLED_FILE,
  STAGING_PREFIX,
  collectSkillTree,
  createStaging,
  describeSkill,
  isValidSkillDirName,
  readSkillFile,
  removeStaging,
  renameSkillDirectory,
  saveSkillFile,
  scanPackageSkills,
  scanUserSkills,
  setSkillEnabled,
  zipSkill
};

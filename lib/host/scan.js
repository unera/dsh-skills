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
import { join } from "node:path";
import { frontmatterValue, parseFrontmatter } from "./frontmatter.js";
import { isValidSkillDirName, listDirectory, memberKind, resolveSkillDir, PathRefused } from "./paths.js";
import { buildZip } from "./zip.js";
const ACTIVE_FILE = "SKILL.md";
const DISABLED_FILE = "_SKILL.md";
const SCAN_HEAD_BYTES = 256 * 1024;
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
function describeSkill(root, dir) {
  if (!isValidSkillDirName(dir)) return null;
  const directory = join(root, dir);
  if (memberKind(directory) !== "directory") return null;
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE]) {
    const file = join(directory, fileName);
    if (memberKind(file) !== "file") continue;
    const stats = lstatSync(file);
    let head = "";
    try {
      head = readHead(file, Math.min(stats.size, SCAN_HEAD_BYTES));
    } catch {
      head = "";
    }
    const parsed = parseFrontmatter(head);
    return {
      dir,
      status: fileName === ACTIVE_FILE ? "active" : "disabled",
      fileName,
      name: frontmatterValue(parsed, "name") ?? null,
      description: frontmatterValue(parsed, "description") ?? null,
      whenToUse: frontmatterValue(parsed, "whenToUse") ?? null,
      path: `${dir}/${fileName}`,
      size: stats.size,
      mtimeMs: Math.round(stats.mtimeMs)
    };
  }
  return null;
}
function scanSkills(root) {
  if (memberKind(root) !== "directory") return [];
  const summaries = [];
  for (const dir of listDirectory(root).sort()) {
    if (dir.startsWith(".")) continue;
    const summary = describeSkill(root, dir);
    if (summary !== null) summaries.push(summary);
  }
  return summaries;
}
function readSkillFile(root, dir) {
  const directory = resolveSkillDir(root, dir);
  if (memberKind(directory) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  for (const fileName of [ACTIVE_FILE, DISABLED_FILE]) {
    const file = join(directory, fileName);
    if (memberKind(file) !== "file") continue;
    const stats = lstatSync(file);
    return { dir, fileName, content: readHead(file, stats.size + 1), mtimeMs: Math.round(stats.mtimeMs) };
  }
  throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, "not-found");
}
function saveSkillFile(root, dir, content) {
  const directory = resolveSkillDir(root, dir);
  if (memberKind(directory) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  let fileName;
  for (const candidate of [ACTIVE_FILE, DISABLED_FILE]) {
    if (memberKind(join(directory, candidate)) === "file") {
      fileName = candidate;
      break;
    }
  }
  if (fileName === void 0) throw new PathRefused(`Skill "${dir}" has no ${ACTIVE_FILE}`, "not-found");
  const target = join(directory, fileName);
  const temporary = join(directory, `.${fileName}.${process.pid}.${Date.now()}.tmp`);
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
function collectSkillTree(root, dir) {
  const directory = resolveSkillDir(root, dir);
  if (memberKind(directory) !== "directory") {
    throw new PathRefused(`Skill "${dir}" does not exist`, "not-found");
  }
  const members = [];
  const walk = (absolute, prefix) => {
    const names = readdirSync(absolute).sort();
    for (const name of names) {
      const child = join(absolute, name);
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
      members.push({
        name: relative,
        mode: stats.mode & 511,
        mtime: stats.mtime,
        data: readFileSync(child)
      });
    }
  };
  walk(directory, `${dir}/`);
  return members;
}
function zipSkill(root, dir) {
  return buildZip(collectSkillTree(root, dir));
}
const STAGING_PREFIX = ".dsh-skills-staging-";
function createStaging(root) {
  const path = join(root, `${STAGING_PREFIX}${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
  mkdirSync(path, { recursive: false, mode: 448 });
  return path;
}
function removeStaging(path) {
  rmSync(path, { recursive: true, force: true });
}
export {
  ACTIVE_FILE,
  DISABLED_FILE,
  STAGING_PREFIX,
  collectSkillTree,
  createStaging,
  describeSkill,
  readSkillFile,
  removeStaging,
  saveSkillFile,
  scanSkills,
  zipSkill
};

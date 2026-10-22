import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { frontmatterValue, parseFrontmatter } from "./frontmatter.js";
import {
  ACTIVE_FILE,
  DISABLED_FILE,
  describeSkill,
  readSkillFile,
  removeStaging,
  scanSkills
} from "./scan.js";
import { isWithin, isValidSkillDirName, memberKind, resolveSkillDir } from "./paths.js";
import { looksLikeZip, readZip, ZipRefused } from "./zip.js";
class UploadRejected extends Error {
  /** Wire error code the client localizes. */
  code;
  /**
   * @param message - English explanation for the JSON body and the log.
   * @param code - wire code; defaults to the format rejection.
   */
  constructor(message, code = "unrecognized-format") {
    super(message);
    this.name = "UploadRejected";
    this.code = code;
  }
}
const UNRECOGNIZED = "Unrecognized skill format";
function topLevel(name) {
  const trimmed = name.endsWith("/") ? name.slice(0, -1) : name;
  const slash = trimmed.indexOf("/");
  if (slash === -1) return { segment: trimmed, rest: "" };
  return { segment: trimmed.slice(0, slash), rest: trimmed.slice(slash + 1) };
}
function classifyZip(root, bytes) {
  let entries;
  try {
    entries = readZip(bytes);
  } catch (error) {
    if (error instanceof ZipRefused) throw new UploadRejected(`${UNRECOGNIZED}: ${error.message}`);
    throw error;
  }
  if (entries.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the archive is empty`);
  const tops = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const { segment } = topLevel(entry.name);
    if (segment === "") throw new UploadRejected(`${UNRECOGNIZED}: the archive has an entry at its root`);
    tops.add(segment);
  }
  if (tops.size !== 1) {
    throw new UploadRejected(`${UNRECOGNIZED}: the archive must contain exactly one top-level directory`);
  }
  const dir = [...tops][0];
  for (const entry of entries) {
    const { segment } = topLevel(entry.name);
    if (segment !== dir || entry.name === dir) {
      throw new UploadRejected(`${UNRECOGNIZED}: every member must sit inside "${dir}/"`);
    }
  }
  const skillEntry = entries.find((entry) => entry.name === `${dir}/${ACTIVE_FILE}`);
  if (skillEntry === void 0) {
    throw new UploadRejected(`${UNRECOGNIZED}: the archive has no ${dir}/${ACTIVE_FILE}`);
  }
  if (!isValidSkillDirName(dir) || memberKind(join(root, dir)) !== "directory") {
    throw new UploadRejected(`${UNRECOGNIZED}: no installed skill directory is named "${dir}"`);
  }
  return { kind: "zip", dir, entries };
}
function classifyFile(root, filename, bytes) {
  if (filename !== ACTIVE_FILE) {
    throw new UploadRejected(`${UNRECOGNIZED}: a single-file upload must be named ${ACTIVE_FILE}`);
  }
  if (bytes.includes(0)) throw new UploadRejected(`${UNRECOGNIZED}: the file is not text`);
  const content = bytes.toString("utf8");
  const parsed = parseFrontmatter(content);
  const name = frontmatterValue(parsed, "name");
  if (name === void 0) {
    throw new UploadRejected(
      "The uploaded SKILL.md has no frontmatter name, so no skill can be matched or created",
      "name-mismatch"
    );
  }
  if (!isValidSkillDirName(name)) {
    throw new UploadRejected(
      `The frontmatter name "${name}" is not a legal directory name (lowercase kebab-case required)`,
      "name-mismatch"
    );
  }
  const skills = scanSkills(root);
  const target = skills.find((skill) => skill.dir === name) ?? skills.find((skill) => skill.name === name) ?? null;
  if (target !== null) {
    return { kind: "file-replace", dir: target.dir, fileName: target.fileName, content };
  }
  const directory = resolveSkillDir(root, name);
  if (memberKind(directory) !== "other") {
    throw new UploadRejected(`A skill directory named "${name}" already exists but has no ${ACTIVE_FILE}`, "name-mismatch");
  }
  return { kind: "file-create", dir: name, content };
}
function classifyUpload(root, filename, bytes) {
  if (bytes.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the upload is empty`);
  return looksLikeZip(bytes) ? classifyZip(root, bytes) : classifyFile(root, filename, bytes);
}
function extract(staging, dir, entries) {
  const target = join(staging, "new");
  mkdirSync(target, { recursive: false, mode: 448 });
  for (const entry of entries) {
    const relative = entry.name.slice(dir.length + 1);
    if (relative === "") continue;
    const destination = join(target, relative);
    if (!isWithin(target, destination)) {
      throw new UploadRejected(`${UNRECOGNIZED}: the archive escapes its directory`);
    }
    if (entry.directory) {
      mkdirSync(destination, { recursive: true, mode: entry.mode });
      continue;
    }
    mkdirSync(join(destination, ".."), { recursive: true });
    if (existsSync(destination) && lstatSync(destination).isDirectory()) {
      throw new UploadRejected(`${UNRECOGNIZED}: a file entry collides with a directory`);
    }
    writeFileSync(destination, entry.data, { mode: entry.mode });
  }
  return target;
}
function replaceDirectory(root, dir, entries) {
  const live = resolveSkillDir(root, dir);
  const staging = mkdtempSync(join(root, ".dsh-skills-staging-"));
  const aside = join(staging, "old");
  try {
    const unpacked = extract(staging, dir, entries);
    renameSync(live, aside);
    try {
      renameSync(unpacked, live);
    } catch (error) {
      renameSync(aside, live);
      throw error;
    }
    return { action: "replaced", dir, fileName: ACTIVE_FILE };
  } catch (error) {
    if (error instanceof UploadRejected) throw error;
    throw new UploadRejected(
      `Could not replace "${dir}": ${error.message}`,
      "write-failed"
    );
  } finally {
    removeStaging(staging);
  }
}
function applyUpload(root, descriptor) {
  if (descriptor.kind === "zip") return replaceDirectory(root, descriptor.dir, descriptor.entries);
  if (descriptor.kind === "file-replace") {
    const directory2 = resolveSkillDir(root, descriptor.dir);
    const target = join(directory2, descriptor.fileName);
    const temporary = join(directory2, `.${descriptor.fileName}.upload.tmp`);
    try {
      const mode = memberKind(target) === "file" ? lstatSync(target).mode & 511 : 420;
      writeFileSync(temporary, descriptor.content, { mode });
      renameSync(temporary, target);
      return { action: "replaced", dir: descriptor.dir, fileName: descriptor.fileName };
    } catch (error) {
      rmSync(temporary, { force: true });
      throw new UploadRejected(
        `Could not write "${descriptor.dir}/${descriptor.fileName}": ${error.message}`,
        "write-failed"
      );
    }
  }
  const directory = resolveSkillDir(root, descriptor.dir);
  try {
    mkdirSync(directory, { recursive: false, mode: 493 });
    writeFileSync(join(directory, ACTIVE_FILE), descriptor.content, { mode: 420 });
    return { action: "created", dir: descriptor.dir, fileName: ACTIVE_FILE };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw new UploadRejected(
      `Could not create "${descriptor.dir}": ${error.message}`,
      "write-failed"
    );
  }
}
function snapshotTree(root) {
  const lines = [];
  const walk = (absolute, prefix) => {
    for (const name of readdirSync(absolute).sort()) {
      if (name.startsWith(".")) continue;
      const child = join(absolute, name);
      const stats = lstatSync(child);
      const mode = (stats.mode & 511).toString(8);
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
  walk(root, "");
  return lines.join("\n");
}
export {
  DISABLED_FILE,
  UploadRejected,
  applyUpload,
  classifyUpload,
  describeSkill,
  readSkillFile,
  snapshotTree
};

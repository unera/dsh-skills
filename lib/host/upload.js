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
import { dirname, join } from "node:path";
import {
  ACTIVE_FILE,
  DISABLED_FILE,
  describeSkill,
  readSkillFile,
  removeStaging,
  scanUserSkills
} from "./scan.js";
import { isWithin, isValidSkillDirName, memberKind, resolveSkillPath } from "./paths.js";
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
const ALREADY_EXISTS = "A skill with this name already exists; replace it from the row menu instead";
function baseName(dir) {
  const parts = dir.split("/");
  return parts[parts.length - 1] ?? dir;
}
function topLevel(name) {
  const trimmed = name.endsWith("/") ? name.slice(0, -1) : name;
  const slash = trimmed.indexOf("/");
  if (slash === -1) return { segment: trimmed, rest: "" };
  return { segment: trimmed.slice(0, slash), rest: trimmed.slice(slash + 1) };
}
function readArchive(bytes) {
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
  const folder = [...tops][0];
  for (const entry of entries) {
    const { segment } = topLevel(entry.name);
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
function classifyCreateUpload(home, skillsDir, bytes) {
  if (bytes.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the upload is empty`);
  if (!looksLikeZip(bytes)) {
    throw new UploadRejected(`${UNRECOGNIZED}: a new skill is uploaded as a ZIP of its folder`);
  }
  const { folder, entries } = readArchive(bytes);
  const exists = memberKind(join(home, skillsDir, folder)) !== "other" || scanUserSkills(home, skillsDir).some((skill) => baseName(skill.dir) === folder);
  if (exists) throw new UploadRejected(ALREADY_EXISTS, "already-exists");
  return { kind: "zip-create", dir: `${skillsDir}/${folder}`, entries };
}
function classifyReplaceUpload(dir, fileName, uploadName, bytes) {
  if (bytes.length === 0) throw new UploadRejected(`${UNRECOGNIZED}: the upload is empty`);
  const own = baseName(dir);
  if (looksLikeZip(bytes)) {
    const { folder, entries } = readArchive(bytes);
    if (folder !== own) {
      throw new UploadRejected(
        `${UNRECOGNIZED}: the archive is rooted at "${folder}", but this skill is "${own}"`
      );
    }
    return { kind: "zip", dir, entries };
  }
  if (uploadName !== ACTIVE_FILE) {
    throw new UploadRejected(`${UNRECOGNIZED}: a single-file upload must be named ${ACTIVE_FILE}`);
  }
  if (bytes.includes(0)) throw new UploadRejected(`${UNRECOGNIZED}: the file is not text`);
  return { kind: "file-replace", dir, fileName, content: bytes.toString("utf8") };
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
function replaceDirectory(home, dir, entries) {
  const live = resolveSkillPath(home, dir);
  const staging = mkdtempSync(join(home, ".dsh-skills-staging-"));
  const aside = join(staging, "old");
  try {
    const unpacked = extract(staging, baseName(dir), entries);
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
function createDirectoryFromArchive(home, dir, entries) {
  const live = resolveSkillPath(home, dir);
  const staging = mkdtempSync(join(home, ".dsh-skills-staging-"));
  try {
    if (memberKind(live) !== "other") throw new UploadRejected(ALREADY_EXISTS, "already-exists");
    const unpacked = extract(staging, baseName(dir), entries);
    mkdirSync(dirname(live), { recursive: true, mode: 493 });
    renameSync(unpacked, live);
    return { action: "created", dir, fileName: ACTIVE_FILE };
  } catch (error) {
    if (error instanceof UploadRejected) throw error;
    throw new UploadRejected(`Could not create "${dir}": ${error.message}`, "write-failed");
  } finally {
    removeStaging(staging);
  }
}
function applyUpload(home, descriptor) {
  if (descriptor.kind === "zip") return replaceDirectory(home, descriptor.dir, descriptor.entries);
  if (descriptor.kind === "zip-create") return createDirectoryFromArchive(home, descriptor.dir, descriptor.entries);
  if (descriptor.kind === "file-replace") {
    const directory = resolveSkillPath(home, descriptor.dir);
    const target = join(directory, descriptor.fileName);
    const temporary = join(directory, `.${descriptor.fileName}.upload.tmp`);
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
  throw new UploadRejected("Unknown upload descriptor", "bad-request");
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
  classifyCreateUpload,
  classifyReplaceUpload,
  describeSkill,
  readSkillFile,
  snapshotTree
};

import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import {
  scanPackageSkills,
  scanUserSkills
} from "./scan.js";
import { memberKind, SKIPPED_DIRECTORIES } from "./paths.js";
function findDshInstall(entry = process.argv[1]) {
  if (typeof entry !== "string" || entry === "") return void 0;
  let start;
  try {
    start = dirname(realpathSync(entry));
  } catch {
    return void 0;
  }
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    const manifest = join(current, "package.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8"));
        if (parsed.name === "@deepseek-ai/dsh") return current;
      } catch {
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return void 0;
}
function discoverRoots(home, installDir) {
  const roots = [{ key: "home", absolute: home, kind: "home" }];
  if (typeof installDir === "string" && installDir !== "") {
    roots.push({ key: "install", absolute: installDir, kind: "install" });
  }
  const profiles = join(home, "profiles");
  if (memberKind(profiles) === "directory") {
    for (const name of readdirSync(profiles).sort()) {
      if (name.startsWith(".") || SKIPPED_DIRECTORIES.has(name)) continue;
      if (memberKind(join(profiles, name)) !== "directory") continue;
      roots.push({ key: `profile:${name}`, absolute: join(profiles, name), kind: "profile" });
    }
  }
  return roots;
}
function listInstalledPackages(rootAbsolute) {
  const nodeModules = join(rootAbsolute, "node_modules");
  if (memberKind(nodeModules) !== "directory") return [];
  const packages = [];
  const consider = (relativePath) => {
    const absolute = join(rootAbsolute, relativePath);
    if (memberKind(absolute) !== "directory") return;
    const manifest = join(absolute, "package.json");
    if (memberKind(manifest) !== "file") return;
    try {
      const parsed = JSON.parse(readFileSync(manifest, "utf8"));
      if (typeof parsed.name !== "string" || parsed.name === "") return;
      packages.push({ name: parsed.name, relative: relativePath.split(sep).join("/") });
    } catch {
    }
  };
  let entries;
  try {
    entries = readdirSync(nodeModules).sort();
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    if (entry.startsWith("@")) {
      let scoped;
      try {
        scoped = readdirSync(join(nodeModules, entry)).sort();
      } catch {
        continue;
      }
      for (const name of scoped) {
        if (name.startsWith(".")) continue;
        consider(join("node_modules", entry, name));
      }
      continue;
    }
    consider(join("node_modules", entry));
  }
  return packages;
}
function displayPath(target, home, packageDir) {
  const fromHome = relative(home, target);
  if (fromHome !== "" && !fromHome.startsWith("..") && !isAbsolute(fromHome)) {
    return fromHome.split(sep).join("/");
  }
  if (typeof packageDir === "string") {
    const fromPackage = relative(packageDir, target);
    if (fromPackage !== "" && !fromPackage.startsWith("..") && !isAbsolute(fromPackage)) {
      return fromPackage.split(sep).join("/");
    }
  }
  return target.split(sep).join("/");
}
function userActions(summary) {
  const actions = ["edit", "rename", "upload", "downloadMd", "downloadZip"];
  if (summary.status === "active") actions.push("disable");
  if (summary.status === "disabled") actions.push("enable");
  return actions;
}
const PACKAGE_ACTIONS = ["downloadMd", "downloadZip"];
const PACKAGE_TTL_MS = 3e4;
const packageCache = /* @__PURE__ */ new Map();
function clearPackageCache() {
  packageCache.clear();
}
function packagedRows(home, root) {
  const key = `${root.key}:${root.absolute}`;
  const cached = packageCache.get(key);
  const now = Date.now();
  if (cached !== void 0 && now - cached.at < PACKAGE_TTL_MS) return cached.rows;
  const rows = [];
  for (const pkg of listInstalledPackages(root.absolute)) {
    for (const summary of scanPackageSkills(root.absolute, pkg.relative)) {
      const absoluteDir = join(root.absolute, summary.dir);
      rows.push({
        id: `plugin:${root.key}:${summary.dir}`,
        origin: "plugin",
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
        actions: PACKAGE_ACTIONS
      });
    }
  }
  packageCache.set(key, { at: now, rows });
  return rows;
}
function collectSkills(options) {
  const { home } = options;
  const roots = discoverRoots(home, options.installDir);
  const rows = [];
  const seenPaths = /* @__PURE__ */ new Set();
  const fileNames = /* @__PURE__ */ new Set();
  const remember = (absolute) => {
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
      origin: "user",
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
      actions: userActions(summary)
    });
  }
  for (const root of roots) {
    if (root.kind === "home") continue;
    for (const row of packagedRows(home, root)) {
      remember(join(root.absolute, row.id.split(":").slice(2).join(":")));
      rows.push(row);
    }
  }
  for (const provided of options.provided ?? []) {
    if (typeof provided.path === "string" && provided.path !== "") {
      let absolute = provided.path;
      try {
        absolute = realpathSync(provided.path);
      } catch {
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
        origin: "plugin",
        readOnly: true,
        dir: displayPath(directory, home),
        path: displayPath(absolute, home),
        name: provided.name,
        description: provided.description ?? null,
        whenToUse: provided.whenToUse ?? null,
        status: "active",
        fileName: null,
        size: 0,
        mtimeMs: 0,
        presentFiles: [],
        packageName: provided.provider,
        actions: []
      });
      continue;
    }
    if (fileNames.has(provided.name)) continue;
    rows.push({
      id: `virtual:${provided.name}`,
      origin: "virtual",
      readOnly: true,
      dir: provided.name,
      path: "",
      name: provided.name,
      description: provided.description ?? null,
      whenToUse: provided.whenToUse ?? null,
      status: "virtual",
      fileName: null,
      size: 0,
      mtimeMs: 0,
      presentFiles: [],
      packageName: provided.provider,
      actions: []
    });
  }
  return rows;
}
export {
  clearPackageCache,
  collectSkills,
  discoverRoots,
  findDshInstall,
  listInstalledPackages
};

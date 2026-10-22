import { collectSkills, discoverRoots } from "./catalog.js";
import { PathRefused } from "./paths.js";
import { ACTIVE_FILE, readSkillFile, renameSkillDirectory, saveSkillFile, setSkillEnabled, zipSkill } from "./scan.js";
import { applyUpload, classifyCreateUpload, classifyReplaceUpload, UploadRejected } from "./upload.js";
const ROUTE_PREFIX = "/dsh-skills";
const API_PREFIX = `${ROUTE_PREFIX}/api`;
const FILENAME_HEADER = "x-dsh-skills-filename";
const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_SAVE_BYTES = 2 * 1024 * 1024;
function coded(error) {
  if (error instanceof UploadRejected) return { code: error.code, message: error.message };
  if (error instanceof PathRefused) return { code: error.code, message: error.message };
  const message = error instanceof Error ? error.message : String(error);
  return { code: "write-failed", message };
}
function statusFor(code) {
  switch (code) {
    case "not-found":
      return 404;
    case "name-mismatch":
    case "conflict":
    case "already-exists":
      return 409;
    case "read-only":
      return 403;
    case "too-large":
      return 413;
    case "unrecognized-format":
      return 415;
    case "bad-request":
      return 400;
    default:
      return 500;
  }
}
function sendJson(response, status, body) {
  const payload = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(payload.length),
    "cache-control": "no-store"
  });
  response.end(payload);
}
function sendError(response, code, message) {
  sendJson(response, statusFor(code), { code, error: message });
}
function sendFile(response, body, filename, contentType) {
  response.writeHead(200, {
    "content-type": contentType,
    "content-length": String(body.length),
    "content-disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]|"/g, "_")}"`,
    "cache-control": "no-store"
  });
  response.end(body);
}
async function readBody(request, limit) {
  const declared = Number(request.headers["content-length"] ?? Number.NaN);
  if (Number.isFinite(declared) && declared > limit) {
    request.resume();
    return null;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > limit) {
      request.resume();
      return null;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
function fileNameOf(request) {
  const raw = request.headers[FILENAME_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value === "") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
function urlOf(request) {
  try {
    return new URL(request.url ?? "/", "http://localhost");
  } catch {
    return new URL("http://localhost/");
  }
}
function segmentsOf(pathname) {
  const rest = pathname.slice(API_PREFIX.length).replace(/^\/+/, "").replace(/\/+$/, "");
  if (rest === "") return [];
  try {
    return rest.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}
function resolveRow(rows, id) {
  const row = rows.find((candidate) => candidate.id === id);
  if (row === void 0) throw new PathRefused(`No skill is identified by "${id}"`, "not-found");
  return row;
}
async function loadRows(context) {
  let provided = [];
  if (typeof context.provided === "function") {
    try {
      provided = await context.provided();
    } catch (error) {
      context.logger?.warn?.(`[dsh-skills] the skill provider failed: ${error.message}`);
    }
  }
  return collectSkills({ home: context.home, installDir: context.installDir, provided });
}
function assertWritable(row) {
  if (row.readOnly || row.origin !== "user") {
    throw new PathRefused(`Skill "${row.dir}" is bundled with a plugin and is read-only here`, "read-only");
  }
}
async function writableRow(context, id) {
  const rows = await loadRows(context);
  const row = resolveRow(rows, id);
  assertWritable(row);
  return { row, absolute: directoryBase(context, id) };
}
async function handle(context, request, response) {
  const method = request.method ?? "GET";
  const segments = segmentsOf((request.url ?? "/").split("?")[0]);
  if (segments.length === 1 && segments[0] === "skills") {
    if (method !== "GET") return sendError(response, "bad-request", "Use GET for the skill list");
    try {
      const rows = await loadRows(context);
      const roots = discoverRoots(context.home, context.installDir).map((root) => ({
        key: root.key,
        kind: root.kind,
        absolute: root.absolute
      }));
      return sendJson(response, 200, { home: context.home, skillsDir: context.skillsDir, roots, skills: rows });
    } catch (error) {
      const { code, message } = coded(error);
      return sendError(response, code, message);
    }
  }
  if (segments.length === 1 && segments[0] === "upload") {
    if (method !== "POST") return sendError(response, "bad-request", "Use POST to upload a skill");
    const body = await readBody(request, context.maxUploadBytes);
    if (body === null) {
      return sendError(response, "too-large", `The upload exceeds the ${context.maxUploadBytes} byte limit`);
    }
    const url = urlOf(request);
    const mode = url.searchParams.get("mode") === "replace" ? "replace" : "create";
    try {
      const descriptor = mode === "create" ? classifyCreateUpload(context.home, context.skillsDir, body) : await replaceDescriptor(context, url.searchParams.get("id"), fileNameOf(request), body);
      const result = applyUpload(context.home, descriptor);
      context.logger?.info?.(`[dsh-skills] upload ${result.action} ${result.dir}/${result.fileName}`);
      return sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      const { code, message } = coded(error);
      context.logger?.warn?.(`[dsh-skills] upload refused (${code}): ${message}`);
      return sendError(response, code, message);
    }
  }
  if (segments[0] === "skill" && segments.length >= 2) {
    const id = segments[1];
    const action = segments.slice(2).join("/");
    try {
      if (action === "" && method === "GET") {
        const rows = await loadRows(context);
        const row = resolveRow(rows, id);
        if (row.fileName === null) {
          return sendError(response, "not-found", `Skill "${row.dir}" has no file to read`);
        }
        const file = readSkillFile(directoryBase(context, id), relativeOf(id), pathOptions(id));
        return sendJson(response, 200, file);
      }
      if (action === "" && method === "PUT") {
        const body = await readBody(request, MAX_SAVE_BYTES);
        if (body === null) {
          return sendError(response, "too-large", `The file exceeds the ${MAX_SAVE_BYTES} byte limit`);
        }
        let content;
        try {
          content = JSON.parse(body.toString("utf8")).content;
        } catch {
          return sendError(response, "bad-request", "The save body is not JSON");
        }
        if (typeof content !== "string") {
          return sendError(response, "bad-request", 'The save body has no string "content"');
        }
        await writableRow(context, id);
        const written = saveSkillFile(directoryBase(context, id), relativeOf(id), content);
        return sendJson(response, 200, { ok: true, id, ...written });
      }
      if ((action === "enable" || action === "disable") && method === "POST") {
        await writableRow(context, id);
        const renamed = setSkillEnabled(directoryBase(context, id), relativeOf(id), action === "enable");
        context.logger?.info?.(`[dsh-skills] ${action} ${id} -> ${renamed.fileName}`);
        return sendJson(response, 200, { ok: true, id, ...renamed });
      }
      if (action === "rename" && method === "POST") {
        const body = await readBody(request, 4096);
        if (body === null) return sendError(response, "too-large", "The rename body is too large");
        let name;
        try {
          name = JSON.parse(body.toString("utf8")).name;
        } catch {
          return sendError(response, "bad-request", "The rename body is not JSON");
        }
        if (typeof name !== "string") {
          return sendError(response, "bad-request", 'The rename body has no string "name"');
        }
        const { row } = await writableRow(context, id);
        const renamed = renameSkillDirectory(context.home, row.dir, name);
        context.logger?.info?.(`[dsh-skills] renamed ${row.dir} -> ${renamed.dir}`);
        return sendJson(response, 200, { ok: true, id: `user:home:${renamed.dir}`, ...renamed });
      }
      if (action === "download.md" && method === "GET") {
        const rows = await loadRows(context);
        const row = resolveRow(rows, id);
        if (row.fileName === null) {
          return sendError(response, "not-found", `Skill "${row.dir}" has no file to download`);
        }
        const file = readSkillFile(directoryBase(context, id), relativeOf(id), pathOptions(id));
        return sendFile(response, Buffer.from(file.content, "utf8"), file.fileName, "text/markdown; charset=utf-8");
      }
      if (action === "download.zip" && method === "GET") {
        const archive = zipSkill(directoryBase(context, id), relativeOf(id), pathOptions(id));
        const name = relativeOf(id).split("/").pop() ?? "skill";
        return sendFile(response, archive, `${name}.zip`, "application/zip");
      }
      return sendError(response, "bad-request", `Unsupported request ${method} ${request.url ?? ""}`);
    } catch (error) {
      const { code, message } = coded(error);
      return sendError(response, code, message);
    }
  }
  return sendError(response, "bad-request", `Unknown API path ${request.url ?? "/"}`);
}
function directoryBase(context, id) {
  const [origin, key] = id.split(":");
  if (origin !== "user" && origin !== "plugin") {
    throw new PathRefused(`Skill "${id}" has no directory`, "not-found");
  }
  const root = discoverRoots(context.home, context.installDir).find((candidate) => candidate.key === key);
  if (root === void 0) throw new PathRefused(`Unknown skill root "${key}"`, "not-found");
  return root.absolute;
}
function pathOptions(id) {
  return { allowExternalLinks: id.startsWith("plugin:") };
}
function relativeOf(id) {
  const parts = id.split(":");
  return parts.slice(2).join(":");
}
async function replaceDescriptor(context, id, uploadName, body) {
  if (id === null || id === "") {
    throw new PathRefused("A replacement upload needs the id of the skill it replaces", "bad-request");
  }
  const { row } = await writableRow(context, id);
  const fileName = row.fileName === "_SKILL.md" ? "_SKILL.md" : ACTIVE_FILE;
  return classifyReplaceUpload(row.dir, fileName, uploadName, body);
}
function createRoutes(context) {
  return [
    {
      kind: "prefix",
      path: API_PREFIX,
      handler: (request, response) => handle(context, request, response)
    }
  ];
}
export {
  API_PREFIX,
  DEFAULT_MAX_UPLOAD_BYTES,
  FILENAME_HEADER,
  MAX_SAVE_BYTES,
  ROUTE_PREFIX,
  createRoutes
};

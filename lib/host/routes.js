import { PathRefused } from "./paths.js";
import { readSkillFile, saveSkillFile, scanSkills, zipSkill } from "./scan.js";
import { applyUpload, classifyUpload, UploadRejected } from "./upload.js";
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
      return 409;
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
function segmentsOf(pathname) {
  const rest = pathname.slice(API_PREFIX.length).replace(/^\/+/, "").replace(/\/+$/, "");
  if (rest === "") return [];
  try {
    return rest.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}
async function handle(context, request, response) {
  const method = request.method ?? "GET";
  const segments = segmentsOf((request.url ?? "/").split("?")[0]);
  if (segments.length === 1 && segments[0] === "skills") {
    if (method !== "GET") return sendError(response, "bad-request", "Use GET for the skill list");
    const skills = scanSkills(context.root);
    return sendJson(response, 200, { root: context.root, skills });
  }
  if (segments.length === 1 && segments[0] === "upload") {
    if (method !== "POST") return sendError(response, "bad-request", "Use POST to upload a skill");
    const body = await readBody(request, context.maxUploadBytes);
    if (body === null) {
      return sendError(
        response,
        "too-large",
        `The upload exceeds the ${context.maxUploadBytes} byte limit`
      );
    }
    try {
      const descriptor = classifyUpload(context.root, fileNameOf(request), body);
      const result = applyUpload(context.root, descriptor);
      context.logger?.info?.(`[dsh-skills] upload ${result.action} ${result.dir}/${result.fileName}`);
      return sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      const { code, message } = coded(error);
      context.logger?.warn?.(`[dsh-skills] upload refused (${code}): ${message}`);
      return sendError(response, code, message);
    }
  }
  if (segments[0] === "skill" && segments.length >= 2) {
    const dir = segments[1];
    const action = segments.slice(2).join("/");
    try {
      if (action === "" && method === "GET") {
        return sendJson(response, 200, readSkillFile(context.root, dir));
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
        const written = saveSkillFile(context.root, dir, content);
        return sendJson(response, 200, { ok: true, dir, ...written });
      }
      if (action === "download.md" && method === "GET") {
        const file = readSkillFile(context.root, dir);
        return sendFile(response, Buffer.from(file.content, "utf8"), file.fileName, "text/markdown; charset=utf-8");
      }
      if (action === "download.zip" && method === "GET") {
        const archive = zipSkill(context.root, dir);
        return sendFile(response, archive, `${dir}.zip`, "application/zip");
      }
      return sendError(response, "bad-request", `Unsupported request ${method} ${request.url ?? ""}`);
    } catch (error) {
      const { code, message } = coded(error);
      return sendError(response, code, message);
    }
  }
  return sendError(response, "bad-request", `Unknown API path ${request.url ?? "/"}`);
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

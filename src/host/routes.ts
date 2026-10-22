/**
 * HTTP surface of the Skills page.
 *
 * Every route lives under one prefix and speaks JSON with a stable error code,
 * because the browser half owns the wording: it localizes by code and only uses
 * the message as a diagnostic. Transfers are plain request and response bodies,
 * not multipart: the browser reads the picked file itself and posts the bytes,
 * which keeps this side free of a parser and keeps the format decision on the
 * bytes rather than on a form field.
 *
 * A skill is addressed by an opaque id of the form
 * `<origin>:<rootKey>:<relative path>`. The id is resolved against the roots
 * again on every call, so a path can never be smuggled in: an id that names a
 * packaged skill stays inside that package, and every write to it is refused
 * here rather than trusted to the browser hiding a button.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import { collectSkills, discoverRoots, type ProvidedSkill, type SkillRow } from './catalog.js';
import { PathRefused } from './paths.js';
import { ACTIVE_FILE, readSkillFile, renameSkillDirectory, saveSkillFile, setSkillEnabled, zipSkill } from './scan.js';
import { applyUpload, classifyCreateUpload, classifyReplaceUpload, UploadRejected } from './upload.js';

/** Route prefix of the whole plugin. */
export const ROUTE_PREFIX = '/dsh-skills';

/** Path segment carrying the API. */
export const API_PREFIX = `${ROUTE_PREFIX}/api`;

/** Request header carrying the browser's file name, percent-encoded so it stays ASCII. */
export const FILENAME_HEADER = 'x-dsh-skills-filename';

/** Largest accepted upload, before the plugin's own configuration narrows it. */
export const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Largest accepted editor save. */
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;

/** Anything with a wire code the client can localize. */
interface CodedError {
  code: string;
  message: string;
}

/**
 * Narrow an unknown thrown value to a coded rejection.
 * @param error - thrown value.
 * @returns the code and message to answer with.
 */
function coded(error: unknown): CodedError {
  if (error instanceof UploadRejected) return { code: error.code, message: error.message };
  if (error instanceof PathRefused) return { code: error.code, message: error.message };
  const message = error instanceof Error ? error.message : String(error);
  return { code: 'write-failed', message };
}

/**
 * Status code for one wire code.
 * @param code - wire code.
 * @returns the HTTP status.
 */
function statusFor(code: string): number {
  switch (code) {
    case 'not-found':
      return 404;
    case 'name-mismatch':
    case 'conflict':
    case 'already-exists':
      return 409;
    case 'read-only':
      return 403;
    case 'too-large':
      return 413;
    case 'unrecognized-format':
      return 415;
    case 'bad-request':
      return 400;
    default:
      return 500;
  }
}

/**
 * Send a JSON response.
 * @param response - response to own.
 * @param status - HTTP status.
 * @param body - serializable payload.
 */
function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(payload.length),
    'cache-control': 'no-store',
  });
  response.end(payload);
}

/**
 * Send a coded error.
 * @param response - response to own.
 * @param code - wire code.
 * @param message - English diagnostic.
 */
function sendError(response: ServerResponse, code: string, message: string): void {
  sendJson(response, statusFor(code), { code, error: message });
}

/**
 * Send a binary attachment.
 * @param response - response to own.
 * @param body - bytes.
 * @param filename - download name.
 * @param contentType - media type.
 */
function sendFile(response: ServerResponse, body: Buffer, filename: string, contentType: string): void {
  response.writeHead(200, {
    'content-type': contentType,
    'content-length': String(body.length),
    'content-disposition': `attachment; filename="${filename.replace(/[^\x20-\x7e]|"/g, '_')}"`,
    'cache-control': 'no-store',
  });
  response.end(body);
}

/**
 * Read a whole request body under a size cap.
 * @param request - the incoming request.
 * @param limit - maximum accepted bytes.
 * @returns the body, or null when the cap was exceeded.
 */
async function readBody(request: IncomingMessage, limit: number): Promise<Buffer | null> {
  const declared = Number(request.headers['content-length'] ?? Number.NaN);
  if (Number.isFinite(declared) && declared > limit) {
    request.resume();
    return null;
  }
  const chunks: Buffer[] = [];
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

/**
 * Decode the browser-reported file name.
 * @param request - the incoming request.
 * @returns the decoded name, or an empty string when the header is absent.
 */
function fileNameOf(request: IncomingMessage): string {
  const raw = request.headers[FILENAME_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value === '') return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/**
 * Parse a request URL against a placeholder origin.
 * @param request - the incoming request.
 * @returns the parsed URL.
 */
function urlOf(request: IncomingMessage): URL {
  try {
    return new URL(request.url ?? '/', 'http://localhost');
  } catch {
    return new URL('http://localhost/');
  }
}

/**
 * Split the request path into decoded segments under the API prefix.
 * @param pathname - request path.
 * @returns the segments after `/dsh-skills/api/`.
 */
function segmentsOf(pathname: string): string[] {
  const rest = pathname.slice(API_PREFIX.length).replace(/^\/+/, '').replace(/\/+$/, '');
  if (rest === '') return [];
  try {
    return rest.split('/').map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

/** Everything a route handler needs from the plugin. */
export interface RouteContext {
  /** Absolute harness home. */
  readonly home: string;
  /** Absolute harness installation, when known. */
  readonly installDir?: string | undefined;
  /** Directory holding our own skills, relative to the home. */
  readonly skillsDir: string;
  /** Maximum accepted upload size in bytes. */
  readonly maxUploadBytes: number;
  /** Provider-supplied skills; failures are swallowed into an empty list. */
  readonly provided?: (() => Promise<ProvidedSkill[]>) | undefined;
  /** Optional logger for refusals worth keeping. */
  readonly logger?: { warn?: (message: string) => void; info?: (message: string) => void };
}

/** What one id resolved to. */
interface ResolvedSkill {
  /** The row the id names, as the catalog currently reports it. */
  readonly row: SkillRow;
  /** Absolute skill directory. */
  readonly absolute: string;
}

/**
 * Resolve an id against the live catalog.
 * @param context - route state.
 * @param rows - the current catalog.
 * @param id - opaque row id from the wire.
 * @returns the row and its absolute directory.
 * @throws {PathRefused} with `not-found` when no such row exists.
 */
function resolveRow(rows: readonly SkillRow[], id: string): SkillRow {
  const row = rows.find((candidate) => candidate.id === id);
  if (row === undefined) throw new PathRefused(`No skill is identified by "${id}"`, 'not-found');
  return row;
}

/**
 * Read the catalog, including provider-supplied skills.
 * @param context - route state.
 * @returns the rows.
 */
async function loadRows(context: RouteContext): Promise<SkillRow[]> {
  let provided: ProvidedSkill[] = [];
  if (typeof context.provided === 'function') {
    try {
      provided = await context.provided();
    } catch (error) {
      context.logger?.warn?.(`[dsh-skills] the skill provider failed: ${(error as Error).message}`);
    }
  }
  return collectSkills({ home: context.home, installDir: context.installDir, provided });
}

/**
 * Refuse a write to a row that is not ours.
 * @param row - the resolved row.
 * @throws {PathRefused} with `read-only`.
 */
function assertWritable(row: SkillRow): void {
  if (row.readOnly || row.origin !== 'user') {
    throw new PathRefused(`Skill "${row.dir}" is bundled with a plugin and is read-only here`, 'read-only');
  }
}

/**
 * Resolve one id for a write, proving the row is ours and the path is inside the
 * home.
 * @param context - route state.
 * @param id - the row id.
 * @returns the row and the absolute directory.
 */
async function writableRow(context: RouteContext, id: string): Promise<ResolvedSkill> {
  const rows = await loadRows(context);
  const row = resolveRow(rows, id);
  assertWritable(row);
  return { row, absolute: directoryBase(context, id) };
}

/**
 * Handle one API request.
 * @param context - the plugin's route state.
 * @param request - the incoming request.
 * @param response - response to own.
 */
async function handle(context: RouteContext, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? 'GET';
  const segments = segmentsOf((request.url ?? '/').split('?')[0]);

  if (segments.length === 1 && segments[0] === 'skills') {
    if (method !== 'GET') return sendError(response, 'bad-request', 'Use GET for the skill list');
    try {
      const rows = await loadRows(context);
      const roots = discoverRoots(context.home, context.installDir).map((root) => ({
        key: root.key,
        kind: root.kind,
        absolute: root.absolute,
      }));
      return sendJson(response, 200, { home: context.home, skillsDir: context.skillsDir, roots, skills: rows });
    } catch (error) {
      const { code, message } = coded(error);
      return sendError(response, code, message);
    }
  }

  if (segments.length === 1 && segments[0] === 'upload') {
    if (method !== 'POST') return sendError(response, 'bad-request', 'Use POST to upload a skill');
    const body = await readBody(request, context.maxUploadBytes);
    if (body === null) {
      return sendError(response, 'too-large', `The upload exceeds the ${context.maxUploadBytes} byte limit`);
    }
    const url = urlOf(request);
    const mode = url.searchParams.get('mode') === 'replace' ? 'replace' : 'create';
    try {
      const descriptor =
        mode === 'create'
          ? classifyCreateUpload(context.home, context.skillsDir, body)
          : await replaceDescriptor(context, url.searchParams.get('id'), fileNameOf(request), body);
      const result = applyUpload(context.home, descriptor);
      context.logger?.info?.(`[dsh-skills] upload ${result.action} ${result.dir}/${result.fileName}`);
      return sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      const { code, message } = coded(error);
      context.logger?.warn?.(`[dsh-skills] upload refused (${code}): ${message}`);
      return sendError(response, code, message);
    }
  }

  if (segments[0] === 'skill' && segments.length >= 2) {
    const id = segments[1];
    const action = segments.slice(2).join('/');
    try {
      if (action === '' && method === 'GET') {
        const rows = await loadRows(context);
        const row = resolveRow(rows, id);
        if (row.fileName === null) {
          return sendError(response, 'not-found', `Skill "${row.dir}" has no file to read`);
        }
        const file = readSkillFile(directoryBase(context, id), relativeOf(id), pathOptions(id));
        return sendJson(response, 200, file);
      }
      if (action === '' && method === 'PUT') {
        const body = await readBody(request, MAX_SAVE_BYTES);
        if (body === null) {
          return sendError(response, 'too-large', `The file exceeds the ${MAX_SAVE_BYTES} byte limit`);
        }
        let content: unknown;
        try {
          content = (JSON.parse(body.toString('utf8')) as { content?: unknown }).content;
        } catch {
          return sendError(response, 'bad-request', 'The save body is not JSON');
        }
        if (typeof content !== 'string') {
          return sendError(response, 'bad-request', 'The save body has no string "content"');
        }
        await writableRow(context, id);
        const written = saveSkillFile(directoryBase(context, id), relativeOf(id), content);
        return sendJson(response, 200, { ok: true, id, ...written });
      }
      if ((action === 'enable' || action === 'disable') && method === 'POST') {
        await writableRow(context, id);
        const renamed = setSkillEnabled(directoryBase(context, id), relativeOf(id), action === 'enable');
        context.logger?.info?.(`[dsh-skills] ${action} ${id} -> ${renamed.fileName}`);
        return sendJson(response, 200, { ok: true, id, ...renamed });
      }
      if (action === 'rename' && method === 'POST') {
        const body = await readBody(request, 4096);
        if (body === null) return sendError(response, 'too-large', 'The rename body is too large');
        let name: unknown;
        try {
          name = (JSON.parse(body.toString('utf8')) as { name?: unknown }).name;
        } catch {
          return sendError(response, 'bad-request', 'The rename body is not JSON');
        }
        if (typeof name !== 'string') {
          return sendError(response, 'bad-request', 'The rename body has no string "name"');
        }
        const { row } = await writableRow(context, id);
        const renamed = renameSkillDirectory(context.home, row.dir, name);
        context.logger?.info?.(`[dsh-skills] renamed ${row.dir} -> ${renamed.dir}`);
        return sendJson(response, 200, { ok: true, id: `user:home:${renamed.dir}`, ...renamed });
      }
      if (action === 'download.md' && method === 'GET') {
        const rows = await loadRows(context);
        const row = resolveRow(rows, id);
        if (row.fileName === null) {
          return sendError(response, 'not-found', `Skill "${row.dir}" has no file to download`);
        }
        const file = readSkillFile(directoryBase(context, id), relativeOf(id), pathOptions(id));
        return sendFile(response, Buffer.from(file.content, 'utf8'), file.fileName, 'text/markdown; charset=utf-8');
      }
      if (action === 'download.zip' && method === 'GET') {
        const archive = zipSkill(directoryBase(context, id), relativeOf(id), pathOptions(id));
        const name = relativeOf(id).split('/').pop() ?? 'skill';
        return sendFile(response, archive, `${name}.zip`, 'application/zip');
      }
      return sendError(response, 'bad-request', `Unsupported request ${method} ${request.url ?? ''}`);
    } catch (error) {
      const { code, message } = coded(error);
      return sendError(response, code, message);
    }
  }

  return sendError(response, 'bad-request', `Unknown API path ${request.url ?? '/'}`);
}

/**
 * Base directory an id is resolved against.
 * @param context - route state.
 * @param id - the row id.
 * @returns the absolute root the id's relative path belongs to.
 */
function directoryBase(context: RouteContext, id: string): string {
  const [origin, key] = id.split(':');
  if (origin !== 'user' && origin !== 'plugin') {
    throw new PathRefused(`Skill "${id}" has no directory`, 'not-found');
  }
  const root = discoverRoots(context.home, context.installDir).find((candidate) => candidate.key === key);
  if (root === undefined) throw new PathRefused(`Unknown skill root "${key}"`, 'not-found');
  return root.absolute;
}

/**
 * Path rules for one id: a packaged skill may live behind a package-manager
 * symlink, and nothing in a packaged root is ever written.
 * @param id - the row id.
 * @returns the path options for reads.
 */
function pathOptions(id: string): { allowExternalLinks: boolean } {
  return { allowExternalLinks: id.startsWith('plugin:') };
}

/**
 * The relative path inside an id.
 * @param id - the row id.
 * @returns the relative path.
 */
function relativeOf(id: string): string {
  const parts = id.split(':');
  return parts.slice(2).join(':');
}

/**
 * Classify a row-scoped replacement upload.
 *
 * The row is the target: it decides the directory, and a single `SKILL.md` is
 * accepted because the name no longer has to be guessed from the file.
 * @param context - route state.
 * @param id - the row id from the query string.
 * @param uploadName - the browser-reported file name.
 * @param body - uploaded bytes.
 * @returns the descriptor.
 * @throws {PathRefused} with `bad-request` for a missing id, or `read-only`.
 */
async function replaceDescriptor(
  context: RouteContext,
  id: string | null,
  uploadName: string,
  body: Buffer,
): Promise<ReturnType<typeof classifyReplaceUpload>> {
  if (id === null || id === '') {
    throw new PathRefused('A replacement upload needs the id of the skill it replaces', 'bad-request');
  }
  const { row } = await writableRow(context, id);
  const fileName = row.fileName === '_SKILL.md' ? '_SKILL.md' : ACTIVE_FILE;
  return classifyReplaceUpload(row.dir, fileName, uploadName, body);
}

/**
 * Build the plugin's routes.
 * @param context - the plugin's route state.
 * @returns one prefix route owning every API call.
 */
export function createRoutes(context: RouteContext): WebRoute[] {
  return [
    {
      kind: 'prefix',
      path: API_PREFIX,
      handler: (request, response) => handle(context, request, response),
    },
  ];
}

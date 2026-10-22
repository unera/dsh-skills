/**
 * HTTP surface of the Skills page.
 *
 * Every route lives under one prefix and speaks JSON with a stable error code,
 * because the browser half owns the wording: it localizes by code and only uses
 * the message as a diagnostic. Transfers are plain request and response bodies,
 * not multipart: the browser reads the picked file itself and posts the bytes,
 * which keeps this side free of a parser and keeps the format decision on the
 * bytes rather than on a form field.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import { PathRefused } from './paths.js';
import { readSkillFile, saveSkillFile, scanSkills, zipSkill } from './scan.js';
import { applyUpload, classifyUpload, UploadRejected } from './upload.js';

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
      return 409;
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
 * @returns the body, or null when the cap was exceeded (the response is not written here).
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
 * @returns the decoded name, or an empty string when the header is absent or malformed.
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
 * Split the request path into the action segments under the API prefix.
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
  /** Absolute skills root, resolved once at mount time. */
  readonly root: string;
  /** Maximum accepted upload size in bytes. */
  readonly maxUploadBytes: number;
  /** Optional logger for refusals worth keeping. */
  readonly logger?: { warn?: (message: string) => void; info?: (message: string) => void };
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
    const skills = scanSkills(context.root);
    return sendJson(response, 200, { root: context.root, skills });
  }

  if (segments.length === 1 && segments[0] === 'upload') {
    if (method !== 'POST') return sendError(response, 'bad-request', 'Use POST to upload a skill');
    const body = await readBody(request, context.maxUploadBytes);
    if (body === null) {
      return sendError(
        response,
        'too-large',
        `The upload exceeds the ${context.maxUploadBytes} byte limit`,
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

  if (segments[0] === 'skill' && segments.length >= 2) {
    const dir = segments[1];
    const action = segments.slice(2).join('/');
    try {
      if (action === '' && method === 'GET') {
        return sendJson(response, 200, readSkillFile(context.root, dir));
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
        const written = saveSkillFile(context.root, dir, content);
        return sendJson(response, 200, { ok: true, dir, ...written });
      }
      if (action === 'download.md' && method === 'GET') {
        const file = readSkillFile(context.root, dir);
        return sendFile(response, Buffer.from(file.content, 'utf8'), file.fileName, 'text/markdown; charset=utf-8');
      }
      if (action === 'download.zip' && method === 'GET') {
        const archive = zipSkill(context.root, dir);
        return sendFile(response, archive, `${dir}.zip`, 'application/zip');
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

/**
 * Wire client for the host half.
 *
 * The host answers JSON with `{ code, error }` on failure; `code` is what the
 * page localizes and `error` is a diagnostic it shows only when nothing better
 * exists. Downloads are plain navigations (the host sets a disposition), so the
 * served bytes are the file bytes with no round trip through JavaScript.
 */

/** API prefix the host mounts. */
export const API_PREFIX = '/dsh-skills/api';

/** A host refusal, carrying the wire code. */
export class ApiError extends Error {
  /**
   * @param code - wire code such as `unrecognized-format`.
   * @param message - English diagnostic from the host, or a transport note.
   */
  constructor(code, message) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Read a JSON response, turning a coded refusal into an {@link ApiError}.
 * @param response - fetch response.
 * @returns the decoded payload.
 */
async function decode(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const code = typeof payload?.code === 'string' ? payload.code : 'write-failed';
    const message = typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}`;
    throw new ApiError(code, message);
  }
  if (payload === null) throw new ApiError('write-failed', 'The host answered with no JSON body');
  return payload;
}

/**
 * Perform one API call.
 * @param path - path under the API prefix.
 * @param init - fetch options.
 * @returns the decoded payload.
 */
async function call(path, init) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, init);
  } catch (error) {
    throw new ApiError('network', error instanceof Error ? error.message : String(error));
  }
  return decode(response);
}

/** One row of the skills table, as the host describes it. */
export const api = {
  /**
   * List every skill directory, active and disabled.
   * @returns the root and the rows.
   */
  list() {
    return call('/skills', { headers: { accept: 'application/json' } });
  },

  /**
   * Read one skill file.
   * @param dir - skill directory name.
   * @returns the file name, contents, and modification time.
   */
  read(dir) {
    return call(`/skill/${encodeURIComponent(dir)}`, { headers: { accept: 'application/json' } });
  },

  /**
   * Save one skill file.
   * @param dir - skill directory name.
   * @param content - new contents.
   * @returns the written file name and modification time.
   */
  save(dir, content) {
    return call(`/skill/${encodeURIComponent(dir)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Upload one file; the host decides the format from the bytes.
   * @param file - the picked File or Blob.
   * @param name - the file's name, used only for a single-file upload.
   * @returns the applied action and directory.
   */
  upload(file, name) {
    return call('/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', [FILENAME_HEADER]: encodeURIComponent(name) },
      body: file,
    });
  },

  /**
   * Trigger a browser download of one URL.
   * @param path - path under the API prefix.
   * @param filename - suggested file name.
   */
  download(path, filename) {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('a');
    anchor.href = `${API_PREFIX}${path}`;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  },
};

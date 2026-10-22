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
   * @param id - opaque row id from the list.
   * @returns the file name, contents, modification time, and status.
   */
  read(id) {
    return call(`/skill/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
  },

  /**
   * Save one skill file.
   * @param id - opaque row id from the list.
   * @param content - new contents.
   * @returns the written file name and modification time.
   */
  save(id, content) {
    return call(`/skill/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Enable or disable a skill by renaming its file on the host.
   * @param id - opaque row id from the list.
   * @param enable - true for `SKILL.md`, false for `_SKILL.md`.
   * @returns the file name and status after the rename.
   */
  setEnabled(id, enable) {
    return call(`/skill/${encodeURIComponent(id)}/${enable ? 'enable' : 'disable'}`, {
      method: 'POST',
      headers: { accept: 'application/json' },
    });
  },

  /**
   * Rename one skill's directory.
   * @param id - opaque row id from the list.
   * @param name - the new directory name, one kebab-case segment.
   * @returns the new row id, path, and status.
   */
  rename(id, name) {
    return call(`/skill/${encodeURIComponent(id)}/rename`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  /**
   * Upload one file; the host decides the format from the bytes.
   * @param file - the picked File or Blob.
   * @param name - the file's name, used only for a single-file upload.
   * @param mode - `create` for the page button (a new skill from a zip, never an
   *   overwrite), `replace` for a row's menu item (that row's skill, never a
   *   creation).
   * @param id - the row id a replacement targets; ignored for a create.
   * @returns the applied action and directory.
   */
  upload(file, name, mode = 'create', id = '') {
    const query = mode === 'replace' ? `replace&id=${encodeURIComponent(id)}` : 'create';
    return call(`/upload?mode=${query}`, {
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

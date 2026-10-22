/**
 * The Skills page: the list, the per-row actions, and the switch into the
 * editor.
 *
 * All filesystem work goes through the injected `client` (the wire module by
 * default), which is what lets the tests drive the page with a stub and assert
 * exactly which calls a click produced.
 */
import * as React from 'react';
import { api, ApiError } from './api.js';
import { SkillEditor } from './editor.js';
import { displayName, truncateMiddle } from './format.js';
import { errorText } from './locales.js';
import { ActionsMenu } from './menu.js';

const h = React.createElement;

/** Path shown in the editor title. */
function pathOf(skill) {
  return `${skill.dir}/${skill.fileName}`;
}

/**
 * One table row.
 * @param props - the skill, the translator, and the action callbacks.
 * @returns the row.
 */
function SkillRow({ t, skill, onEdit, onDownloadMd, onDownloadZip, onUpload }) {
  const name = displayName(skill);
  return h(
    'tr',
    { 'data-skill': skill.dir },
    h(
      'td',
      null,
      h(
        'span',
        { className: 'dshsk-statusChip', 'data-status': skill.status },
        h('span', { className: 'dshsk-statusDot', 'aria-hidden': 'true' }),
        skill.status === 'active' ? t('statusActive') : t('statusDisabled'),
      ),
    ),
    h(
      'td',
      null,
      h('div', { className: 'dshsk-name' }, name),
      skill.description ? h('div', { className: 'dshsk-nameMeta' }, skill.description) : null,
    ),
    h(
      'td',
      null,
      h('code', { className: 'dshsk-path', title: skill.path }, truncateMiddle(skill.path, 44)),
    ),
    h(
      'td',
      null,
      h(ActionsMenu, {
        label: t('actionsFor', { name }),
        moreLabel: t('moreActions'),
        items: [
          { id: 'download-md', label: t('downloadMd'), onSelect: () => onDownloadMd(skill) },
          { id: 'download-zip', label: t('downloadZip'), onSelect: () => onDownloadZip(skill) },
          { id: 'upload', label: t('upload'), onSelect: () => onUpload(skill) },
          { id: 'edit', label: t('edit'), onSelect: () => onEdit(skill) },
        ],
      }),
    ),
  );
}

/**
 * @param props - `t` from the shell's locale seat and an optional stub client.
 * @returns the page.
 */
export function SkillsPage({ t, client = api }) {
  const [list, setList] = React.useState({ phase: 'loading', skills: [], root: '', error: null });
  const [notice, setNotice] = React.useState(null);
  const [editor, setEditor] = React.useState(null);
  const input = React.useRef(null);
  const pendingUpload = React.useRef(null);

  const load = React.useCallback(async () => {
    try {
      const data = await client.list();
      setList({ phase: 'ready', skills: Array.isArray(data.skills) ? data.skills : [], root: data.root ?? '', error: null });
    } catch (error) {
      setList({ phase: 'error', skills: [], root: '', error });
    }
  }, [client]);

  React.useEffect(() => {
    load();
  }, [load]);

  const upload = React.useCallback(
    async (file) => {
      setNotice(null);
      try {
        const result = await client.upload(file, file.name ?? '');
        setNotice({
          tone: 'ok',
          text: t(result.action === 'created' ? 'uploadCreated' : 'uploadReplaced', { dir: result.dir }),
        });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'write-failed';
        setNotice({ tone: 'error', text: `${t('uploadFailed')} ${errorText(t, code)}` });
      }
    },
    [client, load, t],
  );

  const pickFile = React.useCallback(
    (skill) => {
      pendingUpload.current = skill?.dir ?? null;
      if (input.current !== null && typeof input.current.click === 'function') input.current.click();
    },
    [],
  );

  const openEditor = React.useCallback(
    async (skill) => {
      setNotice(null);
      setEditor({ phase: 'loading', path: pathOf(skill) });
      try {
        const file = await client.read(skill.dir);
        setEditor({
          phase: 'ready',
          dir: skill.dir,
          path: `${skill.dir}/${file.fileName}`,
          fileName: file.fileName,
          content: file.content,
          mtimeMs: file.mtimeMs,
          warning: false,
          saving: false,
          error: null,
        });
      } catch (error) {
        setEditor(null);
        const code = error instanceof ApiError ? error.code : 'not-found';
        setNotice({ tone: 'error', text: `${t('editorOpenFailed', { dir: skill.dir })} ${errorText(t, code)}` });
      }
    },
    [client, t],
  );

  const save = React.useCallback(
    async (content) => {
      const current = editor;
      if (current === null || current.phase !== 'ready') return;
      setEditor({ ...current, saving: true, error: null });
      try {
        if (current.warning !== true) {
          const fresh = await client.read(current.dir);
          if (fresh.mtimeMs !== current.mtimeMs) {
            // Someone wrote the file after it was opened: warn, keep the draft,
            // and let the second Save overwrite it.
            setEditor({ ...current, warning: true, saving: false, error: null });
            return;
          }
        }
        await client.save(current.dir, content);
        setEditor(null);
        setNotice({ tone: 'ok', text: t('saveDone', { path: current.path }) });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'write-failed';
        setEditor({
          ...current,
          saving: false,
          error: `${t('saveFailed', { dir: current.dir })} ${errorText(t, code)}`,
        });
      }
    },
    [client, editor, load, t],
  );

  const downloadMd = React.useCallback(
    (skill) => client.download(`/skill/${encodeURIComponent(skill.dir)}/download.md`, skill.fileName),
    [client],
  );
  const downloadZip = React.useCallback(
    (skill) => client.download(`/skill/${encodeURIComponent(skill.dir)}/download.zip`, `${skill.dir}.zip`),
    [client],
  );

  const fileInput = h('input', {
    ref: input,
    type: 'file',
    hidden: true,
    'aria-label': t('uploadTitle'),
    onChange: (event) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = '';
      if (file !== null) upload(file);
    },
  });

  const noticeView =
    notice === null
      ? null
      : h('div', { className: 'dshsk-notice', 'data-tone': notice.tone === 'ok' ? 'ok' : 'error', role: 'status' }, notice.text);

  if (editor !== null) {
    if (editor.phase !== 'ready') {
      return h(
        'div',
        { className: 'dshsk-page' },
        h('div', { className: 'dshsk-inner' }, h('div', { className: 'dshsk-loading' }, t('editorLoading'))),
      );
    }
    return h(
      'div',
      { className: 'dshsk-page' },
      h(
        'div',
        { className: 'dshsk-inner' },
        noticeView,
        h(SkillEditor, {
          t,
          path: editor.path,
          initialContent: editor.content,
          warning: editor.warning,
          error: editor.error,
          saving: editor.saving,
          onCancel: () => setEditor(null),
          onSave: save,
        }),
      ),
    );
  }

  const count = list.skills.length;
  const subtitle =
    list.phase === 'ready' && list.root !== ''
      ? `${t('subtitle', { root: list.root })} · ${count === 1 ? t('countOne') : t('count', { count })}`
      : null;

  return h(
    'div',
    { className: 'dshsk-page' },
    h(
      'div',
      { className: 'dshsk-inner' },
      h(
        'div',
        { className: 'dshsk-head' },
        h(
          'div',
          { className: 'dshsk-headText' },
          h('h1', { className: 'dshsk-title' }, t('heading')),
          subtitle === null ? null : h('p', { className: 'dshsk-subtitle' }, subtitle),
        ),
        h(
          'div',
          { className: 'dshsk-headActions' },
          fileInput,
          h(
            'button',
            { type: 'button', className: 'dshsk-button', 'data-variant': 'primary', onClick: () => pickFile(null) },
            t('upload'),
          ),
        ),
      ),
      noticeView,
      list.phase === 'loading' ? h('div', { className: 'dshsk-loading' }, t('editorLoading')) : null,
      list.phase === 'error'
        ? h(
            'div',
            { className: 'dshsk-empty' },
            h('p', { className: 'dshsk-emptyTitle' }, t('loadFailed')),
            h('p', { className: 'dshsk-emptyBody' }, errorText(t, list.error instanceof ApiError ? list.error.code : 'network')),
            h(
              'button',
              { type: 'button', className: 'dshsk-button', onClick: () => load() },
              t('retry'),
            ),
          )
        : null,
      list.phase === 'ready' && count === 0
        ? h(
            'div',
            { className: 'dshsk-empty' },
            h('p', { className: 'dshsk-emptyTitle' }, t('emptyTitle')),
            h('p', { className: 'dshsk-emptyBody' }, t('emptyBody', { root: list.root })),
          )
        : null,
      list.phase === 'ready' && count > 0
        ? h(
            'table',
            { className: 'dshsk-table' },
            h(
              'thead',
              null,
              h(
                'tr',
                null,
                h('th', { scope: 'col' }, t('columnStatus')),
                h('th', { scope: 'col' }, t('columnName')),
                h('th', { scope: 'col' }, t('columnPath')),
                h('th', { scope: 'col' }, t('columnActions')),
              ),
            ),
            h(
              'tbody',
              null,
              list.skills.map((skill) =>
                h(SkillRow, {
                  key: skill.dir,
                  t,
                  skill,
                  onEdit: openEditor,
                  onDownloadMd: downloadMd,
                  onDownloadZip: downloadZip,
                  onUpload: pickFile,
                }),
              ),
            ),
          )
        : null,
      h('p', { className: 'dshsk-note' }, t('statusNote')),
    ),
  );
}

export default SkillsPage;

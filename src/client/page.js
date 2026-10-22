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
import { useNarrowViewport } from './viewport.js';

const h = React.createElement;

/** Path shown in the editor title. */
function pathOf(skill) {
  return `${skill.dir}/${skill.fileName}`;
}

/**
 * One list row.
 *
 * Three or four fixed-width members and one flexible one: the dot, the name
 * block (which takes every pixel that is left), the path, and the actions
 * button. Everything except the name is `flex: 0 0 auto`, so a long path or a
 * wide menu can never squeeze the name out of the row; the name block is
 * `flex: 1 1 auto` with `min-width: 0`, which is what lets its ellipsis work
 * inside a flex container.
 *
 * In the compact layout the path cell is not rendered — the row would otherwise
 * have to fit four members into a phone's width — and the full path moves into
 * the row's accessible name.
 * @param props - the skill, the translator, `compact`, and the action callbacks.
 * @returns the row.
 */
export function SkillRow({ t, skill, compact = false, onEdit, onDownloadMd, onDownloadZip, onUpload }) {
  const name = displayName(skill);
  const statusLabel = skill.status === 'active' ? t('statusActive') : t('statusDisabled');
  return h(
    'div',
    {
      className: 'dshsk-row',
      role: 'row',
      'data-skill': skill.dir,
      'data-status': skill.status,
      'data-layout': compact ? 'compact' : 'wide',
      'aria-label': t('rowLabel', { name, status: statusLabel, path: skill.path }),
    },
    h(
      'div',
      { className: 'dshsk-statusCell', role: 'cell' },
      h('span', {
        className: 'dshsk-statusDot',
        'data-status': skill.status,
        role: 'img',
        title: statusLabel,
        'aria-label': statusLabel,
      }),
    ),
    h(
      'div',
      { className: 'dshsk-nameCell', role: 'cell' },
      h('div', { className: 'dshsk-name', title: name }, name),
      skill.description
        ? h('div', { className: 'dshsk-nameMeta', title: skill.description }, skill.description)
        : null,
    ),
    compact
      ? null
      : h(
          'div',
          { className: 'dshsk-pathCell', role: 'cell' },
          h(
            'code',
            { className: 'dshsk-path', title: skill.path, 'aria-label': skill.path },
            truncateMiddle(skill.path, 15),
          ),
        ),
    h(
      'div',
      { className: 'dshsk-rowActions', role: 'cell' },
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

/** Column labels, dropped for the path column in the compact layout. */
function ListHead({ t, compact }) {
  return h(
    'div',
    { className: 'dshsk-listHead', role: 'row' },
    h(
      'div',
      { className: 'dshsk-headCell dshsk-statusCell', role: 'columnheader' },
      h('span', { className: 'dshsk-srOnly' }, t('columnStatus')),
    ),
    h('div', { className: 'dshsk-headCell dshsk-nameCell', role: 'columnheader' }, t('columnName')),
    compact
      ? null
      : h('div', { className: 'dshsk-headCell dshsk-pathCell', role: 'columnheader' }, t('columnPath')),
    h('div', { className: 'dshsk-headCell dshsk-rowActions', role: 'columnheader' }, t('columnActions')),
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
  const compact = useNarrowViewport();
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
            'div',
            { className: 'dshsk-list', role: 'table', 'aria-label': t('listLabel') },
            h(ListHead, { t, compact }),
            list.skills.map((skill) =>
              h(SkillRow, {
                key: skill.dir,
                t,
                skill,
                compact,
                onEdit: openEditor,
                onDownloadMd: downloadMd,
                onDownloadZip: downloadZip,
                onUpload: pickFile,
              }),
            ),
          )
        : null,
      h('p', { className: 'dshsk-note' }, t('statusNote')),
    ),
  );
}

export default SkillsPage;

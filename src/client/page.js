/**
 * The Skills page: the list, the per-row actions, and the switch into the
 * editor.
 *
 * All filesystem work goes through the injected `client` (the wire module by
 * default), which is what lets the tests drive the page with a stub and assert
 * exactly which calls a click produced.
 *
 * Every action a row offers comes from the host's own `actions` list, so the page
 * never has to guess what is allowed: a packaged skill arrives with downloads
 * only, and a virtual one with nothing at all. The colours follow the same
 * distinction — our skills use the shell's success/idle tokens, packaged ones the
 * plugin's own pink accent — because "inside a dependency" is a different kind of
 * thing and should be recognizable before reading the badge.
 */
import * as React from 'react';
import { api, ApiError } from './api.js';
import { SkillEditor } from './editor.js';
import { SkillViewer } from './viewer.js';
import { displayName, truncatePath } from './format.js';
import { errorText } from './locales.js';
import { RowActions, SEPARATOR } from './menu.js';
import { useNarrowViewport } from './viewport.js';

const h = React.createElement;

/** Path shown in the editor title. */
function pathOf(row) {
  return row.path !== '' ? row.path : row.dir;
}

/**
 * Status word for one row.
 * @param t - translator.
 * @param row - the row.
 * @returns the localized status.
 */
function statusLabel(t, row) {
  if (row.status === 'conflict') return t('statusConflict');
  if (row.status === 'virtual') return t('statusVirtual');
  return row.status === 'active' ? t('statusActive') : t('statusDisabled');
}

/**
 * Tooltip of the status dot: the word plus whatever makes the row unusual.
 * @param t - translator.
 * @param row - the row.
 * @returns the tooltip text.
 */
function statusHint(t, row) {
  const label = statusLabel(t, row);
  if (row.status === 'conflict') return `${label} · ${t('statusConflictHint')}`;
  if (row.status === 'virtual') return `${label} · ${t('virtualHint')}`;
  if (row.readOnly) return `${label} · ${t('readOnlyHint')}`;
  return label;
}

/**
 * Secondary line of a row: the description, or why the row cannot be changed.
 * @param t - translator.
 * @param row - the row.
 * @returns the text, or null.
 */
function metaText(t, row) {
  if (row.status === 'virtual') return t('virtualHint');
  if (row.status === 'conflict') return t('statusConflictHint');
  if (typeof row.description === 'string' && row.description !== '') return row.description;
  if (row.readOnly) return row.fileName === null ? t('providerHint') : t('readOnlyHint');
  return null;
}

/** Statuses after a rename, as the row must show them. */
const RENAMED = {
  enable: { status: 'active', fileName: 'SKILL.md' },
  disable: { status: 'disabled', fileName: '_SKILL.md' },
};

/**
 * One list row.
 * @param props - the row, the translator, `compact`, and the callbacks.
 * @returns the row.
 */
export function SkillRow({
  t,
  row,
  compact = false,
  onView,
  onEdit,
  onRename,
  renaming = null,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDownloadMd,
  onDownloadZip,
  onUpload,
  onToggle,
}) {
  const name = displayName(row);
  const hint = statusHint(t, row);
  const meta = metaText(t, row);
  const actions = row.actions ?? [];
  const canView = actions.includes('view');
  const canEdit = actions.includes('edit');
  const canRename = actions.includes('rename');
  const canDownloadMd = actions.includes('downloadMd');
  const canDownloadZip = actions.includes('downloadZip');
  const canUpload = actions.includes('upload');
  const canDisable = actions.includes('disable');
  const canEnable = actions.includes('enable');

  const groups = [];
  // View and Edit are one group: both answer "let me read this", and View is
  // first so the safe action is the one under the thumb.
  const reader = [];
  if (canView) {
    reader.push({ id: 'view', label: t('view'), hint: t('viewTitle', { name }), onSelect: () => onView(row) });
  }
  if (canEdit) reader.push({ id: 'edit', label: t('edit'), onSelect: () => onEdit(row) });
  if (reader.length > 0) groups.push(reader);
  if (canRename) {
    groups.push([{ id: 'rename', label: t('rename'), hint: t('renameTitle'), onSelect: () => onRename(row) }]);
  }
  const downloads = [];
  if (canDownloadMd) {
    downloads.push({ id: 'download-md', label: t('downloadMd'), onSelect: () => onDownloadMd(row) });
  }
  if (canDownloadZip) {
    downloads.push({ id: 'download-zip', label: t('downloadZip'), onSelect: () => onDownloadZip(row) });
  }
  if (downloads.length > 0) groups.push(downloads);
  if (canUpload) groups.push([{ id: 'upload', label: t('upload'), onSelect: () => onUpload(row) }]);
  if (canDisable || canEnable) {
    groups.push([
      canDisable
        ? { id: 'disable', label: t('disable'), hint: t('disableHint'), onSelect: () => onToggle(row, false) }
        : { id: 'enable', label: t('enable'), hint: t('enableHint'), onSelect: () => onToggle(row, true) },
    ]);
  }

  const items = [];
  for (const group of groups) {
    if (items.length > 0) items.push(SEPARATOR);
    items.push(...group);
  }

  const originLabel = row.origin === 'user' ? t('originUser') : t('originPlugin');
  const originHint = row.origin === 'user' ? t('originUserHint') : t('originPluginHint');

  return h(
    'div',
    {
      className: 'dshsk-row',
      role: 'row',
      'data-id': row.id,
      'data-origin': row.origin,
      'data-status': row.status,
      'data-layout': compact ? 'compact' : 'wide',
      'aria-label': t('rowLabel', { name, status: statusLabel(t, row), path: pathOf(row) }),
    },
    h(
      'div',
      { className: 'dshsk-statusCell', role: 'cell' },
      h('span', {
        className: 'dshsk-statusDot',
        'data-origin': row.origin,
        'data-status': row.status,
        role: 'img',
        title: hint,
        'aria-label': hint,
      }),
    ),
    h(
      'div',
      { className: 'dshsk-nameCell', role: 'cell' },
      h(
        'div',
        { className: 'dshsk-nameLine' },
        h('span', { className: 'dshsk-origin', 'data-origin': row.origin, title: originHint }, originLabel),
        h(
          'span',
          { className: 'dshsk-name', 'data-origin': row.origin, 'data-status': row.status, title: name },
          name,
        ),
      ),
      meta === null ? null : h('div', { className: 'dshsk-nameMeta', title: meta }, meta),
    ),
    compact || row.path === ''
      ? null
      : h(
          'div',
          { className: 'dshsk-pathCell', role: 'cell' },
          h(
            'code',
            { className: 'dshsk-path', title: row.path, 'aria-label': row.path },
            truncatePath(row.path),
          ),
        ),
    items.length === 0
      ? h('div', { className: 'dshsk-rowActions', role: 'cell' })
      : h(
          'div',
          { className: 'dshsk-actionsCell', role: 'cell' },
          renaming !== null && renaming.id === row.id
            ? h(RenameDialog, {
                t,
                value: renaming.value,
                error: renaming.error,
                busy: renaming.busy,
                onChange: onRenameChange,
                onSubmit: onRenameSubmit,
                onCancel: onRenameCancel,
              })
            : null,
          h(RowActions, {
            label: t('actionsFor', { name }),
            moreLabel: t('moreActions'),
            editLabel: t('editTitle'),
            split: !compact && canEdit,
            onEdit: () => onEdit(row),
            items,
          }),
        ),
  );
}

/**
 * The inline rename form, anchored where the menu was.
 *
 * It edits the directory name only — the frontmatter `name` inside the file is
 * the skill's own text and is left alone — and it validates before asking the
 * host, so an illegal name never becomes a round trip.
 * @param props - the draft, any refusal, and the callbacks.
 * @returns the popover form.
 */
export function RenameDialog({ t, value, error, busy, onChange, onSubmit, onCancel }) {
  return h(
    'form',
    {
      className: 'dshsk-rename',
      onSubmit: (event) => {
        event.preventDefault();
        onSubmit();
      },
    },
    h('label', { className: 'dshsk-renameLabel', htmlFor: 'dshsk-rename-input' }, t('renameTitle')),
    h('input', {
      id: 'dshsk-rename-input',
      className: 'dshsk-renameInput',
      type: 'text',
      value,
      autoFocus: true,
      spellCheck: false,
      disabled: busy === true,
      onChange: (event) => onChange(event.target.value),
    }),
    h('p', { className: 'dshsk-renameHint' }, t('renameHint')),
    error === null || error === undefined
      ? null
      : h('p', { className: 'dshsk-renameError', role: 'alert' }, error),
    h(
      'div',
      { className: 'dshsk-renameActions' },
      h(
        'button',
        { type: 'button', className: 'dshsk-button', onClick: () => onCancel(), disabled: busy === true },
        t('editorCancel'),
      ),
      h('button', { type: 'submit', className: 'dshsk-button', 'data-variant': 'primary', disabled: busy === true }, t('rename')),
    ),
  );
}

/** A legal directory name, checked before the host is asked. */
const DIRECTORY_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    compact ? null : h('div', { className: 'dshsk-headCell dshsk-pathCell', role: 'columnheader' }, t('columnPath')),
    h('div', { className: 'dshsk-headCell dshsk-actionsCell', role: 'columnheader' }, t('columnActions')),
  );
}

/** The three sections, in the order the page shows them. */
export const SECTIONS = Object.freeze([
  {
    key: 'user',
    title: 'sectionUser',
    empty: 'sectionUserEmpty',
    includes: (row) => row.origin === 'user',
  },
  {
    key: 'plugin',
    title: 'sectionPlugin',
    empty: 'sectionPluginEmpty',
    includes: (row) => row.origin === 'plugin' && row.path !== '',
  },
  {
    key: 'virtual',
    title: 'sectionVirtual',
    empty: 'sectionVirtualEmpty',
    includes: (row) => row.origin === 'virtual' || (row.origin === 'plugin' && row.path === ''),
  },
]);

/**
 * One section: its own heading, count, table, and empty state.
 * @param props - the section's rows, its copy, and the row callbacks.
 * @returns the section.
 */
export function SkillsSection({ t, section, rows, compact, callbacks }) {
  const title = t(section.title);
  return h(
    'section',
    { className: 'dshsk-section', 'data-section': section.key },
    h(
      'h2',
      { className: 'dshsk-sectionTitle' },
      h('span', { className: 'dshsk-sectionName' }, title),
      h('span', { className: 'dshsk-sectionCount' }, String(rows.length)),
    ),
    rows.length === 0
      ? h('p', { className: 'dshsk-sectionEmpty' }, t(section.empty))
      : h(
          'div',
          { className: 'dshsk-list', role: 'table', 'aria-label': title },
          h(ListHead, { t, compact }),
          rows.map((row) => h(SkillRow, { key: row.id, t, row, compact, ...callbacks })),
        ),
  );
}

/**
 * @param props - `t` from the shell's locale seat and an optional stub client.
 * @returns the page.
 */
export function SkillsPage({ t, client = api }) {
  const [list, setList] = React.useState({ phase: 'loading', skills: [], home: '', error: null });
  const [notice, setNotice] = React.useState(null);
  const [editor, setEditor] = React.useState(null);
  const [renaming, setRenaming] = React.useState(null);
  const compact = useNarrowViewport();
  const input = React.useRef(null);

  const load = React.useCallback(async () => {
    try {
      const data = await client.list();
      setList({
        phase: 'ready',
        skills: Array.isArray(data.skills) ? data.skills : [],
        home: data.home ?? '',
        error: null,
      });
    } catch (error) {
      setList({ phase: 'error', skills: [], home: '', error });
    }
  }, [client]);

  React.useEffect(() => {
    load();
  }, [load]);

  const upload = React.useCallback(
    async (file, mode, id = '') => {
      setNotice(null);
      try {
        const result = await client.upload(file, file.name ?? '', mode, id);
        setNotice({
          tone: 'ok',
          text: t(result.action === 'created' ? 'uploadCreated' : 'uploadReplaced', {
            dir: result.dir.split('/').pop() ?? result.dir,
          }),
        });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'write-failed';
        setNotice({ tone: 'error', text: `${t('uploadFailed')} ${errorText(t, code)}` });
      }
    },
    [client, load, t],
  );

  const pendingMode = React.useRef({ mode: 'create', id: '' });

  /**
   * Open the file picker.
   * @param mode - `create` for the page button, `replace` for a row's menu item.
   * @param id - the row a replacement targets.
   */
  const pickFile = React.useCallback((mode = 'create', id = '') => {
    pendingMode.current = { mode, id };
    if (input.current !== null && typeof input.current.click === 'function') input.current.click();
  }, []);

  const loadContent = React.useCallback(
    async (row) => {
      setNotice(null);
      try {
        const file = await client.read(row.id);
        return { fileName: file.fileName ?? null, content: file.content ?? '', mtimeMs: file.mtimeMs ?? 0 };
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'not-found';
        setNotice({ tone: 'error', text: `${t('editorOpenFailed', { dir: row.dir })} ${errorText(t, code)}` });
        return null;
      }
    },
    [client, t],
  );

  const openViewer = React.useCallback(
    async (row) => {
      setEditor({ phase: 'loading', mode: 'view', path: pathOf(row), name: displayName(row), row });
      const loaded = await loadContent(row);
      if (loaded === null) {
        setEditor(null);
        return;
      }
      setEditor({
        phase: 'ready',
        mode: 'view',
        id: row.id,
        row,
        name: displayName(row),
        path: row.path === '' ? '' : `${row.dir}/${loaded.fileName ?? ''}`.replace(/\/$/, ''),
        content: loaded.content,
      });
    },
    [loadContent],
  );

  const openEditor = React.useCallback(
    async (row) => {
      setNotice(null);
      setEditor({ phase: 'loading', mode: 'edit', path: pathOf(row), name: displayName(row), row });
      try {
        const file = await client.read(row.id);
        setEditor({
          phase: 'ready',
          mode: 'edit',
          id: row.id,
          row,
          name: displayName(row),
          path: `${row.dir}/${file.fileName}`,
          content: file.content,
          mtimeMs: file.mtimeMs,
          warning: false,
          saving: false,
          error: null,
        });
      } catch (error) {
        setEditor(null);
        const code = error instanceof ApiError ? error.code : 'not-found';
        setNotice({ tone: 'error', text: `${t('editorOpenFailed', { dir: row.dir })} ${errorText(t, code)}` });
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
          const fresh = await client.read(current.id);
          if (fresh.mtimeMs !== current.mtimeMs) {
            // Someone wrote the file after it was opened: warn, keep the draft,
            // and let the second Save overwrite it.
            setEditor({ ...current, warning: true, saving: false, error: null });
            return;
          }
        }
        await client.save(current.id, content);
        setEditor(null);
        setNotice({ tone: 'ok', text: t('saveDone', { path: current.path }) });
        await load();
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'write-failed';
        setEditor({
          ...current,
          saving: false,
          error: `${t('saveFailed', { dir: current.id })} ${errorText(t, code)}`,
        });
      }
    },
    [client, editor, load, t],
  );

  const toggle = React.useCallback(
    async (row, enable) => {
      setNotice(null);
      try {
        const result = await client.setEnabled(row.id, enable);
        const next = RENAMED[enable ? 'enable' : 'disable'];
        // The row is updated from the answer, not re-fetched: the file name, the
        // path and the dot change in place, which is what "без перезагрузки"
        // means for a list of dozens of rows.
        setList((previous) => ({
          ...previous,
          skills: previous.skills.map((skill) =>
            skill.id === row.id
              ? {
                  ...skill,
                  status: result.status ?? next.status,
                  fileName: result.fileName ?? next.fileName,
                  path: `${skill.dir}/${result.fileName ?? next.fileName}`,
                  actions: [
                    ...(skill.actions ?? []).filter((action) => action !== 'enable' && action !== 'disable'),
                    enable ? 'disable' : 'enable',
                  ],
                }
              : skill,
          ),
        }));
        setNotice({ tone: 'ok', text: t(enable ? 'renamedToActive' : 'renamedToDisabled') });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'write-failed';
        setNotice({
          tone: 'error',
          text: `${t('renameFailed', { name: displayName(row) })} ${errorText(t, code)}`,
        });
      }
    },
    [client, t],
  );

  const startRename = React.useCallback((row) => {
    setNotice(null);
    setRenaming({ id: row.id, value: row.dir.split('/').pop() ?? '', error: null, busy: false });
  }, []);

  const cancelRename = React.useCallback(() => setRenaming(null), []);

  const changeRename = React.useCallback((value) => {
    setRenaming((previous) => (previous === null ? previous : { ...previous, value, error: null }));
  }, []);

  const submitRename = React.useCallback(async () => {
    const current = renaming;
    if (current === null || current.busy === true) return;
    const value = current.value.trim();
    if (!DIRECTORY_NAME.test(value)) {
      setRenaming({ ...current, error: t('renameInvalid') });
      return;
    }
    const row = list.skills.find((skill) => skill.id === current.id);
    if (row === undefined) {
      setRenaming(null);
      return;
    }
    const oldName = row.dir.split('/').pop() ?? row.dir;
    setRenaming({ ...current, busy: true, error: null });
    try {
      const result = await client.rename(row.id, value);
      // The row is rebuilt from the answer and keeps its place in the list; the
      // id changes with the path, which is why the key is the new one.
      setList((previous) => ({
        ...previous,
        skills: previous.skills.map((skill) =>
          skill.id === row.id
            ? {
                ...skill,
                id: result.id ?? skill.id,
                dir: result.dir ?? skill.dir,
                path: `${result.dir ?? skill.dir}/${skill.fileName ?? 'SKILL.md'}`,
                status: result.status ?? skill.status,
              }
            : skill,
        ),
      }));
      setRenaming(null);
      setNotice({ tone: 'ok', text: t('renamedDirectory', { old: oldName, new: value }) });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'write-failed';
      setRenaming({ ...current, busy: false, error: `${t('renameFailedDirectory', { old: oldName })} ${errorText(t, code)}` });
    }
  }, [client, list.skills, renaming, t]);

  const downloadMd = React.useCallback(
    (row) => client.download(`/skill/${encodeURIComponent(row.id)}/download.md`, row.fileName ?? 'SKILL.md'),
    [client],
  );
  const downloadZip = React.useCallback(
    (row) => {
      const name = row.dir.split('/').pop() ?? 'skill';
      client.download(`/skill/${encodeURIComponent(row.id)}/download.zip`, `${name}.zip`);
    },
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
      if (file !== null) upload(file, pendingMode.current.mode, pendingMode.current.id);
    },
  });

  const noticeView =
    notice === null
      ? null
      : h(
          'div',
          { className: 'dshsk-notice', 'data-tone': notice.tone === 'ok' ? 'ok' : 'error', role: 'status' },
          notice.text,
        );

  if (editor !== null) {
    if (editor.phase !== 'ready') {
      return h(
        'div',
        { className: 'dshsk-page', 'data-mode': 'editor' },
        h(
          'div',
          { className: 'dshsk-inner dshsk-innerEditor' },
          h('div', { className: 'dshsk-loading' }, t('editorLoading')),
        ),
      );
    }
    if (editor.mode === 'view') {
      const row = editor.row;
      const editable = Array.isArray(row?.actions) && row.actions.includes('edit');
      return h(
        'div',
        { className: 'dshsk-page', 'data-mode': 'editor' },
        h(
          'div',
          { className: 'dshsk-inner dshsk-innerEditor' },
          noticeView,
          h(SkillViewer, {
            t,
            name: editor.name,
            path: editor.path,
            content: editor.content,
            editable,
            onClose: () => setEditor(null),
            onEdit: () => openEditor(row),
          }),
        ),
      );
    }
    return h(
      'div',
      { className: 'dshsk-page', 'data-mode': 'editor' },
      h(
        'div',
        { className: 'dshsk-inner dshsk-innerEditor' },
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
    list.phase === 'ready' && list.home !== ''
      ? `${t('subtitle', { home: list.home })} · ${count === 1 ? t('countOne') : t('count', { count })}`
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
            {
              type: 'button',
              className: 'dshsk-button',
              'data-variant': 'primary',
              title: t('uploadNewHint'),
              onClick: () => pickFile('create'),
            },
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
            h('button', { type: 'button', className: 'dshsk-button', onClick: () => load() }, t('retry')),
          )
        : null,
      list.phase === 'ready'
        ? SECTIONS.map((section) =>
            h(SkillsSection, {
              key: section.key,
              t,
              section,
              rows: list.skills.filter(section.includes),
              compact,
              callbacks: {
                onView: openViewer,
                onEdit: openEditor,
                onRename: startRename,
                renaming,
                onRenameChange: changeRename,
                onRenameSubmit: submitRename,
                onRenameCancel: cancelRename,
                onDownloadMd: downloadMd,
                onDownloadZip: downloadZip,
                onUpload: (row) => pickFile('replace', row.id),
                onToggle: toggle,
              },
            }),
          )
        : null,
      h('p', { className: 'dshsk-note' }, t('statusNote')),
    ),
  );
}

export default SkillsPage;

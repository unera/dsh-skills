/**
 * The full-page read-only view.
 *
 * Same frame as the editor — the panel itself, not a dialog and not a route —
 * but nothing to type into: the content is shown as it is, in the same monospace
 * text, with no renderer in between. Close returns to the list, and Edit appears
 * only when the skill may be edited, so a packaged or provider skill cannot lead
 * anywhere that writes.
 */
import * as React from 'react';

const h = React.createElement;

/**
 * @param props - see {@link SkillViewer}.
 * @returns the viewer.
 */
export function SkillViewer({ t, name, path, content, editable, onClose, onEdit, error }) {
  const text = typeof content === 'string' ? content : '';
  const empty = text.trim() === '';
  return h(
    'div',
    { className: 'dshsk-editor dshsk-viewer' },
    h(
      'div',
      { className: 'dshsk-editorHead' },
      h(
        'div',
        { className: 'dshsk-headText' },
        h('h2', { className: 'dshsk-editorTitle' }, name),
        h(
          'p',
          { className: 'dshsk-editorMeta' },
          h('span', { className: 'dshsk-readOnly' }, t('readOnly')),
          path === '' ? null : h('span', { className: 'dshsk-viewerPath' }, ` · ${path}`),
        ),
      ),
    ),
    error === null || error === undefined
      ? null
      : h('div', { className: 'dshsk-notice', 'data-tone': 'error', role: 'alert' }, error),
    h(
      'div',
      { className: 'dshsk-pane dshsk-paneContent' },
      h('div', { className: 'dshsk-paneHead' }, path === '' ? name : path),
      h(
        'pre',
        { className: 'dshsk-content', 'aria-label': name, tabIndex: 0 },
        empty ? h('span', { className: 'dshsk-contentEmpty' }, t('contentUnavailable')) : text,
      ),
    ),
    h(
      'div',
      { className: 'dshsk-footer' },
      editable === true
        ? h(
            'button',
            { type: 'button', className: 'dshsk-button', onClick: () => onEdit() },
            t('edit'),
          )
        : null,
      h(
        'button',
        { type: 'button', className: 'dshsk-button', 'data-variant': 'primary', onClick: () => onClose() },
        t('close'),
      ),
    ),
  );
}

export default SkillViewer;

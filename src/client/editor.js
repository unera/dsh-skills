/**
 * The full-page editor view inside the panel.
 *
 * Left: a plain monospace textarea, no highlighter. Right: the markdown
 * rendered live from the same state. The view owns only the draft; the page owns
 * reading, the on-disk conflict check, and writing, so Cancel can drop the draft
 * without a round trip and Save can report a refusal next to the text.
 */
import * as React from 'react';
import { renderMarkdownBlock } from './markdown.js';

const h = React.createElement;

/**
 * @param props - see {@link SkillEditor}.
 * @returns the editor view.
 */
export function SkillEditor({ t, path, initialContent, onCancel, onSave, saving, warning, error }) {
  const [content, setContent] = React.useState(initialContent ?? '');
  React.useEffect(() => setContent(initialContent ?? ''), [initialContent]);

  const dirty = content !== (initialContent ?? '');
  const saveDisabled = !dirty || saving === true;

  return h(
    'div',
    { className: 'dshsk-editor' },
    h(
      'div',
      { className: 'dshsk-editorHead' },
      h(
        'div',
        { className: 'dshsk-headText' },
        h('h2', { className: 'dshsk-editorTitle' }, t('editorTitle', { path })),
        h('p', { className: 'dshsk-editorMeta' }, dirty ? '' : t('editorUnchanged')),
      ),
    ),
    warning === true ? h('div', { className: 'dshsk-notice', 'data-tone': 'warn', role: 'status' }, t('editorChangedOnDisk')) : null,
    error != null
      ? h('div', { className: 'dshsk-notice', 'data-tone': 'error', role: 'alert' }, error)
      : null,
    h(
      'div',
      { className: 'dshsk-split' },
      h(
        'div',
        { className: 'dshsk-pane' },
        h('div', { className: 'dshsk-paneHead' }, path),
        h('textarea', {
          className: 'dshsk-textarea',
          'aria-label': path,
          spellCheck: false,
          value: content,
          onChange: (event) => setContent(event.target.value),
        }),
      ),
      h(
        'div',
        { className: 'dshsk-pane' },
        h('div', { className: 'dshsk-paneHead' }, t('editorPreview')),
        h(
          'div',
          { className: 'dshsk-preview' },
          renderMarkdownBlock(content, t('editorPreviewEmpty')),
        ),
      ),
    ),
    h(
      'div',
      { className: 'dshsk-footer' },
      h(
        'button',
        {
          type: 'button',
          className: 'dshsk-button',
          onClick: () => onCancel(),
        },
        t('editorCancel'),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dshsk-button',
          'data-variant': 'primary',
          title: t('editorSaveTitle'),
          disabled: saveDisabled,
          onClick: () => onSave(content),
        },
        t('editorSave'),
      ),
    ),
  );
}

export default SkillEditor;

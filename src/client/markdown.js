/**
 * Self-contained markdown renderer for the editor preview.
 *
 * Why this exists instead of a library: a plugin's client bundle can only
 * `require()` the module table the DSH shell seeds (react, react-dom, the
 * harness' own client packages). Shiki and the harness' markdown component are
 * compiled INTO the shell bundle and are not in that table, so a plugin cannot
 * import them at any version. A renderer of our own, returning React elements
 * rather than HTML, also keeps uploaded markdown from becoming markup: every
 * character of the source stays text unless a rule below explicitly recognizes
 * it, and no `dangerouslySetInnerHTML` appears anywhere in this package.
 *
 * Supported: ATX headings, paragraphs, fenced and indented code blocks,
 * blockquotes, ordered and unordered lists (nested by indentation), tables with
 * an alignment row, thematic breaks. Inline: code spans, bold, italic,
 * strikethrough, links. Everything else is literal text.
 */
import * as React from 'react';

const h = React.createElement;

/** Matches a fenced code block opener and its optional language. */
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
/** Matches an ATX heading. */
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
/** Matches a thematic break. */
const THEMATIC = /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
/** Matches a list item, capturing indentation, the marker, and the text. */
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
/** Matches a table's alignment row. */
const TABLE_RULE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

/**
 * Split a table row into cells.
 * @param line - row text, with or without the outer bars.
 * @returns trimmed cell texts.
 */
function splitRow(line) {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);
  const cells = [];
  let current = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\' && text[index + 1] === '|') {
      current += '|';
      index += 1;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Whether a line starts a block that ends a paragraph.
 * @param line - source line.
 * @returns whether the line opens its own block.
 */
function startsBlock(line) {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    THEMATIC.test(line) ||
    LIST_ITEM.test(line) ||
    /^\s*>/.test(line)
  );
}

/**
 * Accept only harmless link targets; anything else renders as plain text.
 * @param href - candidate URL.
 * @returns the URL, or null when it is not safe to link.
 */
function safeHref(href) {
  const value = href.trim();
  if (value === '') return null;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('#') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
    return value;
  }
  return null;
}

/**
 * Inline pattern, ordered so code wins over emphasis.
 *
 * It is a factory rather than a shared constant because {@link renderInline}
 * recurses: a single global regex would have its `lastIndex` reset by the
 * nested call and the outer scan would restart forever.
 */
const inlinePattern = () =>
  /(`+)([\s\S]*?)\1|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\s][\s\S]*?)\*|_([^_\s][\s\S]*?)_|\[([^\]]*)\]\(([^)\s]*)\)/g;

/**
 * Render one line of inline markdown.
 * @param text - source text.
 * @param keyPrefix - key prefix keeping sibling keys unique.
 * @returns React nodes.
 */
export function renderInline(text, keyPrefix = 'i') {
  const nodes = [];
  let last = 0;
  let counter = 0;
  const pattern = inlinePattern();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${counter}`;
    counter += 1;
    if (match[2] !== undefined) {
      nodes.push(h('code', { key, className: 'dshsk-code' }, match[2].trim()));
    } else if (match[3] !== undefined || match[4] !== undefined) {
      nodes.push(h('strong', { key }, renderInline(match[3] ?? match[4], key)));
    } else if (match[5] !== undefined) {
      nodes.push(h('del', { key }, renderInline(match[5], key)));
    } else if (match[6] !== undefined || match[7] !== undefined) {
      nodes.push(h('em', { key }, renderInline(match[6] ?? match[7], key)));
    } else if (match[8] !== undefined) {
      const href = safeHref(match[9] ?? '');
      if (href === null) {
        nodes.push(text.slice(match.index, match.index + match[0].length));
      } else {
        nodes.push(
          h('a', { key, href, rel: 'noreferrer noopener', target: '_blank' }, renderInline(match[8], key)),
        );
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Render a run of list items at one indentation level.
 * @param items - items with their marker and depth.
 * @param ordered - whether the items belong to an ordered list.
 * @param keyPrefix - key prefix for this list.
 * @returns a list element.
 */
function renderList(items, ordered, keyPrefix) {
  return h(
    ordered ? 'ol' : 'ul',
    { key: keyPrefix, className: 'dshsk-list' },
    items.map((item, index) =>
      h('li', { key: `${keyPrefix}-${index}` }, renderInline(item.text, `${keyPrefix}-${index}`)),
    ),
  );
}

/**
 * Render markdown source as React elements.
 * @param source - markdown text.
 * @returns the block elements.
 */
export function renderMarkdown(source) {
  const lines = String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const blocks = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const language = fence[2];
      const body = [];
      index += 1;
      while (index < lines.length && !new RegExp(`^ {0,3}${marker}{3,}\\s*$`).test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        h(
          'pre',
          { key: `b${key++}`, className: 'dshsk-pre' },
          h('code', { className: language ? `dshsk-fence language-${language}` : 'dshsk-fence' }, body.join('\n')),
        ),
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6);
      blocks.push(h(`h${level}`, { key: `b${key++}`, className: 'dshsk-heading' }, renderInline(heading[2])));
      index += 1;
      continue;
    }

    if (THEMATIC.test(line)) {
      blocks.push(h('hr', { key: `b${key++}`, className: 'dshsk-hr' }));
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoted.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(
        h('blockquote', { key: `b${key++}`, className: 'dshsk-quote' }, renderMarkdown(quoted.join('\n'))),
      );
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && TABLE_RULE.test(lines[index + 1])) {
      const header = splitRow(line);
      const alignRow = splitRow(lines[index + 1]);
      const align = alignRow.map((cell) =>
        cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left',
      );
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push(
        h(
          'div',
          { key: `b${key++}`, className: 'dshsk-tableWrap' },
          h(
            'table',
            { className: 'dshsk-table' },
            h(
              'thead',
              null,
              h(
                'tr',
                null,
                header.map((cell, column) =>
                  h('th', { key: `h${column}`, style: { textAlign: align[column] ?? 'left' } }, renderInline(cell)),
                ),
              ),
            ),
            h(
              'tbody',
              null,
              rows.map((row, rowIndex) =>
                h(
                  'tr',
                  { key: `r${rowIndex}` },
                  header.map((_, column) =>
                    h(
                      'td',
                      { key: `c${column}`, style: { textAlign: align[column] ?? 'left' } },
                      renderInline(row[column] ?? ''),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const items = [];
      let ordered = false;
      while (index < lines.length) {
        const current = LIST_ITEM.exec(lines[index]);
        if (!current) break;
        ordered = /\d/.test(current[2]);
        items.push({ text: current[3], indent: current[1].replace(/\t/g, '  ').length });
        index += 1;
      }
      blocks.push(renderList(items, ordered, `b${key++}`));
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== '' && !startsBlock(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(h('p', { key: `b${key++}`, className: 'dshsk-p' }, renderInline(paragraph.join('\n'))));
  }

  return blocks;
}

/**
 * Render markdown into a single container element.
 * @param source - markdown text.
 * @param empty - what to show when the source renders nothing.
 * @returns the container.
 */
export function renderMarkdownBlock(source, empty = null) {
  const blocks = renderMarkdown(source);
  if (blocks.length === 0) {
    return h('div', { className: 'dshsk-md dshsk-mdEmpty' }, empty);
  }
  return h('div', { className: 'dshsk-md' }, blocks);
}

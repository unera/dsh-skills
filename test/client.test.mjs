/**
 * Client behaviour: the table, the row menu, and the editor's cancel/save and
 * pending-changes rules.
 *
 * The page is driven with a stub client, so each assertion also says which wire
 * call a click produced — the components themselves hold no transport state.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { SkillEditor } from '../src/client/editor.js';
import { SkillRow, SkillsPage } from '../src/client/page.js';
import { renderMarkdown } from '../src/client/markdown.js';
import { truncateMiddle } from '../src/client/format.js';
import { translate } from './helpers.mjs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const h = React.createElement;

/** The two rows every list test starts from. */
const SKILLS = [
  {
    dir: 'alpha',
    status: 'active',
    fileName: 'SKILL.md',
    name: 'alpha-skill',
    description: 'the first skill',
    whenToUse: null,
    path: 'alpha/SKILL.md',
    size: 120,
    mtimeMs: 1000,
  },
  {
    dir: 'a-very-long-directory-name-that-will-be-truncated-in-the-middle',
    status: 'disabled',
    fileName: '_SKILL.md',
    name: null,
    description: null,
    whenToUse: null,
    path: 'a-very-long-directory-name-that-will-be-truncated-in-the-middle/_SKILL.md',
    size: 80,
    mtimeMs: 2000,
  },
];

/**
 * Build a stub client recording every call.
 * @param overrides - per-method replacements.
 * @returns the stub plus its call log.
 */
function stubClient(overrides = {}) {
  const calls = [];
  const record = (name, implementation) => async (...args) => {
    calls.push([name, ...args]);
    return implementation(...args);
  };
  const client = {
    list: record('list', async () => ({ root: '/home/x/.dsh/skills', skills: SKILLS })),
    read: record('read', async (dir) => ({
      dir,
      fileName: dir === 'alpha' ? 'SKILL.md' : '_SKILL.md',
      content: '# Alpha\n',
      mtimeMs: 1000,
    })),
    save: record('save', async (dir) => ({ ok: true, dir, fileName: 'SKILL.md', mtimeMs: 1500 })),
    upload: record('upload', async () => ({ ok: true, action: 'created', dir: 'new-skill', fileName: 'SKILL.md' })),
    download: (...args) => calls.push(['download', ...args]),
    ...overrides,
  };
  return { client, calls };
}

/**
 * Render a component and settle its effects.
 * @param element - React element.
 * @returns the renderer.
 */
async function render(element) {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

/**
 * All text under one node.
 * @param node - test instance.
 * @returns the concatenated text.
 */
function textOf(node) {
  const parts = [];
  const walk = (child) => {
    if (child === null || child === undefined) return;
    if (typeof child === 'string' || typeof child === 'number') {
      parts.push(String(child));
      return;
    }
    if (Array.isArray(child)) {
      child.forEach(walk);
      return;
    }
    if (child.children) child.children.forEach(walk);
  };
  walk(node.children);
  return parts.join(' ');
}

/**
 * Find one host node by type and text.
 * @param renderer - the renderer.
 * @param type - host element type.
 * @param text - text the node must contain; omitted matches the first node.
 * @returns the test instance.
 */
function findByText(renderer, type, text) {
  const nodes = renderer.root.findAll((node) => node.type === type);
  if (text === undefined) {
    assert.ok(nodes.length > 0, `no <${type}> rendered`);
    return nodes[0];
  }
  const found = nodes.find((node) => textOf(node).includes(text));
  assert.ok(found, `no <${type}> containing "${text}"`);
  return found;
}

/**
 * The list rows, excluding the header row.
 * @param renderer - the renderer.
 * @returns the row instances.
 */
function rowsOf(renderer) {
  return renderer.root.findAll((node) => node.props.role === 'row' && typeof node.props['data-skill'] === 'string');
}

/**
 * Install a `window.matchMedia` stub for one test.
 * @param narrow - whether `(max-width: 640px)` reports a match.
 * @returns a disposer restoring the previous global.
 */
function stubViewport(narrow) {
  const previous = globalThis.window;
  globalThis.window = {
    matchMedia: () => ({
      matches: narrow,
      addEventListener() {},
      removeEventListener() {},
    }),
  };
  return () => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  };
}

test('the list renders a status dot, the name, the path, and one menu per row', async () => {
  const restore = stubViewport(false);
  try {
    const { client } = stubClient();
    const renderer = await render(h(SkillsPage, { t: translate, client }));

    const header = renderer.root
      .findAll((node) => node.props.role === 'columnheader')
      .map((node) => textOf(node));
    assert.deepEqual(header, ['Status', 'Skill', 'Path', 'Actions']);

    const rows = rowsOf(renderer);
    assert.equal(rows.length, 2);

    const first = rows[0];
    const text = textOf(first);
    assert.match(text, /alpha-skill/);
    assert.match(text, /the first skill/);
    assert.match(text, /alpha\/SKILL\.md/);
    // The status word is gone from the row: the dot carries it.
    assert.doesNotMatch(text, /\bActive\b/);
    const dot = first.findAll((node) => node.props.className === 'dshsk-statusDot')[0];
    assert.equal(dot.props['data-status'], 'active');
    assert.equal(dot.props.title, 'Active');
    assert.equal(dot.props['aria-label'], 'Active');

    const second = rows[1];
    // No frontmatter name: the directory name is the display name.
    assert.match(textOf(second), /a-very-long-directory-name/);
    const dot2 = second.findAll((node) => node.props.className === 'dshsk-statusDot')[0];
    assert.equal(dot2.props.title, 'Disabled');
    assert.equal(dot2.props['aria-label'], 'Disabled');
    assert.equal(dot2.props['data-status'], 'disabled');

    // The path is shortened to 15 characters, the full one lives in the tooltip.
    const paths = renderer.root.findAll((node) => node.type === 'code');
    assert.equal(paths.length, 2);
    for (const path of paths) {
      const shown = textOf(path);
      assert.ok(shown.length <= 15, `"${shown}" must be at most 15 characters`);
      if (path.props.title.length > 15) assert.match(shown, /…/, 'a long path is cut in the middle');
    }
    assert.equal(paths[0].props.title, SKILLS[0].path);
    assert.equal(paths[0].props['aria-label'], SKILLS[0].path);
    assert.equal(textOf(paths[0]), truncateMiddle(SKILLS[0].path, 15));

    // One ⋯ button per row.
    const more = renderer.root.findAll(
      (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
    );
    assert.equal(more.length, 2);
  } finally {
    restore();
  }
});

test('the empty state appears when no skill is installed', async () => {
  const { client } = stubClient({ list: async () => ({ root: '/home/x/.dsh/skills', skills: [] }) });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  assert.match(textOf(renderer.root), /No skills installed/);
  assert.equal(renderer.root.findAll((node) => node.props.role === 'table').length, 0);
});

test('the row menu opens, lists the four actions, and calls the right client method', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const button = renderer.root.findAll(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  )[0];
  assert.equal(button.props['aria-expanded'], 'false');

  await act(async () => button.props.onClick());
  const menu = renderer.root.find((node) => node.props.role === 'menu');
  const items = menu.findAll((node) => node.type === 'button').map((node) => textOf(node));
  assert.deepEqual(items, ['Download SKILL.md', 'Download ZIP', 'Upload', 'Edit SKILL.md']);

  await act(async () => findByText(renderer, 'button', 'Download ZIP').props.onClick());
  assert.deepEqual(calls.at(-1), ['download', '/skill/alpha/download.zip', 'alpha.zip']);
  assert.equal(renderer.root.findAll((node) => node.props.role === 'menu').length, 0, 'the menu closes');

  await act(async () => button.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Download SKILL.md').props.onClick());
  assert.deepEqual(calls.at(-1), ['download', '/skill/alpha/download.md', 'SKILL.md']);

  await act(async () => button.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Edit SKILL.md').props.onClick());
  assert.deepEqual(calls.at(-1), ['read', 'alpha']);
  assert.match(textOf(renderer.root), /Editing alpha\/SKILL\.md/);
});

test('the editor keeps Save disabled until something changes', async () => {
  const saved = [];
  const renderer = await render(
    h(SkillEditor, {
      t: translate,
      path: 'alpha/SKILL.md',
      initialContent: '# Alpha\n',
      saving: false,
      onCancel: () => {},
      onSave: (content) => saved.push(content),
    }),
  );

  const save = () => findByText(renderer, 'button', 'Save');
  assert.equal(save().props.disabled, true, 'nothing changed yet');

  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Alpha\n\nMore text\n' } }));
  assert.equal(save().props.disabled, false);
  assert.match(textOf(renderer.root.findAll((node) => node.props.className === 'dshsk-preview')[0]), /More text/);

  await act(async () => textarea.props.onChange({ target: { value: '# Alpha\n' } }));
  assert.equal(save().props.disabled, true, 'back to the original text');

  await act(async () => textarea.props.onChange({ target: { value: '# Changed\n' } }));
  await act(async () => save().props.onClick());
  assert.deepEqual(saved, ['# Changed\n']);
});

test('cancel returns to the list and drops the draft', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const button = renderer.root.findAll(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  )[0];
  await act(async () => button.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Edit SKILL.md').props.onClick());

  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# discarded\n' } }));
  await act(async () => findByText(renderer, 'button', 'Cancel').props.onClick());

  assert.equal(renderer.root.findAll((node) => node.type === 'textarea').length, 0);
  assert.match(textOf(renderer.root), /Skills/);
  assert.equal(calls.some(([name]) => name === 'save'), false, 'cancel writes nothing');
});

test('save writes through the client and returns to the refreshed list', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const button = renderer.root.findAll(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  )[0];
  await act(async () => button.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Edit SKILL.md').props.onClick());

  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Saved content\n' } }));
  const save = renderer.root.findAll(
    (node) => node.type === 'button' && textOf(node).includes('Save'),
  )[0];
  await act(async () => save.props.onClick());

  assert.deepEqual(
    calls.filter(([name]) => name === 'save'),
    [['save', 'alpha', '# Saved content\n']],
  );
  assert.equal(renderer.root.findAll((node) => node.type === 'textarea').length, 0);
  assert.match(textOf(renderer.root), /Saved alpha\/SKILL\.md/);
  assert.equal(calls.filter(([name]) => name === 'list').length, 2, 'the list is reloaded');
});

test('a file changed on disk warns before the first save and overwrites on the second', async () => {
  let reads = 0;
  const { client, calls } = stubClient({
    read: async (dir) => {
      reads += 1;
      // The first read is the editor opening; the conflict check sees a newer file.
      return { dir, fileName: 'SKILL.md', content: '# Alpha\n', mtimeMs: reads === 1 ? 1000 : 2222 };
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const button = renderer.root.findAll(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  )[0];
  await act(async () => button.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Edit SKILL.md').props.onClick());
  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Mine\n' } }));

  const save = () => renderer.root.findAll((node) => node.type === 'button' && textOf(node).includes('Save'))[0];
  await act(async () => save().props.onClick());

  assert.match(textOf(renderer.root), /changed on disk/);
  assert.equal(calls.some(([name]) => name === 'save'), false, 'the first Save only checks');
  assert.equal(renderer.root.findAll((node) => node.type === 'textarea').length, 1, 'the draft survives');

  await act(async () => save().props.onClick());
  assert.deepEqual(
    calls.filter(([name]) => name === 'save'),
    [['save', 'alpha', '# Mine\n']],
  );
});

test('a refusal from the host is shown localized next to the draft', async () => {
  const { client } = stubClient({
    save: async () => {
      const error = new Error('nope');
      error.code = 'write-failed';
      error.name = 'ApiError';
      throw error;
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const button = renderer.root.findAll(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  )[0];
  await act(async () => button.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Edit SKILL.md').props.onClick());
  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# x\n' } }));
  await act(async () =>
    renderer.root
      .findAll((node) => node.type === 'button' && textOf(node).includes('Save'))[0]
      .props.onClick(),
  );
  assert.match(textOf(renderer.root), /Could not write the file/);
});

test('the markdown preview covers headings, emphasis, code, lists, links, and tables', () => {
  const nodes = renderMarkdown(
    ['# Title', '', 'Some **bold** and *italic* and `code`.', '', '- one', '- two', '', '[link](https://example.org)', '', '| a | b |', '| --- | --- |', '| 1 | 2 |'].join('\n'),
  );
  const types = nodes.map((node) => node.type);
  assert.ok(types.includes('h3'));
  assert.ok(types.includes('ul'));
  assert.ok(types.includes('p'));
  assert.ok(types.includes('div'));
  const table = nodes.find((node) => node.type === 'div');
  assert.equal(table.props.className, 'dshsk-tableWrap');
});

test('middle truncation keeps both ends and never exceeds the limit', () => {
  const long = 'some/very/long/path/that/should/be/shortened/SKILL.md';
  const short = truncateMiddle(long, 30);
  assert.equal(short.length, 30);
  assert.ok(short.startsWith('some/very/lo'));
  assert.ok(short.endsWith('.md'));
  assert.equal(truncateMiddle('short/path/SKILL.md', 40), 'short/path/SKILL.md');
});

test('a compact row drops the path cell and keeps the full path in its accessible name', async () => {
  const skill = SKILLS[1];
  const renderer = await render(
    h(SkillRow, {
      t: translate,
      skill,
      compact: true,
      onEdit: () => {},
      onDownloadMd: () => {},
      onDownloadZip: () => {},
      onUpload: () => {},
    }),
  );

  assert.equal(renderer.root.findAll((node) => node.props.className === 'dshsk-pathCell').length, 0);
  assert.equal(renderer.root.findAll((node) => node.type === 'code').length, 0);

  const name = renderer.root.findAll((node) => node.props.className === 'dshsk-name')[0];
  assert.equal(textOf(name), skill.dir, 'the directory name is the fallback display name');
  assert.ok(textOf(name).length > 0, 'the name must never collapse to nothing');

  const row = renderer.root.findAll((node) => node.props.role === 'row')[0];
  assert.equal(row.props['data-layout'], 'compact');
  assert.match(row.props['aria-label'], /a-very-long-directory-name/);
  assert.match(row.props['aria-label'], /Disabled/);
  assert.ok(row.props['aria-label'].includes(skill.path), 'the row keeps the full path');

  // The status dot and the actions menu survive the compact layout.
  const dot = renderer.root.findAll((node) => node.props.className === 'dshsk-statusDot')[0];
  assert.equal(dot.props['aria-label'], 'Disabled');
  assert.equal(
    renderer.root.findAll((node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu').length,
    1,
  );
});

test('at 360 px the page renders no path column at all', async () => {
  const restore = stubViewport(true);
  try {
    const { client } = stubClient();
    const renderer = await render(h(SkillsPage, { t: translate, client }));

    const header = renderer.root
      .findAll((node) => node.props.role === 'columnheader')
      .map((node) => textOf(node));
    assert.deepEqual(header, ['Status', 'Skill', 'Actions'], 'the Path header goes with the column');

    assert.equal(renderer.root.findAll((node) => node.props.className === 'dshsk-pathCell').length, 0);
    assert.equal(renderer.root.findAll((node) => node.type === 'code').length, 0);

    const rows = rowsOf(renderer);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.props['data-layout'], 'compact');
      const name = row.findAll((node) => node.props.className === 'dshsk-name')[0];
      assert.ok(textOf(name).trim().length > 0, 'the name keeps its full text in the DOM');
    }
    assert.equal(rows[0].props['aria-label'].includes(SKILLS[0].path), true);

    // The actions menu is still there and still anchored to its own row.
    assert.equal(
      renderer.root.findAll((node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu').length,
      2,
    );
  } finally {
    restore();
  }
});

test('without a media-query provider the page stays in the wide layout', async () => {
  const previous = globalThis.window;
  delete globalThis.window;
  try {
    const { client } = stubClient();
    const renderer = await render(h(SkillsPage, { t: translate, client }));
    assert.equal(renderer.root.findAll((node) => node.props.className === 'dshsk-pathCell').length, 2);
    assert.equal(rowsOf(renderer)[0].props['data-layout'], 'wide');
  } finally {
    if (previous !== undefined) globalThis.window = previous;
  }
});

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
import { truncatePath } from '../src/client/format.js';
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
 * Find host nodes carrying one CSS class token.
 * @param renderer - the renderer.
 * @param name - the class name, without the dot.
 * @returns the matching nodes.
 */
function byClass(renderer, name) {
  const pattern = new RegExp(`(^|\\s)${name}(\\s|$)`);
  return renderer.root.findAll((node) => typeof node.props.className === 'string' && pattern.test(node.props.className));
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
      assert.equal(shown, truncatePath(path.props.title));
      assert.doesNotMatch(shown, /…/, 'the cut is three dots, never the … character');
      if (path.props.title.length > 15) {
        assert.equal(shown.length, 17, '7 characters, three dots, 7 characters');
        assert.match(shown, /^.{7}\.\.\..{7}$/);
      } else {
        assert.equal(shown, path.props.title, 'a short path is shown as it is');
      }
    }
    assert.equal(paths[0].props.title, SKILLS[0].path);
    assert.equal(paths[0].props['aria-label'], SKILLS[0].path);
    assert.equal(textOf(paths[0]), SKILLS[0].path, '14 characters fit without a cut');

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

test('a path keeps exactly 7 characters at each end once it passes 15', () => {
  // 14 and 15 characters are shown untouched.
  const fourteen = 'abcdefg/hijklm';
  const fifteen = 'abcdefg/hijklmn';
  assert.equal(fourteen.length, 14);
  assert.equal(fifteen.length, 15);
  assert.equal(truncatePath(fourteen), fourteen);
  assert.equal(truncatePath(fifteen), fifteen);

  // 16 is the first length that gets cut: 7 + "..." + 7 = 17 characters.
  const sixteen = 'abcdefg/hijklmno';
  assert.equal(sixteen.length, 16);
  const cut = truncatePath(sixteen);
  assert.equal(cut, 'abcdefg...ijklmno');
  assert.equal(cut.length, 17);
  assert.equal(cut.slice(0, 7), sixteen.slice(0, 7), 'seven characters on the left');
  assert.equal(cut.slice(-7), sixteen.slice(-7), 'seven characters on the right');
  assert.equal(cut.slice(7, 10), '...', 'a literal three dots, not the … character');
  assert.ok(!cut.includes('…'));

  // A realistic path: the ends are what stay readable.
  assert.equal(truncatePath('split/path/to/some/subpath/foo'), 'split/p...ath/foo');
  assert.equal(truncatePath('interesting-youtube/SKILL.md'), 'interes...KILL.md');
  assert.equal(truncatePath('subagent-worktrees/SKILL.md'), 'subagen...KILL.md');
  // An explicit cut for a caller that needs a different budget.
  assert.equal(truncatePath('abcdefghij', { budget: 5, edge: 2 }), 'ab...ij');
  assert.throws(() => truncatePath('abc', { edge: -1 }), RangeError);
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

  assert.equal(byClass(renderer, 'dshsk-pathCell').length, 0);
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

    assert.equal(byClass(renderer, 'dshsk-pathCell').length, 0);
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
    assert.equal(byClass(renderer, 'dshsk-path').length, 2, 'one path per row, plus none in a header');
    assert.equal(byClass(renderer, 'dshsk-pathCell').length, 3, 'two rows and the column header');
    assert.equal(rowsOf(renderer)[0].props['data-layout'], 'wide');
  } finally {
    if (previous !== undefined) globalThis.window = previous;
  }
});

test('the compact editor has no preview and gives the textarea the whole pane', async () => {
  const renderer = await render(
    h(SkillEditor, {
      t: translate,
      path: 'alpha/SKILL.md',
      initialContent: '# Alpha\n',
      compact: true,
      saving: false,
      onCancel: () => {},
      onSave: () => {},
    }),
  );

  assert.equal(byClass(renderer, 'dshsk-panePreview').length, 0);
  assert.equal(byClass(renderer, 'dshsk-preview').length, 0);
  assert.equal(byClass(renderer, 'dshsk-md').length, 0);
  assert.equal(renderer.root.findAll((node) => node.type === 'textarea').length, 1);

  const editor = byClass(renderer, 'dshsk-editor')[0];
  assert.equal(editor.props['data-layout'], 'compact');
  const split = byClass(renderer, 'dshsk-split')[0];
  assert.equal(split.props['data-layout'], 'single', 'one column, not two');
  assert.equal(byClass(renderer, 'dshsk-pane').length, 1, 'only the editor pane');

  // Cancel and Save stay at the bottom, in that order.
  const footer = byClass(renderer, 'dshsk-footer')[0];
  const buttons = footer.findAll((node) => node.type === 'button').map((node) => textOf(node));
  assert.deepEqual(buttons, ['Cancel', 'Save']);
});

test('the wide editor still renders the live preview beside the text', async () => {
  const renderer = await render(
    h(SkillEditor, {
      t: translate,
      path: 'alpha/SKILL.md',
      initialContent: '# Alpha\n\n**bold**\n',
      saving: false,
      onCancel: () => {},
      onSave: () => {},
    }),
  );

  const split = byClass(renderer, 'dshsk-split')[0];
  assert.equal(split.props['data-layout'], 'split');
  assert.equal(byClass(renderer, 'dshsk-panePreview').length, 1);
  assert.equal(byClass(renderer, 'dshsk-pane').length, 2, 'editor and preview');
  const preview = byClass(renderer, 'dshsk-preview')[0];
  assert.equal(textOf(preview), 'Alpha bold', 'the markdown is rendered, not shown as source');

  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Beta\n' } }));
  const previewAfter = byClass(renderer, 'dshsk-preview')[0];
  assert.equal(textOf(previewAfter), 'Beta', 'the preview follows the text');
});

test('opening the editor at 360 px gives no preview, and at desktop width it does', async () => {
  const openEditor = async (narrow) => {
    const restore = stubViewport(narrow);
    try {
      const { client } = stubClient();
      const renderer = await render(h(SkillsPage, { t: translate, client }));
      const button = renderer.root.findAll(
        (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
      )[0];
      await act(async () => button.props.onClick());
      await act(async () => findByText(renderer, 'button', 'Edit SKILL.md').props.onClick());
      return renderer;
    } finally {
      restore();
    }
  };

  const narrow = await openEditor(true);
  assert.equal(narrow.root.findAll((node) => node.type === 'textarea').length, 1);
  assert.equal(byClass(narrow, 'dshsk-preview').length, 0);
  const editor = byClass(narrow, 'dshsk-editor')[0];
  assert.equal(editor.props['data-layout'], 'compact');
  assert.equal(findByText(narrow, 'button', 'Save').props.disabled, true);

  const wide = await openEditor(false);
  assert.equal(byClass(wide, 'dshsk-preview').length, 1);
  const wideEditor = byClass(wide, 'dshsk-editor')[0];
  assert.equal(wideEditor.props['data-layout'], 'wide');
});

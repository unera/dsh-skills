/**
 * Client behaviour: the three sections, the row's colours and menu, the split
 * control, enable/disable, the editor, and the sidebar icon.
 *
 * The page is driven with a stub client, so each assertion also says which wire
 * call a click produced — the components hold no transport state.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { SkillEditor } from '../src/client/editor.js';
import { SkillsPage, SkillRow } from '../src/client/page.js';
import { ApiError } from '../src/client/api.js';
import { truncatePath } from '../src/client/format.js';
import { errorText, en, ru } from '../src/client/locales.js';
import { SkillsPanelIcon } from '../src/client/index.js';
import { ACCENTS, CSS } from '../src/client/styles.js';
import { row, translate } from './helpers.mjs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const h = React.createElement;

const USER_A = row({});
const USER_B = row({
  id: 'user:home:skills/paused',
  dir: 'skills/paused',
  path: 'skills/paused/_SKILL.md',
  name: null,
  description: null,
  status: 'disabled',
  fileName: '_SKILL.md',
  actions: ['view', 'edit', 'rename', 'upload', 'downloadMd', 'downloadZip', 'enable'],
});
const PLUGIN = row({
  id: 'plugin:install:node_modules/pkg/assets/office',
  origin: 'plugin',
  readOnly: true,
  dir: 'assets/office',
  path: 'assets/office/SKILL.md',
  name: 'office',
  description: 'bundled office',
  status: 'active',
  packageName: 'pkg',
  actions: ['view', 'downloadMd', 'downloadZip'],
});
const VIRTUAL = row({
  id: 'virtual:agent-profile-p-1',
  origin: 'virtual',
  readOnly: true,
  dir: 'agent-profile-p-1',
  path: '',
  name: 'agent-profile-p-1',
  description: null,
  status: 'virtual',
  fileName: null,
  actions: ['view', 'downloadMd'],
});

/**
 * Build a stub client recording every call.
 * @param overrides - per-method replacements.
 * @param skills - rows the list returns.
 * @returns the stub plus its call log.
 */
function stubClient(overrides = {}, skills = [USER_A, USER_B, PLUGIN, VIRTUAL]) {
  const calls = [];
  const record = (name, implementation) => async (...args) => {
    calls.push([name, ...args]);
    return implementation(...args);
  };
  const client = {
    list: record('list', async () => ({ home: '/home/x/.dsh', skills })),
    read: record('read', async (id) => ({
      dir: id,
      fileName: 'SKILL.md',
      content: '# Alpha\n',
      mtimeMs: 1000,
      status: 'active',
    })),
    save: record('save', async (id) => ({ ok: true, id, fileName: 'SKILL.md', mtimeMs: 1500 })),
    setEnabled: record('setEnabled', async (id, enable) => ({
      ok: true,
      id,
      fileName: enable ? 'SKILL.md' : '_SKILL.md',
      status: enable ? 'active' : 'disabled',
    })),
    upload: record('upload', async () => ({ ok: true, action: 'created', dir: 'skills/new-skill' })),
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
 * Find host nodes carrying one CSS class token.
 * @param renderer - the renderer.
 * @param name - the class name, without the dot.
 * @returns the matching nodes.
 */
function byClass(renderer, name) {
  const pattern = new RegExp(`(^|\\s)${name}(\\s|$)`);
  return renderer.root.findAll(
    (node) => typeof node.props.className === 'string' && pattern.test(node.props.className),
  );
}

/**
 * Find one host node by type and text.
 * @param renderer - the renderer.
 * @param type - host element type.
 * @param text - text the node must contain.
 * @returns the test instance.
 */
function findByText(renderer, type, text) {
  const nodes = renderer.root.findAll((node) => node.type === type);
  const found = nodes.find((node) => textOf(node).includes(text));
  assert.ok(found, `no <${type}> containing "${text}"`);
  return found;
}

/**
 * The list rows, excluding section headers.
 * @param renderer - the renderer.
 * @returns the row instances.
 */
function rowsOf(renderer) {
  return renderer.root.findAll((node) => node.props.role === 'row' && typeof node.props['data-id'] === 'string');
}

/**
 * Install a `window.matchMedia` stub for one test.
 * @param narrow - whether `(max-width: 640px)` reports a match.
 * @returns a disposer restoring the previous global.
 */
function stubViewport(narrow) {
  const previous = globalThis.window;
  globalThis.window = {
    matchMedia: () => ({ matches: narrow, addEventListener() {}, removeEventListener() {} }),
  };
  return () => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  };
}

/**
 * Relative luminance of a hex colour.
 * @param hex - `#rrggbb`.
 * @returns the luminance.
 */
function luminance(hex) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two hex colours.
 * @param foreground - `#rrggbb`.
 * @param background - `#rrggbb`.
 * @returns the ratio.
 */
function contrast(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test('the page renders three sections, each with its own heading, count, and rows', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const sections = renderer.root.findAll((node) => node.type === 'section');
  assert.deepEqual(
    sections.map((node) => node.props['data-section']),
    ['user', 'plugin', 'virtual'],
  );
  assert.match(textOf(sections[0]), /Standard skills in \$DSH_HOME\/skills/);
  assert.match(textOf(sections[1]), /Skills bundled with plugins/);
  assert.match(textOf(sections[2]), /Provided by plugins \(no file\)/);

  const counts = sections.map((node) => textOf(node.findAll((child) => child.props.className === 'dshsk-sectionCount')[0]));
  assert.deepEqual(counts, ['2', '1', '1']);

  assert.equal(rowsOf(renderer).length, 4);
  // Each row sits in its own section.
  assert.equal(rowsOf(renderer)[0].props['data-origin'], 'user');
  assert.equal(rowsOf(renderer)[2].props['data-origin'], 'plugin');
  assert.equal(rowsOf(renderer)[3].props['data-origin'], 'virtual');
});

test('an empty section shows its own empty state instead of a global one', async () => {
  const { client } = stubClient({}, [USER_A]);
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const sections = renderer.root.findAll((node) => node.type === 'section');
  assert.equal(rowsOf(renderer).length, 1);
  assert.match(textOf(sections[1]), /No installed package bundles a skill/);
  assert.match(textOf(sections[2]), /No plugin provides a skill without a file/);
  assert.doesNotMatch(textOf(renderer.root), /No skills installed/);
});

test('status is a dot, and our skills and packaged ones are coloured differently', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const rows = rowsOf(renderer);

  const userActive = rows[0].findAll((node) => node.props.className === 'dshsk-statusDot')[0];
  assert.equal(userActive.props['data-origin'], 'user');
  assert.equal(userActive.props['data-status'], 'active');
  assert.equal(userActive.props.title, 'Active');

  const userDisabled = rows[1].findAll((node) => node.props.className === 'dshsk-statusDot')[0];
  assert.equal(userDisabled.props['data-status'], 'disabled');
  assert.equal(userDisabled.props.title, 'Disabled');

  const packaged = rows[2].findAll((node) => node.props.className === 'dshsk-statusDot')[0];
  assert.equal(packaged.props['data-origin'], 'plugin');
  assert.match(packaged.props.title, /read-only/);

  // The status word is gone from the row itself.
  assert.doesNotMatch(textOf(rows[0]), /\bActive\b/);
});

test('a packaged name carries the plugin origin, ours does not', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const names = byClass(renderer, 'dshsk-name');
  const ours = names.find((node) => node.props['data-origin'] === 'user');
  const packaged = names.find((node) => node.props['data-origin'] === 'plugin');
  assert.ok(ours, 'a user row renders its name');
  assert.equal(ours.props['data-origin'], 'user');
  assert.ok(packaged, 'a packaged row renders its name');
  assert.equal(packaged.props['data-origin'], 'plugin', 'the pink colour hangs off this attribute');
  assert.equal(packaged.props['data-status'], 'active');
});

test('the pink accents are defined for both palettes and clear the contrast bars', () => {
  // Light and dark come from the shell's own mechanism (body attribute), and the
  // values are ours, so both blocks have to be there and both have to differ.
  assert.match(CSS, /body\s*\{[^}]*--dshsk-plugin-accent:\s*#c2185b/s);
  assert.match(CSS, /body\[data-ds-dark-theme\]\s*\{[^}]*--dshsk-plugin-accent:\s*#f472b6/s);
  assert.notEqual(ACCENTS.light.accent, ACCENTS.dark.accent);
  assert.notEqual(ACCENTS.light.accentMuted, ACCENTS.dark.accentMuted);

  for (const palette of [ACCENTS.light, ACCENTS.dark]) {
    const text = contrast(palette.accent, palette.background);
    const textMuted = contrast(palette.accentMuted, palette.background);
    assert.ok(text >= 4.5, `name contrast ${text.toFixed(2)} in ${palette.background}`);
    assert.ok(textMuted >= 4.5, `muted name contrast ${textMuted.toFixed(2)} in ${palette.background}`);
    // The dot only needs 3:1, and it is the same color as the name.
    assert.ok(text >= 3 && textMuted >= 3);
  }
  // Both ends of the palette are checked against the bar the shell's green sets.
  assert.ok(contrast(ACCENTS.light.accent, ACCENTS.light.background) > 2.28, 'above the green token on white');
});

test('the section titles mark the packaged sections with the plugin accent', () => {
  assert.match(CSS, /\.dshsk-section\[data-section="plugin"\] \.dshsk-sectionName/);
  assert.match(CSS, /\.dshsk-section\[data-section="virtual"\] \.dshsk-sectionName/);
  assert.match(CSS, /\.dshsk-name\[data-origin="plugin"\]\s*\{\s*color: var\(--dshsk-plugin-accent/);
  assert.match(
    CSS,
    /\.dshsk-name\[data-origin="plugin"\]\[data-status="disabled"\]\s*\{\s*color: var\(--dshsk-plugin-accent-muted/,
  );
});

test('the wide row menu is ordered Edit, downloads, Upload, Enable/Disable with separators', async () => {
  const restore = stubViewport(false);
  try {
    const { client, calls } = stubClient();
    const renderer = await render(h(SkillsPage, { t: translate, client }));
    const toggle = rowsOf(renderer)[0].find(
      (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
    );
    await act(async () => toggle.props.onClick());

    const menu = renderer.root.find((node) => node.props.role === 'menu');
    const entries = menu.children.filter((child) => child && typeof child === 'object');
    const labels = entries.map((child) =>
      child.props.role === 'separator' ? '---' : textOf(child),
    );
    assert.deepEqual(labels, [
      'View',
      'Edit',
      '---',
      'Rename',
      '---',
      'Download SKILL.md',
      'Download ZIP',
      '---',
      'Upload',
      '---',
      'Disable',
    ]);

    await act(async () => findByText(renderer, 'button', 'Download ZIP').props.onClick());
    assert.deepEqual(calls.at(-1), ['download', '/skill/user%3Ahome%3Askills%2Falpha/download.zip', 'alpha.zip']);
  } finally {
    restore();
  }
});

test('a packaged row offers view and downloads, a virtual one view and a markdown download', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const rows = rowsOf(renderer);

  // The packaged row has a menu, but it holds downloads alone.
  const packagedToggle = rows[2].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => packagedToggle.props.onClick());
  const packagedMenu = renderer.root.find((node) => node.props.role === 'menu');
  const packagedLabels = packagedMenu.children
    .filter((child) => child && typeof child === 'object' && child.props.role !== 'separator')
    .map((child) => textOf(child));
  assert.deepEqual(packagedLabels, ['View', 'Download SKILL.md', 'Download ZIP']);
  await act(async () => packagedToggle.props.onClick());

  // The virtual row has a menu, with View and the markdown download only.
  const virtualToggle = rows[3].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => virtualToggle.props.onClick());
  const virtualMenu = renderer.root.find((node) => node.props.role === 'menu');
  assert.deepEqual(
    virtualMenu.findAll((node) => node.type === 'button').map((child) => textOf(child)),
    ['View', 'Download SKILL.md'],
  );
  await act(async () => virtualToggle.props.onClick());
  assert.match(textOf(rows[3]), /Provided by a plugin, no file/);
});

test('a wide row with an editor gets a split control; a narrow one gets a single ⋯', async () => {
  const restore = stubViewport(false);
  try {
    const { client, calls } = stubClient();
    const renderer = await render(h(SkillsPage, { t: translate, client }));
    const first = rowsOf(renderer)[0];

    const primary = first.find((node) => node.props.className === 'dshsk-splitPrimary');
    assert.equal(primary.props['aria-label'], 'Edit SKILL.md');
    assert.ok(first.find((node) => node.props.className === 'dshsk-splitToggle'));
    assert.equal(first.findAll((node) => node.props.className === 'dshsk-more').length, 0, 'no plain ⋯ on a split row');
    assert.equal(byClass(renderer, 'dshsk-more').length, 2, 'the packaged and provider rows keep a single button');

    await act(async () => primary.props.onClick());
    assert.deepEqual(calls.at(-1), ['read', 'user:home:skills/alpha']);
    assert.equal(byClass(renderer, 'dshsk-editor').length, 1, 'the split pencil opens the editor');
  } finally {
    restore();
  }
});

test('at 360 px the row drops the split and keeps Edit first in the menu', async () => {
  const restore = stubViewport(true);
  try {
    const { client } = stubClient();
    const renderer = await render(h(SkillsPage, { t: translate, client }));
    assert.equal(byClass(renderer, 'dshsk-splitActions').length, 0);
    assert.equal(byClass(renderer, 'dshsk-more').length, 4, 'every row has a menu in the compact layout');

    const toggle = rowsOf(renderer)[0].find(
      (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
    );
    await act(async () => toggle.props.onClick());
    const menu = renderer.root.find((node) => node.props.role === 'menu');
    const first = menu.children.find((child) => child && typeof child === 'object');
    assert.equal(textOf(first), 'View');
  } finally {
    restore();
  }
});

test('disable renames through the client, shows the exact notice, and updates the row in place', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const toggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Disable').props.onClick());

  assert.deepEqual(
    calls.filter(([name]) => name === 'setEnabled'),
    [['setEnabled', 'user:home:skills/alpha', false]],
  );
  assert.equal(calls.filter(([name]) => name === 'list').length, 1, 'no list reload');

  const notice = renderer.root.find((node) => node.props.className === 'dshsk-notice');
  assert.equal(textOf(notice), 'File SKILL.md renamed to _SKILL.md');

  const updated = rowsOf(renderer)[0];
  assert.equal(updated.props['data-status'], 'disabled');
  const dot = updated.findAll((node) => node.props.className === 'dshsk-statusDot')[0];
  assert.equal(dot.props.title, 'Disabled');
  const path = byClass(renderer, 'dshsk-path')[0];
  assert.equal(path.props.title, 'skills/alpha/_SKILL.md');

  // The menu now offers Enable instead of Disable.
  await act(async () => toggle.props.onClick());
  const labels = renderer.root
    .find((node) => node.props.role === 'menu')
    .children.filter((child) => child && typeof child === 'object' && child.props.role !== 'separator')
    .map((child) => textOf(child));
  assert.ok(labels.includes('Enable'));
  assert.ok(!labels.includes('Disable'));
});

test('enable shows the reverse notice', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const toggle = rowsOf(renderer)[1].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Enable').props.onClick());
  assert.deepEqual(calls.filter(([name]) => name === 'setEnabled')[0], ['setEnabled', 'user:home:skills/paused', true]);
  const notice = renderer.root.find((node) => node.props.className === 'dshsk-notice');
  assert.equal(textOf(notice), 'File _SKILL.md renamed to SKILL.md');
});

test('a refused rename is reported in words and leaves the row alone', async () => {
  const { client } = stubClient({
    setEnabled: async () => {
      throw new ApiError('read-only', 'denied');
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const toggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Disable').props.onClick());

  const notice = renderer.root.find((node) => node.props.className === 'dshsk-notice');
  assert.match(textOf(notice), /Could not rename alpha/);
  assert.match(textOf(notice), /bundled with a plugin and cannot be changed/);
  assert.equal(rowsOf(renderer)[0].props['data-status'], 'active');
});

test('the top Upload button asks for a create, the row menu for a replace', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const input = renderer.root.find((node) => node.type === 'input' && node.props.type === 'file');

  // The page button switches the pending mode to create.
  await act(async () => findByText(renderer, 'button', 'Upload').props.onClick());
  await act(async () => input.props.onChange({ target: { files: [{ name: 'SKILL.md' }], value: '' } }));
  assert.deepEqual(calls.filter(([name]) => name === 'upload').at(-1), [
    'upload',
    { name: 'SKILL.md' },
    'SKILL.md',
    'create',
    '',
  ]);

  // The row's Upload item switches it to replace.
  const toggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  const menu = renderer.root.find((node) => node.props.role === 'menu');
  const uploadItem = menu.findAll((node) => node.type === 'button').find((node) => textOf(node) === 'Upload');
  await act(async () => uploadItem.props.onClick());
  await act(async () => input.props.onChange({ target: { files: [{ name: 'x.zip' }], value: '' } }));
  assert.deepEqual(calls.filter(([name]) => name === 'upload').at(-1), [
    'upload',
    { name: 'x.zip' },
    'x.zip',
    'replace',
    'user:home:skills/alpha',
  ]);
});

test('the editor has no preview at any width', async () => {
  const renderer = await render(
    h(SkillEditor, {
      t: translate,
      path: 'skills/alpha/SKILL.md',
      initialContent: '# Alpha\n',
      saving: false,
      onCancel: () => {},
      onSave: () => {},
    }),
  );
  assert.equal(byClass(renderer, 'dshsk-preview').length, 0);
  assert.equal(byClass(renderer, 'dshsk-split').length, 0);
  assert.equal(byClass(renderer, 'dshsk-md').length, 0);
  assert.equal(byClass(renderer, 'dshsk-pane').length, 1, 'one pane: the textarea');
  assert.equal(renderer.root.findAll((node) => node.type === 'textarea').length, 1);
  assert.equal(typeof SkillsPage, 'function');
});

test('the editor keeps Save disabled until something changes, and Cancel writes nothing', async () => {
  const saved = [];
  let cancelled = 0;
  const renderer = await render(
    h(SkillEditor, {
      t: translate,
      path: 'skills/alpha/SKILL.md',
      initialContent: '# Alpha\n',
      saving: false,
      onCancel: () => {
        cancelled += 1;
      },
      onSave: (content) => saved.push(content),
    }),
  );
  const save = () => findByText(renderer, 'button', 'Save');
  assert.equal(save().props.disabled, true);

  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Changed\n' } }));
  assert.equal(save().props.disabled, false);
  await act(async () => findByText(renderer, 'button', 'Cancel').props.onClick());
  assert.equal(cancelled, 1);
  assert.deepEqual(saved, []);

  await act(async () => textarea.props.onChange({ target: { value: '# Changed again\n' } }));
  await act(async () => save().props.onClick());
  assert.deepEqual(saved, ['# Changed again\n']);
});

test('a save writes through the client and reloads the list', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const primary = rowsOf(renderer)[0].find((node) => node.props.className === 'dshsk-splitPrimary');
  await act(async () => primary.props.onClick());

  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Saved\n' } }));
  await act(async () => findByText(renderer, 'button', 'Save').props.onClick());

  assert.deepEqual(calls.filter(([name]) => name === 'save'), [['save', 'user:home:skills/alpha', '# Saved\n']]);
  assert.equal(byClass(renderer, 'dshsk-editor').length, 0);
  assert.equal(calls.filter(([name]) => name === 'list').length, 2);
});

test('a file changed on disk warns before the first save and overwrites on the second', async () => {
  let reads = 0;
  const { client, calls } = stubClient({
    read: async (id) => {
      reads += 1;
      return { dir: id, fileName: 'SKILL.md', content: '# Alpha\n', mtimeMs: reads === 1 ? 1000 : 2222, status: 'active' };
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  await act(async () => rowsOf(renderer)[0].find((node) => node.props.className === 'dshsk-splitPrimary').props.onClick());
  const textarea = renderer.root.find((node) => node.type === 'textarea');
  await act(async () => textarea.props.onChange({ target: { value: '# Mine\n' } }));

  await act(async () => findByText(renderer, 'button', 'Save').props.onClick());
  assert.match(textOf(renderer.root), /changed on disk/);
  assert.equal(calls.some(([name]) => name === 'save'), false);

  await act(async () => findByText(renderer, 'button', 'Save').props.onClick());
  assert.deepEqual(calls.filter(([name]) => name === 'save'), [['save', 'user:home:skills/alpha', '# Mine\n']]);
});

test('a path keeps 7 characters at each end, and the row shows the cut', async () => {
  const long = 'skills/a-very-long-directory-name-that-will-be-cut/SKILL.md';
  const { client } = stubClient({}, [row({ dir: 'x', path: long })]);
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const path = byClass(renderer, 'dshsk-path')[0];
  assert.equal(textOf(path), truncatePath(long));
  assert.equal(textOf(path), `${long.slice(0, 7)}...${long.slice(-7)}`);
  assert.equal(path.props.title, long);
  assert.doesNotMatch(textOf(path), /…/);
});

test('the sidebar icon is a 24-unit outline that honours the size it is given', () => {
  const small = TestRenderer.create(h(SkillsPanelIcon, { size: 16, active: false })).root.findByType('svg');
  assert.equal(small.props.width, 16);
  assert.equal(small.props.height, 16);
  assert.equal(small.props.viewBox, '0 0 24 24');
  assert.equal(small.props.strokeWidth, 1.75);
  assert.equal(small.props.stroke, 'currentColor');
  assert.equal(small.props.fill, 'none');
  assert.equal(small.props.strokeLinecap, 'round');

  const selected = TestRenderer.create(h(SkillsPanelIcon, { size: 24, active: true })).root.findByType('svg');
  assert.equal(selected.props.width, 24, 'size is not ignored');
  assert.equal(selected.props.height, 24);
  assert.equal(selected.props['data-active'], 'true');
});

test('both dictionaries carry every key, and the codes are localized', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort());
  assert.equal(errorText(translate, 'already-exists'), en.errorAlreadyExists);
  assert.equal(errorText(translate, 'read-only'), en.errorReadOnly);
  assert.equal(en.sectionUser, 'Standard skills in $DSH_HOME/skills');
  assert.equal(ru.sectionUser, 'Обычные скиллы в $DSH_HOME/skills');
});

test('a bare row still renders when the host sends only the required fields', async () => {
  const renderer = await render(
    h(SkillRow, { t: translate, row: row({ description: null, name: null }), compact: false }),
  );
  assert.match(textOf(renderer.root), new RegExp(truncatePath(USER_A.path).replace('.', '\\.')));
  assert.equal(renderer.root.findAll((node) => node.props['data-id'] === USER_A.id).length, 1);
});

test('Rename is in the menu for our skills, and absent for packaged ones', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const userToggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => userToggle.props.onClick());
  const userMenu = renderer.root.find((node) => node.props.role === 'menu');
  const labels = userMenu
    .findAll((node) => node.type === 'button')
    .map((node) => textOf(node));
  assert.deepEqual(labels, [
    'View',
    'Edit',
    'Rename',
    'Download SKILL.md',
    'Download ZIP',
    'Upload',
    'Disable',
  ]);
  await act(async () => userToggle.props.onClick());

  const packagedToggle = rowsOf(renderer)[2].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => packagedToggle.props.onClick());
  const packagedMenu = renderer.root.find((node) => node.props.role === 'menu');
  assert.equal(
    packagedMenu.findAll((node) => node.type === 'button').some((node) => textOf(node) === 'Rename'),
    false,
  );
});

test('renaming asks for a name, refuses an illegal one, and updates the row in place', async () => {
  const renamed = [];
  const { client, calls } = stubClient({
    rename: async (id, name) => {
      renamed.push([id, name]);
      return {
        ok: true,
        id: 'user:home:skills/renamed-one',
        dir: 'skills/renamed-one',
        status: 'active',
        fileName: 'SKILL.md',
      };
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const toggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Rename').props.onClick());

  const input = renderer.root.find(
    (node) => node.type === 'input' && node.props.className === 'dshsk-renameInput',
  );
  assert.equal(input.props.value, 'alpha', 'the current directory name is prefilled');

  const submit = async () => {
    const form = renderer.root.find((node) => node.props.className === 'dshsk-rename');
    await act(async () => form.props.onSubmit({ preventDefault() {} }));
  };
  await act(async () => input.props.onChange({ target: { value: 'Bad Name' } }));
  await submit();
  assert.deepEqual(renamed, [], 'an illegal name is never sent');
  assert.match(textOf(renderer.root), /lowercase letters, digits/);

  await act(async () => input.props.onChange({ target: { value: 'renamed-one' } }));
  await submit();

  assert.deepEqual(renamed, [['user:home:skills/alpha', 'renamed-one']]);
  assert.equal(calls.filter(([name]) => name === 'list').length, 1, 'no reload');
  const notice = renderer.root.find((node) => node.props.className === 'dshsk-notice');
  assert.equal(textOf(notice), 'Directory alpha renamed to renamed-one');

  const updated = rowsOf(renderer)[0];
  assert.equal(updated.props['data-id'], 'user:home:skills/renamed-one');
  assert.equal(byClass(renderer, 'dshsk-path')[0].props.title, 'skills/renamed-one/SKILL.md');
  assert.equal(updated.props['data-status'], 'active', 'the status is unchanged');
  // The order of the list is untouched.
  assert.deepEqual(
    rowsOf(renderer).map((node) => node.props['data-id']),
    ['user:home:skills/renamed-one', 'user:home:skills/paused', PLUGIN.id, VIRTUAL.id],
  );
});

test('a refused rename is shown in the form and the row keeps its name', async () => {
  const { client } = stubClient({
    rename: async () => {
      throw new ApiError('already-exists', 'taken');
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const toggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'Rename').props.onClick());
  const input = renderer.root.find(
    (node) => node.type === 'input' && node.props.className === 'dshsk-renameInput',
  );
  await act(async () => input.props.onChange({ target: { value: 'taken' } }));
  const form = renderer.root.find((node) => node.props.className === 'dshsk-rename');
  await act(async () => form.props.onSubmit({ preventDefault() {} }));

  assert.match(textOf(renderer.root), /Could not rename the directory alpha/);
  assert.match(textOf(renderer.root), /already exists/);
  assert.equal(rowsOf(renderer)[0].props['data-id'], 'user:home:skills/alpha');

  // Cancel closes the form without a call.
  await act(async () => findByText(renderer, 'button', 'Cancel').props.onClick());
  assert.equal(byClass(renderer, 'dshsk-rename').length, 0);
});

test('View opens a read-only page with no textarea and no Save, and Close returns', async () => {
  const { client, calls } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));

  const toggle = rowsOf(renderer)[0].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => toggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'View').props.onClick());

  assert.deepEqual(calls.filter(([name]) => name === 'read'), [['read', 'user:home:skills/alpha']]);
  assert.equal(byClass(renderer, 'dshsk-viewer').length, 1);
  assert.equal(renderer.root.findAll((node) => node.type === 'textarea').length, 0, 'nothing to type into');
  const labels = renderer.root.findAll((node) => node.type === 'button').map((node) => textOf(node));
  assert.ok(!labels.includes('Save'), 'a read-only view cannot save');
  assert.ok(labels.includes('Close'));
  assert.ok(labels.includes('Edit'), 'an editable skill offers the way into the editor');

  const content = byClass(renderer, 'dshsk-content')[0];
  assert.match(textOf(content), /# Alpha/);
  assert.match(textOf(renderer.root), /Read-only/);

  // Close goes back to the list and nothing was written.
  await act(async () => findByText(renderer, 'button', 'Close').props.onClick());
  assert.equal(byClass(renderer, 'dshsk-viewer').length, 0);
  assert.equal(calls.some(([name]) => name === 'save'), false);
});

test('the viewer of a read-only skill has no Edit, and shows the read-only badge', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const rows = rowsOf(renderer);
  const packagedToggle = rows[2].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => packagedToggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'View').props.onClick());

  const labels = renderer.root.findAll((node) => node.type === 'button').map((node) => textOf(node));
  assert.deepEqual(labels, ['Close'], 'only Close: no edit, no save');
  assert.match(textOf(renderer.root), /Read-only/);
  assert.equal(byClass(renderer, 'dshsk-viewer').length, 1);
});

test('a virtual skill shows the content the provider returned', async () => {
  const reads = [];
  const { client } = stubClient({
    read: async (id) => {
      reads.push(id);
      return {
        dir: id,
        fileName: null,
        content: '# Agent profile\n\npreset text\n',
        mtimeMs: 0,
        status: 'virtual',
        readOnly: true,
      };
    },
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const rows = rowsOf(renderer);
  const virtualToggle = rows[3].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => virtualToggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'View').props.onClick());

  assert.deepEqual(reads, ['virtual:agent-profile-p-1']);
  assert.match(textOf(byClass(renderer, 'dshsk-content')[0]), /preset text/);
  assert.deepEqual(
    renderer.root.findAll((node) => node.type === 'button').map((node) => textOf(node)),
    ['Close'],
  );
});

test('empty content says so instead of showing a blank page', async () => {
  const { client } = stubClient({
    read: async (id) => ({ dir: id, fileName: null, content: '', mtimeMs: 0, status: 'virtual', readOnly: true }),
  });
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const virtualToggle = rowsOf(renderer)[3].find(
    (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
  );
  await act(async () => virtualToggle.props.onClick());
  await act(async () => findByText(renderer, 'button', 'View').props.onClick());
  assert.match(textOf(byClass(renderer, 'dshsk-contentEmpty')[0]), /Content is not available for this skill/);
});

test('View is the first item in all three sections', async () => {
  const { client } = stubClient();
  const renderer = await render(h(SkillsPage, { t: translate, client }));
  const rows = rowsOf(renderer);
  for (const index of [0, 2, 3]) {
    const toggle = rows[index].find(
      (node) => node.type === 'button' && node.props['aria-haspopup'] === 'menu',
    );
    await act(async () => toggle.props.onClick());
    const menu = renderer.root.find((node) => node.props.role === 'menu');
    const first = menu.children.find((child) => child && typeof child === 'object');
    assert.equal(textOf(first), 'View', `row ${index} starts with View`);
    await act(async () => toggle.props.onClick());
  }
});

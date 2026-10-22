/**
 * Browser half of the Skills page.
 *
 * Two slot contributions and nothing else: the sidebar row (`sidebar.panellist`,
 * whose `id` doubles as the main-panel key) and the panel itself (`main`, the
 * keyed slot the frame renders for the selected id). `ctx.layout.selectPanel` is
 * what the shell's own sidebar rows call, and the row here goes through the same
 * metadata source, so the page behaves like a built-in one — a main panel, not a
 * dialog and not a route in the address bar.
 *
 * @module @dr-co/dsh-skills/client
 */
import * as React from 'react';

import { en, NS, ru } from './locales.js';
import { SkillsPage } from './page.js';
import { installStyles } from './styles.js';

const h = React.createElement;

/** Client plugin name. */
export const name = 'dsh-skills';

/** Required services: the slot registry, the dictionaries, and the panel selector. */
export const inject = ['slots', 'locale', 'layout'];

/** Sidebar row id and main-panel key — the same value, as the sidebar resolves one by the other. */
export const PANEL_ID = 'dsh-skills';

/** Russian language definition, kept in one place so the tests can read it. */
export const RUSSIAN_LANGUAGE = Object.freeze({ id: 'ru', label: 'Русский', fallback: 'en' });

/**
 * Sidebar glyph: a page with a fold and a sparkle.
 * @param props - `size` from the shell and whether the panel is selected.
 * @returns the inline SVG.
 */
export function SkillsPanelIcon({ size = 16, active = false }) {
  return h(
    'svg',
    {
      className: 'dshsk-icon',
      'aria-hidden': 'true',
      focusable: 'false',
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: active ? 1.4 : 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'M3.5 1.8h5.2l3.3 3.3v6.1a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2V3.8a2 2 0 0 1 2-2z' }),
    h('path', { d: 'M8.5 1.9v3.4h3.4' }),
    h('path', { d: 'M12.9 10.2l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z' }),
  );
}

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
  ctx.effect(() => installStyles(), 'dsh-skills: styles');
  ctx.effect(() => ctx.locale.register(NS, 'en', en), 'dsh-skills: en dictionary');
  ctx.effect(() => ctx.locale.addLanguage(RUSSIAN_LANGUAGE), 'dsh-skills: ru language');
  ctx.effect(() => ctx.locale.register(NS, 'ru', ru), 'dsh-skills: ru dictionary');

  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, SkillsPage),
  );

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        label: () => ctx.locale.bind(NS)('panel'),
        locale: NS,
      },
      SkillsPanelIcon,
    ),
  );
}

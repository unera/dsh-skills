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
 * Sidebar glyph: a person — head and shoulders — with a cogwheel beside the head.
 *
 * Drawn at 24×24 with a 1.75 stroke and round joins so it survives being rendered
 * at 16px in the rail, `fill="none"` and `stroke="currentColor"` so the row's
 * active and inactive colours come from the shell rather than from the icon.
 * @param props.size - edge length the shell asks for, in pixels.
 * @param props.active - whether this panel is the selected one.
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
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.75,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'data-active': active ? 'true' : 'false',
    },
    // Head and shoulders.
    h('circle', { cx: 9.5, cy: 8.5, r: 3.3 }),
    h('path', { d: 'M3.6 20.4c0-3.2 2.6-5.7 5.9-5.7s5.9 2.5 5.9 5.7' }),
    // Cogwheel beside the head: rim, hub and four teeth.
    h('circle', { cx: 18.2, cy: 7, r: 2.1 }),
    h('path', { d: 'M18.2 2.9v1.6M18.2 9.5v1.6M14.1 7h1.6M20.7 7H22.3' }),
  );
}

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
  ctx.effect(() => installStyles(), 'dsh-skills: styles');
  ctx.effect(() => ctx.locale.register(NS, 'en', en), 'dsh-skills: en dictionary');
  // Another plugin may have registered `ru` first; the registry throws on a duplicate
  // id, and that must not take this plugin down — its own dictionary still registers.
  ctx.effect(() => {
    try {
      return ctx.locale.addLanguage(RUSSIAN_LANGUAGE);
    } catch (error) {
      if (!/already/i.test(String(error?.message ?? error))) throw error;
      return () => {};
    }
  }, 'dsh-skills: ru language');
  ctx.effect(() => ctx.locale.register(NS, 'ru', ru), 'dsh-skills: ru dictionary');

  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, SkillsPage));

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

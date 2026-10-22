/**
 * Page styles.
 *
 * One `<style>` element per document, tagged the way the harness tags plugin
 * CSS (`data-plugin` / `data-plugin-css`), so unloading the plugin can remove
 * exactly its own sheet.
 *
 * Colors come from the shell's own alias tokens wherever a token exists — the
 * success and idle families already mean "on" and "off" and already follow the
 * theme, so our skills use them and match the rest of the interface for free.
 * Pink, which is what marks a skill bundled inside a package, is not in the
 * token set, so it is defined here as `--dshsk-plugin-accent` /
 * `--dshsk-plugin-accent-muted`, once per palette.
 *
 * The palette is selected by `body[data-ds-dark-theme]`, which is exactly what
 * the shell's theme presenter writes when it applies a snapshot (see
 * ThemePresenter in dsh-client-ui-layout: body attribute for the palette, root
 * `color-scheme` for the browser chrome). A `prefers-color-scheme` query would be
 * the wrong hook here — the resolved scheme follows the user's setting, not the
 * operating system, so a media query would disagree with the app on "system"
 * dark and on every registered theme.
 */

/** Style element id used for the de-duplication check. */
export const STYLE_ID = 'dsh-skills';

/** Package name stamped on the style element. */
export const PLUGIN_ID = '@dr-co/dsh-skills';

/** Pink accents per palette, with the contrast each one was chosen for. */
export const ACCENTS = Object.freeze({
  light: Object.freeze({
    background: '#ffffff',
    accent: '#c2185b',
    accentMuted: '#8d5f72',
  }),
  dark: Object.freeze({
    background: '#232324',
    accent: '#f472b6',
    accentMuted: '#c98ba6',
  }),
});

const CSS = String.raw`
/* Pink accents, per palette. Light: 5.87:1 and 5.23:1 on #ffffff.
   Dark: 5.93:1 and 5.78:1 on #232324 — both above the 4.5:1 text bar and well
   above the 3:1 bar for the dot, and above the shell's own green on white. */
body {
  --dshsk-plugin-accent: #c2185b;
  --dshsk-plugin-accent-muted: #8d5f72;
}
body[data-ds-dark-theme] {
  --dshsk-plugin-accent: #f472b6;
  --dshsk-plugin-accent-muted: #c98ba6;
}

.dshsk-page { box-sizing: border-box; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: auto; padding: 24px clamp(16px, 4vw, 48px) 32px; color: var(--dsw-alias-label-primary, #1f2329); background: var(--dsw-alias-bg-layer-1, #fff); }
.dshsk-page * { box-sizing: border-box; }
.dshsk-inner { width: 100%; max-width: 1120px; margin: 0 auto; }
.dshsk-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.dshsk-headText { min-width: 0; flex: 1; }
.dshsk-title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; }
.dshsk-subtitle { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-headActions { display: flex; align-items: center; gap: 8px; flex: none; }
.dshsk-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 32px; padding: 5px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; color: var(--dsw-alias-label-primary, #1f2329); background: var(--dsw-alias-bg-layer-1, #fff); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.dshsk-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); }
.dshsk-button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: 2px; }
.dshsk-button:disabled { opacity: .55; cursor: default; }
.dshsk-button[data-variant="primary"] { border-color: var(--dsw-alias-state-business-primary, #3370ff); color: #fff; background: var(--dsw-alias-state-business-primary, #3370ff); }
.dshsk-button[data-variant="primary"]:hover:not(:disabled) { filter: brightness(1.06); }

.dshsk-section { margin: 0 0 22px; }
.dshsk-sectionTitle { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 13px; line-height: 20px; font-weight: 600; }
.dshsk-sectionName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-sectionCount { flex: none; padding: 0 6px; border-radius: 9px; color: var(--dsw-alias-label-secondary, #646a73); background: var(--dsw-alias-bg-layer-2, #f5f6f7); font-size: 11px; line-height: 18px; font-weight: 500; }
.dshsk-section[data-section="plugin"] .dshsk-sectionName,
.dshsk-section[data-section="virtual"] .dshsk-sectionName { color: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-sectionEmpty { margin: 0; padding: 14px 12px; border: 1px dashed var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; color: var(--dsw-alias-label-tertiary, #8f959e); font-size: 12px; line-height: 18px; }
.dshsk-list { width: 100%; border-top: 1px solid var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-listHead, .dshsk-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dshsk-listHead { padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #dfe1e5); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; font-weight: 500; }
.dshsk-row { padding: 9px 0; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-headCell, .dshsk-row > [role="cell"] { min-width: 0; }
.dshsk-statusCell { flex: 0 0 auto; display: flex; align-items: center; width: 14px; }
.dshsk-statusDot { display: block; flex: 0 0 auto; width: 11px; height: 11px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary, #d4d4d4); }
.dshsk-statusDot[data-origin="user"][data-status="active"] { background: var(--dsw-alias-state-success-primary, #2ea121); }
.dshsk-statusDot[data-origin="user"][data-status="disabled"] { background: var(--dsw-alias-state-idle-primary, #d4d4d4); }
.dshsk-statusDot[data-origin="plugin"][data-status="active"] { background: var(--dshsk-plugin-accent, #c2185b); }
.dshsk-statusDot[data-origin="plugin"][data-status="disabled"] { background: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-statusDot[data-status="conflict"] { background: var(--dsw-alias-state-error-primary, #c53030); }
.dshsk-statusDot[data-status="virtual"] { background: transparent; box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-tertiary, #8f959e); }
.dshsk-nameCell { flex: 1 1 auto; min-width: 0; overflow: hidden; }
.dshsk-nameLine { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.dshsk-origin { flex: none; padding: 0 5px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 4px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 10px; line-height: 15px; letter-spacing: .02em; text-transform: uppercase; }
.dshsk-origin[data-origin="plugin"] { border-color: var(--dshsk-plugin-accent-muted, #8d5f72); color: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-name { min-width: 0; overflow: hidden; font-weight: 500; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-name[data-origin="plugin"] { color: var(--dshsk-plugin-accent, #c2185b); }
.dshsk-name[data-origin="plugin"][data-status="disabled"] { color: var(--dshsk-plugin-accent-muted, #8d5f72); }
.dshsk-name[data-origin="virtual"] { color: var(--dsw-alias-label-secondary, #646a73); }
.dshsk-nameMeta { margin-top: 1px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-pathCell { flex: 0 0 auto; max-width: 148px; }
.dshsk-path { display: block; max-width: 100%; overflow: hidden; color: var(--dsw-alias-label-secondary, #646a73); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-actionsCell { position: relative; flex: 0 0 auto; display: inline-flex; justify-content: flex-end; }
.dshsk-listHead .dshsk-actionsCell { text-align: right; }
.dshsk-rowActions { position: relative; display: inline-flex; justify-content: flex-end; }
.dshsk-more { width: 28px; min-height: 28px; padding: 0; font-size: 16px; line-height: 1; }

/* Split control: two buttons in one bordered capsule, divided by a hairline —
   the shape of a single button that also opens the rest of the menu. */
.dshsk-splitActions { position: relative; display: inline-flex; align-items: stretch; height: 28px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-1, #fff); overflow: visible; }
.dshsk-splitPrimary, .dshsk-splitToggle { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #646a73); cursor: pointer; }
.dshsk-splitPrimary { width: 32px; border-right: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px 0 0 8px; }
.dshsk-splitToggle { width: 22px; border-radius: 0 8px 8px 0; }
.dshsk-splitPrimary:hover, .dshsk-splitToggle:hover, .dshsk-splitToggle[aria-expanded="true"] { color: var(--dsw-alias-state-business-primary, #3370ff); background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); }
.dshsk-splitPrimary:focus-visible, .dshsk-splitToggle:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: -2px; }
.dshsk-splitPrimary:disabled, .dshsk-splitToggle:disabled { opacity: .55; cursor: default; }

.dshsk-rename { position: absolute; top: calc(100% + 4px); right: 0; z-index: 40; width: min(260px, calc(100vw - 24px)); padding: 10px 12px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 16%); }
.dshsk-renameLabel { display: block; margin-bottom: 6px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 17px; }
.dshsk-renameInput { width: 100%; min-height: 30px; padding: 5px 8px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 6px; color: var(--dsw-alias-label-primary, #1f2329); background: var(--dsw-alias-bg-layer-1, #fff); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 18px; }
.dshsk-renameInput:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: 1px; }
.dshsk-renameHint { margin: 6px 0 0; color: var(--dsw-alias-label-tertiary, #8f959e); font-size: 11px; line-height: 16px; }
.dshsk-renameError { margin: 6px 0 0; color: var(--dsw-alias-state-danger-primary, #c53030); font-size: 11px; line-height: 16px; }
.dshsk-renameActions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.dshsk-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 30; min-width: 190px; max-width: min(240px, calc(100vw - 24px)); padding: 4px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 14%); }
.dshsk-menu button { display: block; width: 100%; padding: 7px 10px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.dshsk-menu button:hover, .dshsk-menu button:focus-visible { background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); outline: none; }
.dshsk-menuSeparator { height: 1px; margin: 4px 6px; background: var(--dsw-alias-border-l1, #eef0f2); }
.dshsk-note { margin: 14px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-notice { margin: 0 0 14px; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-notice[data-tone="error"] { border-color: var(--dsw-alias-state-danger-primary, #c53030); color: var(--dsw-alias-state-danger-primary, #c53030); background: transparent; }
.dshsk-notice[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary, #d97706); color: var(--dsw-alias-state-warn-primary, #d97706); background: transparent; }
.dshsk-empty { padding: 48px 24px; border: 1px dashed var(--dsw-alias-border-l2, #dfe1e5); border-radius: 12px; text-align: center; }
.dshsk-emptyTitle { margin: 0 0 6px; font-size: 15px; font-weight: 600; }
.dshsk-emptyBody { margin: 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-loading { padding: 40px 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; }
.dshsk-icon { display: block; flex: none; }

/* Editor: one pane, the whole panel. No preview anywhere. */
.dshsk-page[data-mode="editor"] { overflow: hidden; }
.dshsk-innerEditor { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.dshsk-editor { display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 0; }
.dshsk-editorHead { display: flex; align-items: flex-start; gap: 12px; }
.dshsk-editorTitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.dshsk-editorMeta { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-pane { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1, #fff); }
.dshsk-paneHead { padding: 7px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshsk-textarea { flex: 1 1 auto; width: 100%; min-height: 0; padding: 12px 14px; border: 0; outline: none; resize: none; color: var(--dsw-alias-label-primary, #1f2329); background: transparent; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 20px; tab-size: 2; }
.dshsk-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 2px; }
.dshsk-paneContent { flex: 1 1 auto; }
.dshsk-content { flex: 1 1 auto; margin: 0; padding: 12px 14px; overflow: auto; color: var(--dsw-alias-label-primary, #1f2329); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 20px; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2; }
.dshsk-content:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #3370ff); outline-offset: -2px; }
.dshsk-contentEmpty { color: var(--dsw-alias-label-tertiary, #8f959e); font-style: italic; }
.dshsk-readOnly { padding: 0 6px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 4px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 11px; line-height: 16px; text-transform: uppercase; letter-spacing: .02em; }
.dshsk-viewerPath { overflow-wrap: anywhere; }
.dshsk-srOnly { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

@media (max-width: 640px) {
  .dshsk-page { padding: 16px 12px 24px; }
  .dshsk-head { flex-wrap: wrap; gap: 10px; }
  .dshsk-headActions { margin-left: auto; }
  .dshsk-row, .dshsk-listHead { gap: 8px; }
  /* The compact layout does not render this cell at all; this rule is only a
     backstop for a viewport that changed without the listener firing. */
  .dshsk-pathCell { display: none; }
  .dshsk-menu { min-width: 168px; }
}
@media (prefers-reduced-motion: reduce) { .dshsk-page * { transition: none !important; animation: none !important; } }
`;

/**
 * Install the stylesheet once per document.
 * @returns a disposer removing the element this call created.
 */
export function installStyles() {
  if (typeof document === 'undefined' || document.head === null) return () => {};
  const existing = document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`);
  if (existing !== null) return () => {};
  const element = document.createElement('style');
  element.dataset.plugin = PLUGIN_ID;
  element.dataset.pluginCss = STYLE_ID;
  element.textContent = CSS;
  document.head.appendChild(element);
  return () => element.remove();
}

export { CSS };

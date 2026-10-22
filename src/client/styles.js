/**
 * Page styles.
 *
 * One `<style>` element per document, tagged the way the harness tags plugin
 * CSS (`data-plugin` / `data-plugin-css`), so unloading the plugin can remove
 * exactly its own sheet. Colors are the shell's own alias variables with plain
 * fallbacks, which is what keeps the page readable in both themes without
 * shipping two palettes.
 */

/** Style element id used for the de-duplication check. */
export const STYLE_ID = 'dsh-skills';

/** Package name stamped on the style element. */
export const PLUGIN_ID = '@dr-co/dsh-skills';

const CSS = String.raw`
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
.dshsk-table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 20px; }
.dshsk-table th { padding: 8px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2, #dfe1e5); color: var(--dsw-alias-label-secondary, #646a73); font-weight: 500; text-align: left; white-space: nowrap; }
.dshsk-table th:first-child, .dshsk-table td:first-child { padding-left: 0; }
.dshsk-table th:last-child, .dshsk-table td:last-child { padding-right: 0; text-align: right; }
.dshsk-table td { padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); vertical-align: top; }
.dshsk-statusChip { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.dshsk-statusDot { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-label-tertiary, #8f959e); flex: none; }
.dshsk-statusChip[data-status="active"] .dshsk-statusDot { background: var(--dsw-alias-state-success-primary, #2ea121); }
.dshsk-statusChip[data-status="active"] { color: var(--dsw-alias-state-success-primary, #2ea121); }
.dshsk-name { font-weight: 500; overflow-wrap: anywhere; }
.dshsk-nameMeta { margin-top: 2px; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 17px; overflow-wrap: anywhere; }
.dshsk-path { display: inline-block; max-width: 100%; color: var(--dsw-alias-label-secondary, #646a73); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dshsk-rowActions { position: relative; display: inline-flex; }
.dshsk-more { width: 28px; min-height: 28px; padding: 0; font-size: 16px; line-height: 1; }
.dshsk-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 30; min-width: 200px; padding: 4px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-3, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / 14%); }
.dshsk-menu button { display: block; width: 100%; padding: 7px 10px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.dshsk-menu button:hover, .dshsk-menu button:focus-visible { background: var(--dsw-alias-interactive-bg-hover, #f5f6f7); outline: none; }
.dshsk-note { margin: 14px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-notice { margin: 0 0 14px; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-notice[data-tone="error"] { border-color: var(--dsw-alias-state-danger-primary, #c53030); color: var(--dsw-alias-state-danger-primary, #c53030); background: transparent; }
.dshsk-notice[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary, #d97706); color: var(--dsw-alias-state-warn-primary, #d97706); background: transparent; }
.dshsk-empty { padding: 48px 24px; border: 1px dashed var(--dsw-alias-border-l2, #dfe1e5); border-radius: 12px; text-align: center; }
.dshsk-emptyTitle { margin: 0 0 6px; font-size: 15px; font-weight: 600; }
.dshsk-emptyBody { margin: 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dshsk-editor { display: flex; flex-direction: column; gap: 14px; min-height: 0; flex: 1; }
.dshsk-editorHead { display: flex; align-items: flex-start; gap: 12px; }
.dshsk-editorTitle { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.dshsk-editorMeta { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; }
.dshsk-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: stretch; min-height: 420px; }
@media (max-width: 900px) { .dshsk-split { grid-template-columns: minmax(0, 1fr); } }
.dshsk-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1, #fff); }
.dshsk-paneHead { padding: 7px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, #eef0f2); color: var(--dsw-alias-label-secondary, #646a73); font-size: 12px; line-height: 18px; background: var(--dsw-alias-bg-layer-2, #f7f8fa); }
.dshsk-textarea { flex: 1; min-height: 380px; padding: 12px 14px; border: 0; outline: none; resize: vertical; color: var(--dsw-alias-label-primary, #1f2329); background: transparent; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 20px; tab-size: 2; }
.dshsk-preview { flex: 1; min-height: 380px; max-height: 60vh; overflow: auto; padding: 4px 16px 16px; font-size: 13px; line-height: 1.65; }
.dshsk-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.dshsk-md > *:first-child { margin-top: 8px; }
.dshsk-heading { margin: 16px 0 8px; line-height: 1.35; }
.dshsk-md h3.dshsk-heading { font-size: 17px; }
.dshsk-md h4.dshsk-heading { font-size: 15px; }
.dshsk-md h5.dshsk-heading, .dshsk-md h6.dshsk-heading { font-size: 13px; }
.dshsk-p { margin: 8px 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.dshsk-list { margin: 8px 0; padding-left: 22px; }
.dshsk-list li { margin: 3px 0; overflow-wrap: anywhere; }
.dshsk-quote { margin: 10px 0; padding: 2px 12px; border-left: 3px solid var(--dsw-alias-border-l3, #d0d3d6); color: var(--dsw-alias-label-secondary, #646a73); }
.dshsk-code { padding: 1px 5px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2, #f2f3f5); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
.dshsk-pre { margin: 10px 0; padding: 10px 12px; overflow: auto; border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f2f3f5); }
.dshsk-fence { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 19px; white-space: pre; }
.dshsk-hr { margin: 16px 0; border: 0; border-top: 1px solid var(--dsw-alias-border-l2, #dfe1e5); }
.dshsk-tableWrap { overflow-x: auto; margin: 10px 0; }
.dshsk-md table.dshsk-table { width: auto; min-width: 50%; font-size: 12px; }
.dshsk-md table.dshsk-table th, .dshsk-md table.dshsk-table td { padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l2, #dfe1e5); text-align: left; }
.dshsk-md a { color: var(--dsw-alias-state-business-primary, #3370ff); text-decoration: none; }
.dshsk-md a:hover { text-decoration: underline; }
.dshsk-mdEmpty { color: var(--dsw-alias-label-tertiary, #8f959e); font-style: italic; padding: 12px 0; }
.dshsk-loading { padding: 40px 0; color: var(--dsw-alias-label-secondary, #646a73); font-size: 13px; }
.dshsk-icon { display: block; flex: none; }
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

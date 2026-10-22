/**
 * The per-row action control.
 *
 * Two shapes, one menu. On a wide screen a row with an editor gets a split
 * control: the left half is the pencil that opens the editor — the action people
 * reach for most — and the right half is a chevron that opens everything else.
 * Where there is no editor (a packaged skill, or a narrow screen) there is a
 * single `⋯` button; on a phone that is the same button as before, with Edit
 * first in the menu.
 *
 * The split is built from two plain `<button>` elements in one bordered
 * container: the harness' primitives package has no split-button or button-group
 * component (only `Button`, a value `SegmentedControl`, and menu surfaces), and a
 * composite of our own keeps the single visual control without bending a
 * dependency whose shape does not fit.
 */
import * as React from 'react';

const h = React.createElement;

/** Separator placeholder inside the item list. */
export const SEPARATOR = Object.freeze({ separator: true });

/**
 * Pencil glyph for the split's primary half.
 * @returns the inline SVG.
 */
function PencilIcon() {
  return h(
    'svg',
    {
      className: 'dshsk-icon',
      'aria-hidden': 'true',
      focusable: 'false',
      width: 14,
      height: 14,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'M11.1 2.4a1.6 1.6 0 0 1 2.3 2.3l-7.2 7.2-3 .8.8-3z' }),
    h('path', { d: 'M10 3.5 12.3 5.8' }),
  );
}

/**
 * Chevron glyph for the split's menu half.
 * @returns the inline SVG.
 */
function ChevronIcon() {
  return h(
    'svg',
    {
      className: 'dshsk-icon',
      'aria-hidden': 'true',
      focusable: 'false',
      width: 12,
      height: 12,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'M4 6.5 8 10.5 12 6.5' }),
  );
}

/**
 * Render the row's action control.
 * @param props.label - accessible name of the menu button.
 * @param props.moreLabel - tooltip of the menu button.
 * @param props.editLabel - accessible name of the split's primary half.
 * @param props.items - menu entries, with {@link SEPARATOR} between groups.
 * @param props.split - whether to render the pencil half.
 * @param props.onEdit - invoked by the pencil half.
 * @param props.disabled - locks both halves.
 * @returns the control and, while open, the menu.
 */
export function RowActions({ label, moreLabel, editLabel, items, split = false, onEdit, disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const container = React.useRef(null);

  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const onPointerDown = (event) => {
      const node = container.current;
      if (node !== null && event.target instanceof Node && node.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (item) => {
    setOpen(false);
    item.onSelect();
  };

  const toggle = h(
    'button',
    {
      type: 'button',
      className: split ? 'dshsk-splitToggle' : 'dshsk-button dshsk-more',
      'aria-haspopup': 'menu',
      'aria-expanded': open ? 'true' : 'false',
      'aria-label': label,
      title: moreLabel,
      disabled,
      onClick: () => setOpen((value) => !value),
    },
    split ? h(ChevronIcon) : '⋯',
  );

  return h(
    'div',
    { className: split ? 'dshsk-splitActions' : 'dshsk-rowActions', ref: container },
    split
      ? h(
          'button',
          {
            type: 'button',
            className: 'dshsk-splitPrimary',
            'aria-label': editLabel,
            title: editLabel,
            disabled,
            onClick: () => onEdit(),
          },
          h(PencilIcon),
        )
      : null,
    toggle,
    open
      ? h(
          'div',
          { className: 'dshsk-menu', role: 'menu', 'aria-label': label },
          items.map((item, index) =>
            item === SEPARATOR || item.separator === true
              ? h('div', { key: `sep-${index}`, className: 'dshsk-menuSeparator', role: 'separator' })
              : h(
                  'button',
                  {
                    key: item.id,
                    type: 'button',
                    role: 'menuitem',
                    title: item.hint,
                    onClick: () => choose(item),
                  },
                  item.label,
                ),
          ),
        )
      : null,
  );
}

export default RowActions;

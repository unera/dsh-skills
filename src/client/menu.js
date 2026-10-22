/**
 * The row action menu: a `⋯` button opening a dropdown of the four row actions.
 *
 * It is deliberately not a modal and not a native `<details>`: the shell's own
 * tables use a popup anchored to the row, and the tests drive it through its
 * accessible names (`aria-haspopup`, `role="menu"`), which a details element
 * would not give them.
 */
import * as React from 'react';

const h = React.createElement;

/**
 * One anchored dropdown.
 * @param props - see {@link ActionsMenu}.
 * @returns the button plus, while open, the menu.
 */
export function ActionsMenu({ label, items, moreLabel = 'More actions', disabled = false }) {
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

  return h(
    'div',
    { className: 'dshsk-rowActions', ref: container },
    h(
      'button',
      {
        type: 'button',
        className: 'dshsk-button dshsk-more',
        'aria-haspopup': 'menu',
        'aria-expanded': open ? 'true' : 'false',
        'aria-label': label,
        title: moreLabel,
        disabled,
        onClick: () => setOpen((value) => !value),
      },
      '⋯',
    ),
    open
      ? h(
          'div',
          { className: 'dshsk-menu', role: 'menu', 'aria-label': label },
          items.map((item) =>
            h(
              'button',
              {
                key: item.id,
                type: 'button',
                role: 'menuitem',
                onClick: () => choose(item),
              },
              item.label,
            ),
          ),
        )
      : null,
  );
}

export default ActionsMenu;

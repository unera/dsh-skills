/**
 * Viewport helper for the row layout.
 *
 * The Skills list shows the path column only when there is room for it. That is
 * a rendering decision, not a hiding one: on a phone the path cell is not
 * rendered at all, so it cannot stretch the row, and the full path survives in
 * the row's `aria-label` and the actions tooltip. CSS media queries cannot be
 * asserted by the component tests, so the width is read here and can be
 * overridden through the media object the hook accepts.
 */
import * as React from 'react';

/** Width at or below which the row drops to the compact layout. */
export const NARROW_MAX_WIDTH = 640;

/**
 * Subscribe to a `(max-width: Npx)` media query.
 * @param maxWidth - breakpoint in CSS pixels.
 * @param media - media-query provider, `window.matchMedia` by default; absent in
 *   a non-browser environment, which reports "wide".
 * @returns whether the viewport is narrow right now.
 */
export function useNarrowViewport(maxWidth = NARROW_MAX_WIDTH, media = undefined) {
  const query = `(max-width: ${maxWidth}px)`;
  const provider =
    media ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window : undefined);

  const read = () => {
    if (provider === undefined) return false;
    try {
      return provider.matchMedia(query).matches === true;
    } catch {
      return false;
    }
  };

  const [narrow, setNarrow] = React.useState(read);

  React.useEffect(() => {
    if (provider === undefined || typeof provider.matchMedia !== 'function') return undefined;
    const list = provider.matchMedia(query);
    const update = () => setNarrow(list.matches === true);
    update();
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', update);
      return () => list.removeEventListener('change', update);
    }
    if (typeof list.addListener === 'function') {
      list.addListener(update);
      return () => list.removeListener(update);
    }
    return undefined;
  }, [provider, query]);

  return narrow;
}

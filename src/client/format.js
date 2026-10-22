/**
 * Small pure helpers shared by the page components: display names and the
 * middle truncation the path column uses.
 */

/**
 * Truncate in the middle, keeping both ends readable.
 *
 * Paths matter at both ends (`interesting-youtube/SKILL.md`), so the middle is
 * what goes. The result never exceeds `limit` characters including the ellipsis.
 * @param value - text to shorten.
 * @param limit - maximum length; values at or below it are returned unchanged.
 * @returns the shortened text.
 */
export function truncateMiddle(value, limit = 48) {
  const text = String(value ?? '');
  if (limit < 5 || text.length <= limit) return text;
  const kept = limit - 1;
  const head = Math.ceil(kept / 2);
  const tail = kept - head;
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`;
}

/**
 * The name a row shows: frontmatter `name`, else the directory name.
 * @param skill - one row of the list.
 * @returns the display name.
 */
export function displayName(skill) {
  const name = typeof skill?.name === 'string' ? skill.name.trim() : '';
  return name !== '' ? name : String(skill?.dir ?? '');
}

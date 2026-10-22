/**
 * Small pure helpers shared by the page components: display names and the
 * middle truncation the path column uses.
 */

/** Longest path shown in full; anything longer is cut in the middle. */
export const PATH_BUDGET = 15;

/** Characters kept at each end of a cut path. */
export const PATH_EDGE = 7;

/** The separator written between the two ends; three dots, not `…`. */
const PATH_MARK = '...';

/**
 * Shorten a path by keeping a fixed number of characters at each end.
 *
 * The rule is deliberately not "half of the budget on each side": a path of 16
 * characters keeps its first 7 and its last 7 around a literal `...`, which
 * makes the result 17 characters long — the two ends are what stay readable
 * (`split/pa...subpath/foo`), and the middle is what goes. A path that already
 * fits in {@link PATH_BUDGET} is returned untouched, without any mark.
 * @param value - the path to shorten.
 * @param options - `budget` (15) and `edge` (7) for tests and callers that need
 *   a different cut.
 * @returns the text to render.
 */
export function truncatePath(value, { budget = PATH_BUDGET, edge = PATH_EDGE } = {}) {
  const text = String(value ?? '');
  if (!Number.isInteger(edge) || edge < 0) throw new RangeError('edge must be a non-negative integer');
  if (text.length <= budget) return text;
  if (text.length <= edge * 2) return text;
  return `${text.slice(0, edge)}${PATH_MARK}${text.slice(text.length - edge)}`;
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

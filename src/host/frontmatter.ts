/**
 * YAML frontmatter reader for `SKILL.md`.
 *
 * The harness' own skill loader reads the frontmatter with a full YAML parser,
 * but a DSH plugin ships no parser and the browser half must not gain one
 * either. Skill frontmatter is a flat mapping of three well-known keys, so this
 * module implements exactly that subset: `key: value` pairs, single- and
 * double-quoted scalars, literal (`|`) and folded (`>`) block scalars, and
 * comments. Anything else is ignored rather than guessed at, and a file without
 * frontmatter keeps its whole text as the body.
 */

/** Parsed frontmatter: the flat key/value map plus the markdown body after it. */
export interface Frontmatter {
  /** Flat string values; nested structures are not represented and are skipped. */
  readonly data: Readonly<Record<string, string>>;
  /** Everything after the closing `---` line, verbatim (line endings preserved). */
  readonly body: string;
  /** Whether a leading `---` fence was found and closed. */
  readonly hasFrontmatter: boolean;
}

const FENCE = /^---[ \t]*$/;

/**
 * Strip one layer of YAML quoting from a scalar.
 * @param raw - value text as written after the colon.
 * @returns the decoded scalar.
 */
function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if (first === '"' && last === '"') {
      return value
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    if (first === "'" && last === "'") return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

/**
 * Drop a trailing `# comment` from an unquoted scalar. A `#` only starts a
 * comment when it follows whitespace, which is what YAML itself requires.
 * @param raw - scalar text.
 * @returns the scalar without its comment.
 */
function stripComment(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return raw;
  const match = /(^|\s)#/.exec(raw);
  return match ? raw.slice(0, match.index) : raw;
}

/**
 * Parse the frontmatter block of a skill file.
 * @param text - whole file contents, optionally starting with a byte-order mark.
 * @returns the map, the body, and whether frontmatter was present.
 */
export function parseFrontmatter(text: string): Frontmatter {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = source.split('\n');
  if (lines.length === 0 || !FENCE.test(lines[0].replace(/\r$/, ''))) {
    return { data: {}, body: source, hasFrontmatter: false };
  }
  let close = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (FENCE.test(lines[index].replace(/\r$/, ''))) {
      close = index;
      break;
    }
  }
  if (close === -1) return { data: {}, body: source, hasFrontmatter: false };

  const data: Record<string, string> = {};
  let current: string | undefined;
  let block: string[] | undefined;
  let blockStyle: 'literal' | 'folded' = 'literal';

  const flush = (): void => {
    if (current === undefined) return;
    if (block !== undefined) {
      data[current] = blockStyle === 'literal' ? block.join('\n') : block.join(' ').trim();
    }
    block = undefined;
  };

  for (let index = 1; index < close; index += 1) {
    const line = lines[index].replace(/\r$/, '');
    if (line.trim() === '') {
      if (block !== undefined) block.push('');
      continue;
    }
    const member = /^([A-Za-z0-9_-]+)[ \t]*:(.*)$/.exec(line);
    if (member) {
      flush();
      current = member[1];
      const rawValue = stripComment(member[2]);
      const marker = rawValue.trim();
      if (marker === '|' || marker === '|-') {
        blockStyle = 'literal';
        block = [];
        continue;
      }
      if (marker === '>' || marker === '>-') {
        blockStyle = 'folded';
        block = [];
        continue;
      }
      data[current] = unquote(rawValue);
      current = undefined;
      continue;
    }
    // An indented line continues the open block scalar; any other line is a
    // nested structure this subset does not model, so it is dropped.
    if (block !== undefined && /^\s/.test(line)) block.push(line.replace(/^ {2}/, ''));
  }
  flush();

  return { data, body: lines.slice(close + 1).join('\n'), hasFrontmatter: true };
}

/**
 * Read one frontmatter field as a trimmed, non-empty string.
 * @param fm - parsed frontmatter.
 * @param key - field name.
 * @returns the value, or undefined when absent or blank.
 */
export function frontmatterValue(fm: Frontmatter, key: string): string | undefined {
  const value = fm.data[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

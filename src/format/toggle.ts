/**
 * Toggle an inline wrap around text. If `text` already begins AND ends with
 * `marker` (and is long enough to contain two copies of it), strips the
 * marker; otherwise wraps. The length guard prevents `wrapInline("*", "**")`
 * from falsely unwrapping a single `*`.
 */
export function wrapInline(text: string, marker: string): string {
  if (
    text.startsWith(marker) &&
    text.endsWith(marker) &&
    text.length >= marker.length * 2
  ) {
    return text.slice(marker.length, text.length - marker.length);
  }
  return marker + text + marker;
}

/**
 * Toggle a triple-backtick fenced code block around text. Wraps with fences on
 * their own lines; unwraps if the input is already a single fenced block.
 */
export function wrapFenced(text: string): string {
  const FENCE = '```';
  const lines = text.split(/\r?\n/);
  const isFenced =
    lines.length >= 2 &&
    lines[0].startsWith(FENCE) &&
    lines[lines.length - 1].trim() === FENCE;
  if (isFenced) {
    return lines.slice(1, -1).join('\n');
  }
  return `${FENCE}\n${text}\n${FENCE}`;
}

/**
 * Toggle a line prefix (e.g. `"> "` for blockquote) on every non-empty line.
 * If every non-empty line already starts with the prefix, removes it;
 * otherwise prefixes every non-empty line. Empty lines are preserved as-is.
 */
export function wrapLinePrefix(text: string, prefix: string): string {
  const lines = text.split(/\r?\n/);
  const allPrefixed = lines.every((l) => l === '' || l.startsWith(prefix));

  if (allPrefixed) {
    return lines
      .map((l) => (l.startsWith(prefix) ? l.slice(prefix.length) : l))
      .join('\n');
  }
  return lines.map((l) => (l === '' ? l : prefix + l)).join('\n');
}

/**
 * Set the heading level of a line. `level === 0` removes the heading. If the
 * line is already at the target level, also removes the heading (toggle off).
 * Strips leading whitespace from the body when adding a heading.
 */
export function wrapHeading(line: string, level: number): string {
  const existing = line.match(/^(#{1,6})\s+(.*)$/);
  const body = existing ? existing[2] : line.replace(/^\s+/, '');
  const existingLevel = existing ? existing[1].length : 0;

  if (level === 0 || level === existingLevel) {
    return body;
  }
  return '#'.repeat(level) + ' ' + body;
}

/**
 * Adjust an existing heading by `delta` (negative = promote toward H1,
 * positive = demote toward H6). No-op on non-heading lines or if the
 * adjustment would push the level outside [1, 6].
 */
export function adjustHeading(line: string, delta: number): string {
  const m = line.match(/^(#{1,6})\s+(.*)$/);
  if (!m) return line;
  const newLevel = m[1].length + delta;
  if (newLevel < 1 || newLevel > 6) return line;
  return '#'.repeat(newLevel) + ' ' + m[2];
}

/**
 * Cycle a line through: plain → `- [ ] x` → `- [x] x` → `- [ ] x` → ... .
 * Preserves leading indentation. A bullet line without a checkbox (`- x`) is
 * promoted to an unchecked task (`- [ ] x`).
 */
const BULLET_RE = /^(\s*)([-*+])\s+/;

/**
 * Toggle a bullet list prefix on every non-empty line. If every non-empty
 * line is already bulleted (with `-`, `*`, or `+`), strips the prefix;
 * otherwise prepends `- ` to every non-empty line. Leading indentation is
 * preserved so nested lists round-trip cleanly.
 */
export function toggleBulletItem(text: string): string {
  const lines = text.split(/\r?\n/);
  const allBulleted = lines.every((l) => l === '' || BULLET_RE.test(l));

  if (allBulleted) {
    return lines.map((l) => l.replace(BULLET_RE, '$1')).join('\n');
  }
  return lines
    .map((l) => (l === '' ? l : l.replace(/^(\s*)/, '$1- ')))
    .join('\n');
}

const NUMBERED_RE = /^(\s*)\d+\.\s+/;

/**
 * Toggle a numbered list prefix on every non-empty line. If every non-empty
 * line is already numbered (`N. `), strips the prefix; otherwise prepends
 * sequential `1. `, `2. `, … starting at 1 (incrementing globally across
 * the selection, including indented lines).
 */
export function toggleNumberedItem(text: string): string {
  const lines = text.split(/\r?\n/);
  const allNumbered = lines.every((l) => l === '' || NUMBERED_RE.test(l));

  if (allNumbered) {
    return lines.map((l) => l.replace(NUMBERED_RE, '$1')).join('\n');
  }
  let n = 1;
  return lines
    .map((l) => {
      if (l === '') return l;
      const m = l.match(/^(\s*)(.*)$/);
      const indent = m ? m[1] : '';
      const body = m ? m[2] : l;
      return `${indent}${n++}. ${body}`;
    })
    .join('\n');
}

export function toggleTaskItem(line: string): string {
  const indentMatch = line.match(/^(\s*)(.*)$/);
  const indent = indentMatch ? indentMatch[1] : '';
  const body = indentMatch ? indentMatch[2] : line;

  const checked = body.match(/^-\s+\[x\]\s+(.*)$/i);
  if (checked) return `${indent}- [ ] ${checked[1]}`;

  const unchecked = body.match(/^-\s+\[ \]\s+(.*)$/);
  if (unchecked) return `${indent}- [x] ${unchecked[1]}`;

  const bullet = body.match(/^-\s+(.*)$/);
  const text = bullet ? bullet[1] : body;
  return `${indent}- [ ] ${text}`;
}

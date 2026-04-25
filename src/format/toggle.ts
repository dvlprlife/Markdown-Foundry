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

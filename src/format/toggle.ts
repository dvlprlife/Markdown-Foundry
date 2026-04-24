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

/**
 * Format a link/image destination for embedding in a Markdown `(...)` target.
 *
 * A destination containing whitespace or parentheses is not a valid CommonMark
 * inline-link target on its own, so it is wrapped in angle brackets (the
 * `<...>` destination form). Any literal `<` or `>` inside is backslash-escaped
 * so the wrapper stays balanced. Clean destinations are returned unchanged.
 */
export function formatLinkDestination(dest: string): string {
  if (!/[\s()]/.test(dest)) {return dest;}
  return '<' + dest.replace(/([<>])/g, '\\$1') + '>';
}

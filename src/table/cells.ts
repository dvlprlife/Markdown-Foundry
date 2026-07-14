import { visualWidth } from './formatter';

/**
 * Character offsets of a single cell's raw text — the span between its
 * delimiting pipes, padding included.
 */
export interface CellSpan {
  start: number;
  end: number;
}

/**
 * Raw-line cell primitives. These operate on the source text of a table row
 * and leave every byte outside the edited cell untouched, so table edits can
 * preserve the author's existing padding.
 *
 * Cell indexing matches `splitRow` in parser.ts and `computeCellRange` in
 * commands/navigate.ts: leading indent is skipped, a leading pipe is a
 * delimiter rather than a separator, escaped pipes (\|) are content, and a
 * row with no trailing pipe ends its last cell at the line's end.
 */
export function cellSpans(line: string): CellSpan[] {
  const start = firstNonSpace(line);
  const end = Math.max(lastNonSpaceEnd(line), start);

  let i = start;
  if (i < end && line[i] === '|') {
    i++;
  }

  const spans: CellSpan[] = [];
  let cellStart = i;
  while (i < end) {
    if (line[i] === '\\' && i + 1 < end && line[i + 1] === '|') {
      i += 2;
      continue;
    }
    if (line[i] === '|') {
      spans.push({ start: cellStart, end: i });
      cellStart = i + 1;
    }
    i++;
  }

  if (cellStart < end || line[end - 1] !== '|') {
    spans.push({ start: cellStart, end });
  }

  return spans;
}

/** Number of cells on the line. */
export function cellCount(line: string): number {
  return cellSpans(line).length;
}

/**
 * Insert a cell whose raw text is `text` at `index`. A ragged row shorter than
 * `index` is grown with copies of `text` rather than having the new cell land
 * in the wrong column.
 */
export function insertCell(line: string, index: number, text: string): string {
  const spans = cellSpans(line);

  if (index < spans.length) {
    const at = spans[index].start;
    // A row without a leading pipe (`a | b`) needs one, or the new first cell
    // reads as the row's opening delimiter and its content is lost.
    const opener = index === 0 && !hasLeadingPipe(line) ? '|' : '';
    return line.slice(0, at) + opener + text + '|' + line.slice(at);
  }

  if (spans.length === 0) {
    return line + '|' + text;
  }

  return appendCell(padCells(line, index, text), text);
}

/** Grow the line to `count` cells by appending cells of raw text `fill`. */
export function padCells(line: string, count: number, fill: string): string {
  let out = line;
  let grown = cellCount(out);
  while (grown < count) {
    out = appendCell(out, fill);
    const next = cellCount(out);
    if (next <= grown) {
      return out;
    }
    grown = next;
  }
  return out;
}

function appendCell(line: string, text: string): string {
  const spans = cellSpans(line);
  if (spans.length === 0) {
    return line + '|' + text;
  }
  // A row without a trailing pipe (`a | b`) needs one, or an appended blank
  // cell reads as trailing whitespace and is lost.
  const closer = hasClosingPipe(line, spans) ? '' : '|';
  const at = spans[spans.length - 1].end;
  return line.slice(0, at) + '|' + text + closer + line.slice(at);
}

/** Remove the cell at `index`, along with one of its delimiting pipes. */
export function removeCell(line: string, index: number): string {
  const spans = cellSpans(line);
  if (index < 0 || index >= spans.length) {
    return line;
  }

  if (spans.length === 1) {
    return keepIndent(line, line.slice(0, spans[0].start) + line.slice(spans[0].end));
  }

  if (index === spans.length - 1) {
    return line.slice(0, spans[index - 1].end) + line.slice(spans[index].end);
  }

  return keepIndent(
    line,
    line.slice(0, spans[index].start) + line.slice(spans[index + 1].start)
  );
}

/** Swap the raw text (padding included) of two cells. */
export function swapCells(line: string, a: number, b: number): string {
  if (a === b) {
    return line;
  }
  const spans = cellSpans(line);
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  if (low < 0 || high >= spans.length) {
    return line;
  }

  const first = spans[low];
  const second = spans[high];
  return keepIndent(
    line,
    line.slice(0, first.start) +
      line.slice(second.start, second.end) +
      line.slice(first.end, second.start) +
      line.slice(first.start, first.end) +
      line.slice(second.end)
  );
}

/**
 * Re-anchor a transformed line to the source's indent. On a row without a
 * leading pipe the first cell's span starts at the indent, so moving another
 * cell's padding into that slot would silently re-indent the whole table.
 */
function keepIndent(source: string, result: string): string {
  return source.slice(0, firstNonSpace(source)) + result.slice(firstNonSpace(result));
}

function hasLeadingPipe(line: string): boolean {
  return line[firstNonSpace(line)] === '|';
}

/**
 * Does a delimiter close the last cell? Sniffing the final character would
 * misread a row that legitimately ends in an escaped pipe (`| a | b \|`),
 * whose last cell runs to the end of the line with nothing closing it.
 */
function hasClosingPipe(line: string, spans: CellSpan[]): boolean {
  return spans.length > 0 && spans[spans.length - 1].end < lastNonSpaceEnd(line);
}

/**
 * Clone a row's pipe structure with every cell blanked, keeping each cell's
 * rendered width so the new row's pipes line up with the row it was cloned
 * from — however that row happens to be padded.
 *
 * A blanked clone of a row without a leading or trailing pipe (`a | b`) needs
 * one: with every cell now whitespace, the outermost pipes are all that keeps
 * the cells addressable. cellCount is invariant under this function.
 */
export function blankRowLike(line: string): string {
  const spans = cellSpans(line);
  if (spans.length === 0) {
    return line;
  }

  const first = spans[0];
  const last = spans[spans.length - 1];

  let out = line.slice(0, first.start) + (hasLeadingPipe(line) ? '' : '|');
  for (let i = 0; i < spans.length; i++) {
    if (i > 0) {
      out += line.slice(spans[i - 1].end, spans[i].start);
    }
    out += ' '.repeat(visualWidth(line.slice(spans[i].start, spans[i].end)));
  }
  return out + (hasClosingPipe(line, spans) ? '' : '|') + line.slice(last.end);
}

function firstNonSpace(line: string): number {
  let i = 0;
  while (i < line.length && /\s/.test(line[i])) {
    i++;
  }
  return i;
}

function lastNonSpaceEnd(line: string): number {
  let i = line.length;
  while (i > 0 && /\s/.test(line[i - 1])) {
    i--;
  }
  return i;
}

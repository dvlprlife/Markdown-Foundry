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
  const row = rowShape(line);
  if (!row || index < 0 || index >= row.cells.length) {
    return line;
  }

  const cells = [...row.cells];
  cells.splice(index, 1);
  return renderRow({ ...row, cells });
}

/** Swap the raw text (padding included) of two cells. */
export function swapCells(line: string, a: number, b: number): string {
  if (a === b) {
    return line;
  }
  const row = rowShape(line);
  if (!row || Math.min(a, b) < 0 || Math.max(a, b) >= row.cells.length) {
    return line;
  }

  const cells = [...row.cells];
  [cells[a], cells[b]] = [cells[b], cells[a]];
  return renderRow({ ...row, cells });
}

/**
 * A row taken apart into the pieces a transform may reorder, so it can be put
 * back together with delimiters that still fit what the cells became.
 */
interface RowShape {
  indent: string;
  /** Is there a pipe before the first cell? */
  leading: boolean;
  /** Raw cell text, padding included. */
  cells: string[];
  /** Is there a pipe after the last cell? */
  closing: boolean;
  /** Whitespace trailing the row. */
  tail: string;
}

function rowShape(line: string): RowShape | null {
  const spans = cellSpans(line);
  if (spans.length === 0) {
    return null;
  }
  const last = spans[spans.length - 1];
  const closing = hasClosingPipe(line, spans);
  return {
    indent: line.slice(0, firstNonSpace(line)),
    leading: hasLeadingPipe(line),
    cells: spans.map((span) => line.slice(span.start, span.end)),
    closing,
    tail: line.slice(closing ? last.end + 1 : last.end)
  };
}

/**
 * Reassemble a row, adding the delimiters its cells now need. A blank cell at
 * either end is only addressable if a pipe holds it open, and a row with no
 * unescaped pipe left is no longer a table row at all — it would render as a
 * paragraph, or worse, as a setext heading.
 */
function renderRow(row: RowShape): string {
  const { cells, indent, tail } = row;
  if (cells.length === 0) {
    return indent + '||' + tail;
  }

  const single = cells.length < 2;
  const leading = row.leading || single || isBlank(cells[0]);
  const closing = row.closing || single || isBlank(cells[cells.length - 1]);

  // Without a leading pipe the first cell starts at the indent, so any padding
  // it picked up from another cell would be read as indentation.
  const body = [...cells];
  if (!leading) {
    body[0] = body[0].replace(/^\s+/, '');
  }

  return (
    indent + (leading ? '|' : '') + body.join('|') + (closing ? '|' : '') + tail
  );
}

function isBlank(text: string): boolean {
  return text.trim() === '';
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

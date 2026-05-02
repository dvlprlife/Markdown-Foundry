export interface Heading {
  level: number;
  text: string;
  slug: string;
}

export interface TOCOptions {
  minDepth: number;
  maxDepth: number;
  indent: number;
  includeMarkers: boolean;
}

export const TOC_OPEN_MARKER = '<!-- markdownfoundry-toc -->';
export const TOC_CLOSE_MARKER = '<!-- /markdownfoundry-toc -->';

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;

export function extractHeadings(text: string): Heading[] {
  const lines = text.split(/\r?\n/);
  const headings: Heading[] = [];
  let fenceMarker: string | undefined;
  let inHtmlComment = false;

  for (const raw of lines) {
    if (fenceMarker !== undefined) {
      const closeMatch = raw.match(FENCE_RE);
      if (closeMatch && closeMatch[1].startsWith(fenceMarker)) {
        fenceMarker = undefined;
      }
      continue;
    }

    let line = raw;
    if (inHtmlComment) {
      const closeIdx = line.indexOf('-->');
      if (closeIdx < 0) continue;
      line = line.slice(closeIdx + 3);
      inHtmlComment = false;
    }

    const stripped = stripInlineHtmlComments(line);
    const trailingOpen = stripped.lastIndexOf('<!--');
    let lineToScan = stripped;
    if (trailingOpen >= 0) {
      inHtmlComment = true;
      lineToScan = stripped.slice(0, trailingOpen);
    }

    const fenceOpen = lineToScan.match(FENCE_RE);
    if (fenceOpen) {
      fenceMarker = fenceOpen[1];
      continue;
    }

    const m = lineToScan.match(HEADING_RE);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2];
    const slug = slugify(text);
    headings.push({ level, text, slug });
  }

  return dedupeSlugs(headings);
}

function stripInlineHtmlComments(line: string): string {
  let out = '';
  let i = 0;
  while (i < line.length) {
    const open = line.indexOf('<!--', i);
    if (open < 0) {
      out += line.slice(i);
      break;
    }
    out += line.slice(i, open);
    const close = line.indexOf('-->', open + 4);
    if (close < 0) {
      out += line.slice(open);
      break;
    }
    i = close + 3;
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '');
}

export function dedupeSlugs(headings: Heading[]): Heading[] {
  const seen = new Map<string, number>();
  return headings.map((h) => {
    if (h.slug === '') return h;
    const count = seen.get(h.slug) ?? 0;
    seen.set(h.slug, count + 1);
    if (count === 0) return h;
    return { ...h, slug: `${h.slug}-${count}` };
  });
}

export function generateTOC(headings: Heading[], options: TOCOptions): string {
  const filtered = headings.filter(
    (h) => h.level >= options.minDepth && h.level <= options.maxDepth && h.slug !== ''
  );
  if (filtered.length === 0) {
    return options.includeMarkers
      ? `${TOC_OPEN_MARKER}\n${TOC_CLOSE_MARKER}`
      : '';
  }
  const indent = ' '.repeat(options.indent);
  const lines = filtered.map((h) => {
    const depth = h.level - options.minDepth;
    return `${indent.repeat(depth)}- [${h.text}](#${h.slug})`;
  });
  const body = lines.join('\n');
  if (!options.includeMarkers) return body;
  return `${TOC_OPEN_MARKER}\n${body}\n${TOC_CLOSE_MARKER}`;
}

export interface TOCRange {
  startOffset: number;
  endOffset: number;
}

export function locateExistingTOC(text: string): TOCRange | undefined {
  const startOffset = text.indexOf(TOC_OPEN_MARKER);
  if (startOffset < 0) return undefined;
  const endSearchFrom = startOffset + TOC_OPEN_MARKER.length;
  const endOffset = text.indexOf(TOC_CLOSE_MARKER, endSearchFrom);
  if (endOffset < 0) return undefined;
  return { startOffset, endOffset: endOffset + TOC_CLOSE_MARKER.length };
}

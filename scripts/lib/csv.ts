// Minimal CSV read/write (RFC 4180 quoting). Enough for our own CSVs and IBTrACS.

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Parses a whole CSV file into objects keyed by the header row. Handles quoted newlines. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let buf = "";
  let quoteCount = 0;
  for (const rawLine of text.replace(/^﻿/, "").split(/\r?\n/)) {
    buf = buf ? `${buf}\n${rawLine}` : rawLine;
    quoteCount += (rawLine.match(/"/g) ?? []).length;
    if (quoteCount % 2 === 0) {
      if (buf.trim() !== "") rows.push(parseCsvLine(buf));
      buf = "";
      quoteCount = 0;
    }
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? "").trim()])));
}

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((c) => escapeCell(row[c])).join(","));
  return lines.join("\n") + "\n";
}

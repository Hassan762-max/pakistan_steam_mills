/** Client-side CSV download helper */
export function exportToCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; header: string }[],
) {
  if (typeof window === "undefined") return;
  if (!rows.length) return;

  const cols =
    columns ??
    Object.keys(rows[0]!).map((key) => ({
      key,
      header: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
    }));

  const escape = (value: unknown) => {
    const str = value == null ? "" : String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = cols.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) => cols.map((c) => escape(row[c.key])).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

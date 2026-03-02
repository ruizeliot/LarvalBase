/**
 * CSV export generation and download utilities.
 * Uses '@' as column delimiter. ALL fields are always quoted with double quotes
 * to prevent spreadsheet apps from splitting on ';' or other characters.
 * Internal double quotes are escaped as double-double quotes ("").
 */

/**
 * Escape and quote a single field value.
 * - null/undefined → ""
 * - Strings → "value" with internal " escaped as ""
 * - Numbers → "123"
 */
function quoteField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generate CSV string from data array.
 * Every field is always double-quoted. Uses '@' as delimiter.
 *
 * @param data - Array of objects to convert to CSV
 * @param columns - Optional array of column keys to include (in order)
 * @returns CSV string
 */
export function generateCSV(
  data: Array<Record<string, unknown>>,
  columns?: string[]
): string {
  if (data.length === 0) return '';

  // Determine columns: explicit list or from first row's keys
  const cols = columns || Object.keys(data[0]);

  // Header row
  const headerRow = cols.map(c => quoteField(c)).join('@');

  // Data rows
  const dataRows = data.map(row =>
    cols.map(col => quoteField(row[col])).join('@')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate CSV and trigger browser download.
 * Uses Blob API for client-side file generation (no server round-trip).
 *
 * @param data - Array of objects to convert to CSV
 * @param filename - Download filename (without extension)
 * @param columns - Optional array of column keys to include (in order)
 */
export function downloadCSV(
  data: Array<Record<string, unknown>>,
  filename: string,
  columns?: string[]
): void {
  const csv = generateCSV(data, columns);

  // Create Blob with UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  // Use text/plain MIME type and .txt extension to prevent Excel from
  // auto-parsing with locale-specific delimiters (e.g. ';' in European locales).
  // This forces Excel to use the Text Import Wizard where the user picks '@'.
  const blob = new Blob([BOM + csv], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Create and trigger download link
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.txt`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup to prevent memory leaks
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

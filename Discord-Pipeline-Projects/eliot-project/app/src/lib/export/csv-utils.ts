/**
 * CSV export generation and download utilities.
 * Uses ';' as column delimiter. Fields are NOT quoted.
 * Semicolons within field values are replaced with ' -' to prevent column splitting.
 */

/**
 * Format a single field value for CSV output (no quotes).
 * - null/undefined → empty string
 * - Replaces ';' in values with ' -'
 */
function formatField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Replace semicolons with ' -' to prevent column splitting
  return str.replace(/;/g, ' -');
}

/**
 * Generate CSV string from data array.
 * Fields are unquoted. Uses ';' as delimiter.
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
  const headerRow = cols.join(';');

  // Data rows
  const dataRows = data.map(row =>
    cols.map(col => formatField(row[col])).join(';')
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
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Create and trigger download link
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup to prevent memory leaks
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

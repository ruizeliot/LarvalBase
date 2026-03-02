/**
 * CSV generation and download utilities.
 * Uses PapaParse for proper CSV formatting with correct escaping.
 */

import Papa from "papaparse";

/**
 * Generate CSV and trigger browser download.
 * Uses Blob API for client-side file generation (no server round-trip).
 *
 * @param data - Array of objects to convert to CSV
 * @param filename - Download filename (without .csv extension)
 * @param columns - Optional array of column keys to include (in order)
 */
export function downloadCSV(
  data: Array<Record<string, unknown>>,
  filename: string,
  columns?: string[]
): void {
  // Generate CSV with explicit columns if provided
  // PapaParse handles proper escaping of commas, quotes, and newlines
  const csv = Papa.unparse(data, {
    columns: columns,
    delimiter: "@",
    header: true,
    skipEmptyLines: true,
  });

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

/**
 * Generate CSV string without triggering download.
 * Useful for previewing or copying to clipboard.
 *
 * @param data - Array of objects to convert to CSV
 * @param columns - Optional array of column keys to include (in order)
 * @returns CSV string
 */
export function generateCSV(
  data: Array<Record<string, unknown>>,
  columns?: string[]
): string {
  return Papa.unparse(data, {
    columns: columns,
    delimiter: "@",
    header: true,
    skipEmptyLines: true,
  });
}

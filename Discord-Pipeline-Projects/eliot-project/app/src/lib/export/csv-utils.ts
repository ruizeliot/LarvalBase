/**
 * TXT export generation and download utilities.
 * Uses '@' as column delimiter. Fields are always quoted with double quotes
 * to prevent spreadsheet apps from splitting on ';' or other characters.
 * File extension is .txt (not .csv) to avoid auto-import issues.
 */

import Papa from "papaparse";

/**
 * Generate TXT and trigger browser download.
 * Uses Blob API for client-side file generation (no server round-trip).
 *
 * @param data - Array of objects to convert to delimited text
 * @param filename - Download filename (without extension)
 * @param columns - Optional array of column keys to include (in order)
 */
export function downloadCSV(
  data: Array<Record<string, unknown>>,
  filename: string,
  columns?: string[]
): void {
  const txt = Papa.unparse(data, {
    columns: columns,
    delimiter: "@",
    quotes: true,
    header: true,
    skipEmptyLines: true,
  });

  // Create Blob with UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + txt], { type: "text/plain;charset=utf-8;" });
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

/**
 * Generate delimited text string without triggering download.
 * Useful for previewing or copying to clipboard.
 *
 * @param data - Array of objects to convert
 * @param columns - Optional array of column keys to include (in order)
 * @returns Delimited text string
 */
export function generateCSV(
  data: Array<Record<string, unknown>>,
  columns?: string[]
): string {
  return Papa.unparse(data, {
    columns: columns,
    delimiter: "@",
    quotes: true,
    header: true,
    skipEmptyLines: true,
  });
}

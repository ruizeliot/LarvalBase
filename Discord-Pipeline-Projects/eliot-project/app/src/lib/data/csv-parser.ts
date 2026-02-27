/**
 * CSV parser wrapper using PapaParse.
 *
 * Handles the @ delimiter used in fish_larvae_traits_db CSV files.
 * Converts "NA" strings to null values and continues parsing on malformed rows.
 */
import Papa from 'papaparse';
import type { ParseError, ParseResult } from '@/lib/types/csv.types';

/**
 * Detect and fix leading row-index columns in CSV data.
 *
 * Some database files (e.g. Incubation) have a leading numeric row-index column
 * in data rows but NOT in the header, causing all columns to shift by 1.
 * This function detects the pattern and adds a dummy header to fix alignment.
 */
function fixLeadingRowIndex(csvText: string, delimiter: string): string {
  const lines = csvText.split('\n');
  if (lines.length < 3) return csvText;

  const headerCols = lines[0].split(delimiter).length;

  // Check first few data rows for extra column
  let extraColCount = 0;
  const checkCount = Math.min(5, lines.length - 1);
  for (let i = 1; i <= checkCount; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const dataCols = line.split(delimiter).length;
    if (dataCols === headerCols + 1) {
      // Check if first value looks like a row index (quoted or unquoted integer)
      const firstVal = line.split(delimiter)[0].replace(/"/g, '').trim();
      if (/^\d+$/.test(firstVal)) {
        extraColCount++;
      }
    }
  }

  // If most checked rows have the extra leading column, add a dummy header
  if (extraColCount >= Math.min(3, checkCount)) {
    console.log(`[csv-parser] Detected leading row-index column, adding ROW_INDEX header`);
    lines[0] = `"ROW_INDEX"${delimiter}${lines[0]}`;
    return lines.join('\n');
  }

  return csvText;
}

/**
 * Parse a CSV file with semicolon delimiter and error handling.
 *
 * Key behaviors:
 * - Uses semicolon (;) as delimiter (fish_larvae_traits_db format)
 * - Converts "NA" values to null
 * - Logs errors but continues processing
 * - Trims whitespace from headers and values
 *
 * @param csvText - Raw CSV text content
 * @param filename - Name of file being parsed (for error logging)
 * @returns ParseResult with data array, errors array, and metadata
 */
export function parseTraitCSV<T extends Record<string, unknown>>(
  csvText: string,
  filename: string
): ParseResult<T> {
  // Fix leading row-index columns before parsing
  csvText = fixLeadingRowIndex(csvText, '@');
  const data: T[] = [];
  const errors: ParseError[] = [];
  let rowIndex = 0;

  Papa.parse<T>(csvText, {
    delimiter: '@', // fish_larvae_traits_db uses @ delimiter
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => {
      // Convert NA to null, trim strings
      if (value === 'NA' || value === 'N/A' || value === '') {
        return null;
      }
      return typeof value === 'string' ? value.trim() : value;
    },
    step: (results, parser) => {
      rowIndex++;

      // Track parsing errors for this row
      let hasFatalError = false;
      if (results.errors && results.errors.length > 0) {
        for (const err of results.errors) {
          errors.push({
            row: rowIndex,
            message: err.message,
            code: err.code,
            filename,
          });
          // TooManyFields is non-fatal: Papa Parse still maps fields to headers correctly
          if (err.code !== 'TooManyFields') {
            hasFatalError = true;
            console.warn(
              `[${filename}] Row ${rowIndex}: ${err.code} - ${err.message}`
            );
          }
        }
        if (hasFatalError) return;
      }

      // Push row data (including rows with only non-fatal errors)
      if (results.data) {
        data.push(results.data as T);
      }
    },
    complete: () => {
      console.log(
        `[${filename}] Parsed ${data.length} rows, ${errors.length} errors`
      );
    },
  });

  return {
    data,
    errors,
    meta: {
      rowCount: data.length,
      errorCount: errors.length,
      filename,
    },
  };
}

/**
 * Parse multiple CSV files and aggregate results.
 *
 * @param csvFiles - Array of {text, filename} objects
 * @returns Combined ParseResult with all data and errors
 */
export function parseMultipleCSVs<T extends Record<string, unknown>>(
  csvFiles: Array<{ text: string; filename: string }>
): ParseResult<T> {
  const allData: T[] = [];
  const allErrors: ParseError[] = [];

  for (const file of csvFiles) {
    const result = parseTraitCSV<T>(file.text, file.filename);
    allData.push(...result.data);
    allErrors.push(...result.errors);
  }

  return {
    data: allData,
    errors: allErrors,
    meta: {
      rowCount: allData.length,
      errorCount: allErrors.length,
      filename: csvFiles.map((f) => f.filename).join(', '),
    },
  };
}

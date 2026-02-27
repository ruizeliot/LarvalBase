/**
 * CSV parser wrapper using PapaParse.
 *
 * Handles the @ delimiter used in fish_larvae_traits_db CSV files.
 * Converts "NA" strings to null values and continues parsing on malformed rows.
 */
import Papa from 'papaparse';
import type { ParseError, ParseResult } from '@/lib/types/csv.types';

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

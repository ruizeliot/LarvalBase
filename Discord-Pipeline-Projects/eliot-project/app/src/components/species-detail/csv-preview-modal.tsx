"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export/csv-utils";

interface CsvPreviewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Data rows to preview and export */
  data: Array<Record<string, unknown>>;
  /** Modal title */
  title: string;
  /** Filename for CSV download (without extension) */
  filename: string;
  /** Optional column order */
  columns?: string[];
}

/**
 * Format a cell value for display.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "" || value === "NA") return "-";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
  return String(value);
}

/**
 * CSV preview modal with scrollable table and Download button.
 * Shows data before download so users can verify contents.
 */
export function CsvPreviewModal({
  open,
  onOpenChange,
  data,
  title,
  filename,
  columns,
}: CsvPreviewModalProps) {
  // Extract column headers from data
  const columnHeaders = useMemo(() => {
    if (columns) return columns;
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data, columns]);

  const handleDownload = () => {
    downloadCSV(data, filename, columns);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {data.length > 0
                ? `${data.length} rows ready for export`
                : "No data available for export"}
            </DialogDescription>
          </div>
          {data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {data.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No data to preview.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columnHeaders.map((col) => (
                    <TableHead key={col} className="text-xs whitespace-nowrap">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 100).map((row, idx) => (
                  <TableRow key={idx}>
                    {columnHeaders.map((col) => (
                      <TableCell
                        key={col}
                        className="text-xs max-w-[200px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        {formatValue(row[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {data.length > 100 && (
                  <TableRow>
                    <TableCell
                      colSpan={columnHeaders.length}
                      className="text-center text-xs text-muted-foreground py-3"
                    >
                      Showing first 100 of {data.length} rows. Full data will be included in download.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

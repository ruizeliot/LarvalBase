"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export/csv-utils";

interface ExportButtonProps {
  /** Data to export as CSV */
  data: Array<Record<string, unknown>>;
  /** Filename without extension */
  filename: string;
  /** Optional column order/filter */
  columns?: string[];
  /** Button label (default: "Export CSV") */
  label?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Export button that triggers CSV download.
 * Disabled when no data available.
 *
 * Implements EXPRT-04, EXPRT-05, EXPRT-06.
 */
export function ExportButton({
  data,
  filename,
  columns,
  label = "Export TXT",
  variant = "outline",
  size = "sm",
  className,
}: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    downloadCSV(data, filename, columns);
  };

  const isDisabled = data.length === 0;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isDisabled}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}

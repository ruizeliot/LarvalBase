"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SectionTooltipProps {
  /** Tooltip text to display on hover */
  text: string;
}

/**
 * Small circled question mark icon with CSS tooltip.
 * Used next to section names and trait labels for definitions.
 */
export function SectionTooltip({ text }: SectionTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-gray-400/60 text-gray-400 text-[11px] font-medium cursor-help select-none leading-none hover:border-gray-300 hover:text-gray-300 transition-colors"
          aria-label="Definition"
        >
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm leading-relaxed">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

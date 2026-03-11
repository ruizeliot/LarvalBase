"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SectionTooltipProps {
  /** Tooltip text to display on hover/click */
  text: string;
}

/**
 * Small circled question mark icon with tooltip.
 * Desktop: shows on hover. Mobile/touch: shows on tap, dismisses on outside tap.
 */
export function SectionTooltip({ text }: SectionTooltipProps) {
  const [open, setOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Click-outside handler for mobile
  useEffect(() => {
    if (!open || !isTouchDevice) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open, isTouchDevice]);

  const handleClick = useCallback(() => {
    if (isTouchDevice) {
      setOpen(prev => !prev);
    }
  }, [isTouchDevice]);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) setOpen(true);
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) setOpen(false);
  }, [isTouchDevice]);

  return (
    <span className="relative inline-flex items-center">
      <span
        ref={triggerRef}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-gray-400/60 text-gray-400 text-[11px] font-medium cursor-help select-none leading-none hover:border-gray-300 hover:text-gray-300 transition-colors"
        aria-label="Definition"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        ?
      </span>
      {open && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md"
        >
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
      )}
    </span>
  );
}

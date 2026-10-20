import { useLayoutEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// One line of text that ends in "…" when it doesn't fit. Only text that was cut off gets a
// tooltip with the full value and a Tab stop, so keyboard users can reach it too. Screen
// readers always read the full text, because the "…" is only visual.
// Needs a TooltipProvider above it.
export function TruncatedText({ text }: { text: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  // Measured before paint, and again whenever the cell's width changes (for example, the
  // window is resized), so the tooltip comes and goes with the "…".
  useLayoutEffect(() => {
    const textElement = textRef.current;
    if (!textElement) {
      return;
    }

    function checkTruncation(element: HTMLElement) {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    }

    checkTruncation(textElement);
    const resizeObserver = new ResizeObserver(() => checkTruncation(textElement));
    resizeObserver.observe(textElement);
    return () => resizeObserver.disconnect();
  }, [text]);

  // The tooltip is always rendered, so the measured element never remounts; it just never
  // opens for text that fits.
  return (
    <Tooltip open={isTruncated && isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger asChild>
        <span
          ref={textRef}
          tabIndex={isTruncated ? 0 : undefined}
          className="block truncate rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="wrap-anywhere">{text}</TooltipContent>
    </Tooltip>
  );
}

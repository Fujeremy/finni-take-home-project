import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TruncatedTextProps = {
  text: string;
  // Makes the text a link to this address. The link is always a Tab stop and carries the
  // tooltip itself, so a shortened link doesn't also get a separate Tab stop.
  to?: string;
};

// One line of text that ends in "…" when it doesn't fit. Only text that was cut off gets a
// tooltip with the full value; plain text also gets a Tab stop then, so keyboard users can
// reach it too. Screen readers always read the full text, because the "…" is only visual.
// Needs a TooltipProvider above it.
export function TruncatedText({ text, to }: TruncatedTextProps) {
  const textRef = useRef<HTMLElement>(null);
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

  const textClasses = "block truncate rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  // The tooltip is always rendered, so the measured element never remounts; it just never
  // opens for text that fits.
  return (
    <Tooltip open={isTruncated && isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger asChild>
        {to ? (
          <Link
            ref={(element) => {
              textRef.current = element;
            }}
            to={to}
            className={`${textClasses} hover:underline`}
          >
            {text}
          </Link>
        ) : (
          <span
            ref={(element) => {
              textRef.current = element;
            }}
            tabIndex={isTruncated ? 0 : undefined}
            className={textClasses}
          >
            {text}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="wrap-anywhere">{text}</TooltipContent>
    </Tooltip>
  );
}

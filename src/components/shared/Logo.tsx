import { cn } from "@/lib/utils";

/**
 * Foyer brand mark — a doorway/arch with a visitor dot crossing the threshold.
 * On-metaphor: a foyer is the room where arriving guests are greeted.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-violet to-[hsl(280_90%_60%)] shadow-lg shadow-primary/40",
        className || "h-8 w-8"
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[64%] w-[64%]"
        aria-hidden="true"
      >
        {/* Doorway arch */}
        <path
          d="M5 21V11a7 7 0 0 1 14 0v10"
          stroke="white"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Threshold */}
        <path
          d="M3 21h18"
          stroke="white"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* The visitor, stepping through */}
        <circle cx="12" cy="12.5" r="2.3" fill="white" />
      </svg>
    </span>
  );
}

/**
 * Wordmark. Solid type against the colourful mark — the restrained pairing real
 * SaaS brands use, rather than a gradient-split invented word.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-tight", className)}>
      Foyer
    </span>
  );
}

export function Logo({
  markClassName,
  wordClassName,
}: {
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <BrandMark className={markClassName} />
      <BrandWordmark className={wordClassName} />
    </span>
  );
}

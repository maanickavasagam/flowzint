import { cn } from "@/lib/utils";

/**
 * FlowZint brand mark — a rising "flow" line with a node, evoking lead flow
 * turning into insight/growth. Distinct from a generic lightning bolt.
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
        className="h-[62%] w-[62%]"
        aria-hidden="true"
      >
        <path
          d="M3 17 L9 10.5 L13.5 14 L21 5.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="21" cy="5.5" r="2.1" fill="white" />
        <circle cx="3" cy="17" r="1.6" fill="white" fillOpacity="0.7" />
      </svg>
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-tight", className)}>
      Flow<span className="gradient-text">Zint</span>
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

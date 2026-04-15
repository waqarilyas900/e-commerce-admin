import { cn } from "@/lib/utils";

/** Horizontal scroll + rounded shell for data tables inside cards */
export function TableContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-muted/10 shadow-inner dark:bg-muted/5",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Sticky-style header row */
export const ADMIN_TABLE_HEAD =
  "border-b border-border/80 bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-muted/25";

/** Body row: zebra-friendly hover */
export const ADMIN_TABLE_ROW =
  "border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/30 dark:hover:bg-muted/15";

/** Cell padding — 8px grid (12px = 1.5, 16px = 4) */
export const ADMIN_TABLE_CELL = "px-4 py-3 align-middle";

/** Table header cell with standard right gutter (not last column). */
export function adminTh(className?: string) {
  return cn(ADMIN_TABLE_CELL, "pr-6", className);
}

/** Last header column (no extra pr). */
export function adminThEnd(className?: string) {
  return cn(ADMIN_TABLE_CELL, className);
}

/** Body cell — pass Tailwind overrides (e.g. px-2) and they merge correctly. */
export function adminTd(className?: string) {
  return cn(ADMIN_TABLE_CELL, className);
}

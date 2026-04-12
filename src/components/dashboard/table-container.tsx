import { cn } from "@/lib/utils";

/** Horizontal scroll + slight rounding for tables inside cards. */
export function TableContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("overflow-x-auto rounded-md", className)}>{children}</div>;
}

/** Shared thead row styling for admin list tables */
export const ADMIN_TABLE_HEAD =
  "border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-muted/30";

/** Shared body row: hover + divider */
export const ADMIN_TABLE_ROW =
  "border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/25 dark:hover:bg-muted/15";

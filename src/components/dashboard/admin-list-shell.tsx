/* eslint-disable react-refresh/only-export-components -- shared layout constants + re-exported table primitives */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Table primitives — single import path for list pages
export {
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_CELL,
  adminTh,
  adminThEnd,
  adminTd,
} from "@/components/dashboard/table-container";

/** Standard vertical rhythm for list / CRUD index pages */
export const ADMIN_LIST_PAGE_CLASS = "space-y-8";

/** Primary data card shell (list tables, detail sections) */
export const ADMIN_LIST_CARD_CLASS =
  "overflow-hidden border-border/70 shadow-md shadow-black/[0.04] dark:shadow-black/30";

/** Card header: title + description only */
export const ADMIN_LIST_CARD_HEADER_CLASS =
  "border-b border-border/60 bg-muted/20 dark:bg-muted/10";

/** Card header: title block + right slot (filters, links) */
export const ADMIN_LIST_CARD_HEADER_SPLIT_CLASS =
  "flex flex-col gap-5 border-b border-border/60 bg-muted/20 sm:flex-row sm:items-end sm:justify-between dark:bg-muted/10";

/** Card body under header */
export const ADMIN_LIST_CARD_CONTENT_CLASS = "pt-6";

/** Optional dashboard content width */
export const ADMIN_DASHBOARD_MAX_CLASS = "mx-auto max-w-[1600px]";

type AdminListCardProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Filters, toolbar, or links — enables split header layout */
  headerRight?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

/**
 * Shared list/detail card: shell + title block (+ optional right column).
 * Fully custom headers can use {@link ADMIN_LIST_CARD_CLASS} on `Card` directly.
 */
export function AdminListCard({
  title,
  description,
  icon: Icon,
  headerRight,
  className,
  headerClassName,
  contentClassName,
  children,
}: AdminListCardProps) {
  const split = Boolean(headerRight);

  const titleBlock = (
    <div className="space-y-1.5">
      <CardTitle className={cn(Icon && "flex items-center gap-2")}>
        {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
        {title}
      </CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </div>
  );

  return (
    <Card className={cn(ADMIN_LIST_CARD_CLASS, className)}>
      <CardHeader
        className={cn(
          split ? ADMIN_LIST_CARD_HEADER_SPLIT_CLASS : ADMIN_LIST_CARD_HEADER_CLASS,
          headerClassName,
        )}
      >
        {split ? (
          <>
            {titleBlock}
            <div className="flex shrink-0 flex-wrap items-center gap-2">{headerRight}</div>
          </>
        ) : (
          titleBlock
        )}
      </CardHeader>
      <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function AdminListEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function AdminFilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-full flex-wrap gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1.5 dark:bg-muted/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminRowEditLink({
  to,
  children = "Edit",
}: {
  to: string;
  children?: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="sm" className="font-medium text-primary" asChild>
      <Link to={to}>{children}</Link>
    </Button>
  );
}

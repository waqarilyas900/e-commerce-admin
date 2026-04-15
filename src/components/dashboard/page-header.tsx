import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Ghost back link above the title (detail / edit flows). */
  backLink?: { to: string; label: string };
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  backLink,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-10 space-y-5", className)}>
      {backLink ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-9 gap-2 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          asChild
        >
          <Link to={backLink.to}>
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {backLink.label}
          </Link>
        </Button>
      ) : null}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

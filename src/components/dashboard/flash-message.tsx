import { cn } from "@/lib/utils";

export type FlashVariant = "error" | "success" | "info";

const variantClass: Record<FlashVariant, string> = {
  error: "border-destructive/35 bg-destructive/10 text-destructive dark:text-destructive",
  success:
    "border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-300",
  info: "border-border bg-muted/40 text-muted-foreground",
};

export function FlashMessage({
  variant,
  children,
  className,
}: {
  variant: FlashVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-relaxed",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

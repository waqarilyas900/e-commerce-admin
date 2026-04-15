import { cn } from "@/lib/utils";

export type FlashVariant = "error" | "success" | "info";

const variantClass: Record<FlashVariant, string> = {
  error:
    "border-destructive/30 bg-destructive/[0.08] text-destructive shadow-sm dark:text-destructive-foreground",
  success:
    "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-900 shadow-sm dark:text-emerald-300",
  info: "border-border/80 bg-muted/50 text-muted-foreground shadow-sm",
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
        "rounded-xl border px-4 py-3.5 text-sm leading-relaxed",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

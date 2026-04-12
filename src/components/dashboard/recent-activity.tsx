import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchRecentOrdersForActivity, type RecentOrderLine } from "@/lib/supabase/dashboard-stats";
import { formatMinorUnits } from "@/lib/format-money";

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function RecentActivity() {
  const [lines, setLines] = useState<RecentOrderLine[]>([]);

  useEffect(() => {
    void fetchRecentOrdersForActivity(8).then(setLines);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
        <CardDescription>Newest checkouts — open the Orders page for full fulfillment tools.</CardDescription>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet, or still loading.</p>
        ) : (
          <ul className="space-y-4">
            {lines.map((e) => {
              const label = e.order_number ?? e.id.slice(0, 8);
              return (
                <li
                  key={e.id}
                  className="flex gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none">Order {label}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {e.email || "Guest"} · {formatMinorUnits(e.total_cents, e.currency)} ·{" "}
                      <span className="capitalize">{e.status}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relTime(e.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

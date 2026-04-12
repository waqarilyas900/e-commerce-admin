import { useEffect, useState } from "react";
import { Headphones, Package, ShoppingCart, Store } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/supabase/dashboard-stats";

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

export function StatCards() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(
    null,
  );

  useEffect(() => {
    void fetchDashboardStats().then(setStats);
  }, []);

  const items = [
    {
      label: "Active listings",
      value: fmt(stats?.activeProductCount),
      delta: "Products status = active",
      icon: Package,
    },
    {
      label: "Open orders",
      value: fmt(stats?.openOrderCount),
      delta: "Pending → processing",
      icon: ShoppingCart,
    },
    {
      label: "Collections",
      value: fmt(stats?.collectionCount),
      delta: "Merchandising groups",
      icon: Store,
    },
    {
      label: "Reviews pending",
      value: fmt(stats?.pendingReviewCount),
      delta: "Moderation queue",
      icon: Headphones,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.delta}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

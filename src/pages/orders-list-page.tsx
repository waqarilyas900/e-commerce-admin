import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";
import {
  AdminListCard,
  AdminListSkeleton,
  AdminListEmpty,
  AdminFilterBar,
  ADMIN_LIST_PAGE_CLASS,
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  adminTh,
  adminThEnd,
  adminTd,
  AdminRowEditLink,
} from "@/components/dashboard/admin-list-shell";
import { fetchOrdersAdmin, type OrderRow, type OrderStatus } from "@/lib/supabase/orders";
import { formatMinorUnits } from "@/lib/format-money";
import { supabase } from "@/lib/supabase/client";

const STATUS_FILTER: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

function statusVariant(
  s: string,
): "default" | "secondary" | "outline" | "success" | "destructive" {
  if (s === "delivered" || s === "paid") return "success";
  if (s === "cancelled" || s === "refunded") return "destructive";
  if (s === "pending") return "secondary";
  return "outline";
}

export function OrdersListPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const load = useCallback(async () => {
    if (!supabase) {
      toast.error(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchOrdersAdmin({ limit: 200, status: filter });
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filterButtons = (
    <AdminFilterBar>
      {STATUS_FILTER.map((f) => (
        <Button
          key={f.value}
          type="button"
          size="sm"
          variant={filter === f.value ? "default" : "ghost"}
          className={cn(
            "rounded-lg",
            filter === f.value ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setFilter(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </AdminFilterBar>
  );

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Orders"
        description="Orders placed on your storefront in PKR. Fulfill and update status as you process each one."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <AdminListCard
        title="Order desk"
        description="Guest and signed-in checkouts appear here. Open a row for line items, shipping snapshot, and status updates."
        headerRight={filterButtons}
      >
        {loading ? (
          <AdminListSkeleton rows={3} />
        ) : rows.length === 0 ? (
          <AdminListEmpty>No orders match this filter.</AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Reference</th>
                  <th className={adminTh()}>Customer</th>
                  <th className={adminTh()}>Total</th>
                  <th className={adminTh()}>Status</th>
                  <th className={adminTh()}>Placed</th>
                  <th className={adminThEnd()} />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd("font-mono text-xs")}>{o.order_number ?? o.id.slice(0, 8)}</td>
                    <td className={adminTd()}>
                      <span className="block max-w-[220px] truncate" title={o.email}>
                        {o.email || "—"}
                      </span>
                    </td>
                    <td className={adminTd("tabular-nums")}>
                      {formatMinorUnits(o.total_cents, o.currency)}
                    </td>
                    <td className={adminTd()}>
                      <Badge variant={statusVariant(o.status)} className="capitalize">
                        {o.status}
                      </Badge>
                    </td>
                    <td className={adminTd("text-muted-foreground")}>
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className={cn(adminTd(), "text-right")}>
                      <AdminRowEditLink to={`/dashboard/orders/${o.id}`}>Open</AdminRowEditLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </AdminListCard>
    </div>
  );
}

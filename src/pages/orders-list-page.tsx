import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
import {
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
} from "@/components/dashboard/table-container";
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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  async function load() {
    if (!supabase) {
      setError(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await fetchOrdersAdmin({ limit: 200, status: filter });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Orders"
        description="Checkout orders from your storefront (PKR; amounts stored in paisa). Fulfill and update status as you process each order."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Order desk</CardTitle>
            <CardDescription>
              Guest and signed-in checkouts appear here. Open a row for line items, shipping snapshot, and status
              updates.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTER.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders match this filter.</p>
          ) : (
            <TableContainer>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Reference</th>
                    <th className="px-3 py-2.5 pr-4">Customer</th>
                    <th className="px-3 py-2.5 pr-4">Total</th>
                    <th className="px-3 py-2.5 pr-4">Status</th>
                    <th className="px-3 py-2.5 pr-4">Placed</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs">
                        {o.order_number ?? o.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2.5 pr-4">
                        <span className="block truncate max-w-[220px]" title={o.email}>
                          {o.email || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums">
                        {formatMinorUnits(o.total_cents, o.currency)}
                      </td>
                      <td className="px-3 py-2.5 pr-4">
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 pr-4 text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/dashboard/orders/${o.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

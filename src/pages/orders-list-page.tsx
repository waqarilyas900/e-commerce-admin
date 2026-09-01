import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminSearchField } from "@/components/dashboard/admin-search-field";
import { AdminConfirmDeleteDialog } from "@/components/dashboard/admin-confirm-delete-dialog";
import { toast } from "sonner";
import { ADMIN_MSG_CATALOG_UNAVAILABLE } from "@/lib/admin-user-messages";
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
  AdminRowActions,
} from "@/components/dashboard/admin-list-shell";
import {
  deleteOrderAdmin,
  fetchOrdersAdmin,
  type OrderRow,
  type OrderStatus,
} from "@/lib/supabase/orders";
import { formatOrderStatus, orderStatusVariant } from "@/lib/order-status";
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

export function OrdersListPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<OrderRow | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      toast.error(ADMIN_MSG_CATALOG_UNAVAILABLE);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => {
      const ref = (o.order_number ?? o.id).toLowerCase();
      const name = [o.first_name, o.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        ref.includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        name.includes(q)
      );
    });
  }, [rows, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusyDelete(true);
    const res = await deleteOrderAdmin(pendingDelete.id);
    setBusyDelete(false);
    if (!res.ok) {
      toast.error(res.error ?? "Delete failed.");
      return;
    }
    toast.success("Order deleted.");
    setPendingDelete(null);
    await load();
  }

  const filterButtons = (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <AdminFilterBar className="flex-1">
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
      <div className="relative w-full min-w-[min(100%,14rem)] lg:w-64">
        <AdminSearchField
          value={query}
          onChange={setQuery}
          placeholder="Search ref, email, phone…"
          aria-label="Search orders"
        />
      </div>
    </div>
  );

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Orders"
        description="Manage storefront checkouts — update fulfillment status or permanently remove test and duplicate orders."
      />

      <AdminListCard
        title="Order desk"
        description={`${filtered.length} order${filtered.length === 1 ? "" : "s"} shown. Open a row for line items, shipping snapshot, and status updates.`}
        headerRight={filterButtons}
      >
        <AdminConfirmDeleteDialog
          open={pendingDelete !== null}
          onOpenChange={(o) => !o && !busyDelete && setPendingDelete(null)}
          title="Delete this order?"
          subtitle={
            pendingDelete ? (
              <>
                Order{" "}
                <span className="font-mono font-medium text-foreground">
                  {pendingDelete.order_number ?? pendingDelete.id.slice(0, 8)}
                </span>{" "}
                and all line items will be removed permanently.
              </>
            ) : undefined
          }
          busy={busyDelete}
          onConfirm={() => void confirmDelete()}
        />

        {loading ? (
          <AdminListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <AdminListEmpty icon={Package}>No orders match this filter.</AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Reference</th>
                  <th className={adminTh()}>Customer</th>
                  <th className={adminTh()}>Total</th>
                  <th className={adminTh()}>Status</th>
                  <th className={adminTh()}>Placed</th>
                  <th className={adminThEnd()}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd("font-mono text-xs font-medium")}>
                      {o.order_number ?? o.id.slice(0, 8)}
                    </td>
                    <td className={adminTd()}>
                      <span className="block max-w-[220px] truncate font-medium" title={o.email}>
                        {o.email || "—"}
                      </span>
                      {o.phone ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{o.phone}</span>
                      ) : null}
                    </td>
                    <td className={adminTd("tabular-nums font-medium")}>
                      {formatMinorUnits(o.total_cents, o.currency)}
                    </td>
                    <td className={adminTd()}>
                      <Badge variant={orderStatusVariant(o.status)} className="capitalize">
                        {formatOrderStatus(o.status)}
                      </Badge>
                    </td>
                    <td className={adminTd("text-muted-foreground")}>
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className={adminTd()}>
                      <AdminRowActions>
                        <AdminRowEditLink to={`/dashboard/orders/${o.id}`}>Open</AdminRowEditLink>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setPendingDelete(o)}
                          aria-label={`Delete order ${o.order_number ?? o.id.slice(0, 8)}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AdminRowActions>
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

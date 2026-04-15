import { useEffect, useId, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
import {
  ADMIN_LIST_CARD_CLASS,
  ADMIN_LIST_CARD_HEADER_CLASS,
  ADMIN_LIST_CARD_CONTENT_CLASS,
  ADMIN_LIST_PAGE_CLASS,
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  adminTh,
  adminThEnd,
  adminTd,
} from "@/components/dashboard/admin-list-shell";
import { cn } from "@/lib/utils";
import {
  fetchOrderByIdAdmin,
  fetchOrderItemsAdmin,
  fetchOrderStatusHistoryAdmin,
  updateOrderStatusAdmin,
  type OrderItemRow,
  type OrderRow,
  type OrderStatus,
  type OrderStatusHistoryRow,
} from "@/lib/supabase/orders";
import { formatMinorUnits } from "@/lib/format-money";
import { supabase } from "@/lib/supabase/client";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const noteId = useId();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [history, setHistory] = useState<OrderStatusHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function load() {
    if (!orderId || !supabase) {
      setError(!supabase ? "Supabase is not configured." : "Missing order id.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [o, its, hist] = await Promise.all([
        fetchOrderByIdAdmin(orderId),
        fetchOrderItemsAdmin(orderId),
        fetchOrderStatusHistoryAdmin(orderId),
      ]);
      setOrder(o);
      setItems(its);
      setHistory(hist);
      if (o) setNextStatus(o.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  async function onSaveStatus() {
    if (!orderId || !order || !nextStatus || nextStatus === order.status) {
      setSaveMsg("Choose a new status to update.");
      window.setTimeout(() => setSaveMsg(null), 2500);
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    const res = await updateOrderStatusAdmin(orderId, nextStatus, note || undefined);
    setSaving(false);
    if (!res.ok) {
      setSaveMsg(res.error ?? "Update failed.");
      return;
    }
    setNote("");
    setSaveMsg("Status updated.");
    await load();
    window.setTimeout(() => setSaveMsg(null), 2500);
  }

  if (!orderId) {
    return (
      <FlashMessage variant="error">Invalid order link.</FlashMessage>
    );
  }

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title={order?.order_number ? `Order ${order.order_number}` : "Order detail"}
        description="Line items, shipping snapshot, and fulfillment status. Updates append to the status timeline."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/dashboard/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All orders
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}
      {saveMsg ? (
        <FlashMessage variant={saveMsg.includes("failed") || saveMsg.includes("Choose") ? "error" : "success"}>
          {saveMsg}
        </FlashMessage>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !order ? (
        <p className="text-sm text-muted-foreground">Order not found.</p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className={cn(ADMIN_LIST_CARD_CLASS, "lg:col-span-2")}>
              <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Totals in {order.currency} (minor units in database).</CardDescription>
              </CardHeader>
              <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "grid gap-3 text-sm sm:grid-cols-2")}>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className="mt-1">{order.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="mt-1 font-medium">{order.payment_method}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="mt-1 tabular-nums">{formatMinorUnits(order.subtotal_cents, order.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shipping</p>
                  <p className="mt-1 tabular-nums">{formatMinorUnits(order.shipping_cents, order.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Discount</p>
                  <p className="mt-1 tabular-nums">{formatMinorUnits(order.discount_cents, order.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMinorUnits(order.total_cents, order.currency)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={ADMIN_LIST_CARD_CLASS}>
              <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
                <CardTitle>Update status</CardTitle>
                <CardDescription>Writes order row + timeline entry.</CardDescription>
              </CardHeader>
              <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "space-y-4")}>
                <div className="space-y-2">
                  <Label htmlFor="status-select">Next status</Label>
                  <select
                    id="status-select"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={noteId}>Note (optional)</Label>
                  <textarea
                    id={noteId}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="e.g. Shipped via TCS, tracking sent by email"
                  />
                </div>
                <Button type="button" size="sm" disabled={saving} onClick={() => void onSaveStatus()}>
                  {saving ? "Saving…" : "Save status"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className={ADMIN_LIST_CARD_CLASS}>
            <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
              <CardTitle>Customer & shipping</CardTitle>
              <CardDescription>Snapshot from checkout (editable only via support tools elsewhere).</CardDescription>
            </CardHeader>
            <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "grid gap-4 text-sm md:grid-cols-2")}>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{order.email || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{order.phone || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">
                  {[order.first_name, order.last_name].filter(Boolean).join(" ") || "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Address</p>
                <p className="whitespace-pre-wrap font-medium">
                  {[
                    order.shipping_street,
                    [order.shipping_city, order.shipping_province, order.shipping_postal_code]
                      .filter(Boolean)
                      .join(", "),
                  ]
                    .filter(Boolean)
                    .join("\n") || "—"}
                </p>
              </div>
              {order.customer_note ? (
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Customer note</p>
                  <p className="rounded-md border bg-muted/40 p-2">{order.customer_note}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={ADMIN_LIST_CARD_CLASS}>
            <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent className={ADMIN_LIST_CARD_CONTENT_CLASS}>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No line items.</p>
              ) : (
                <TableContainer>
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className={ADMIN_TABLE_HEAD}>
                        <th className={adminTh()}>Product</th>
                        <th className={adminTh()}>SKU</th>
                        <th className={adminTh()}>Unit</th>
                        <th className={adminTh()}>Qty</th>
                        <th className={adminThEnd()}>Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((line) => (
                        <tr key={line.id} className={ADMIN_TABLE_ROW}>
                          <td className={adminTd()}>{line.product_name_snapshot}</td>
                          <td className={adminTd("font-mono text-xs")}>{line.sku_snapshot}</td>
                          <td className={adminTd("tabular-nums")}>
                            {formatMinorUnits(line.unit_price_cents, order.currency)}
                          </td>
                          <td className={adminTd("tabular-nums")}>{line.quantity}</td>
                          <td className={adminTd("tabular-nums")}>
                            {formatMinorUnits(line.unit_price_cents * line.quantity, order.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card className={ADMIN_LIST_CARD_CLASS}>
            <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
              <CardTitle>Status timeline</CardTitle>
              <CardDescription>Append-only history (place_order + manual updates).</CardDescription>
            </CardHeader>
            <CardContent className={ADMIN_LIST_CARD_CONTENT_CLASS}>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history rows yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-3 last:border-0">
                      <div>
                        <Badge variant="outline">{h.status}</Badge>
                        {h.note ? (
                          <p className="mt-1 text-muted-foreground">{h.note}</p>
                        ) : null}
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

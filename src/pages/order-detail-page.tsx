import { useCallback, useEffect, useId, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminConfirmDeleteDialog } from "@/components/dashboard/admin-confirm-delete-dialog";
import { AdminDetailField, AdminDetailGrid } from "@/components/dashboard/admin-detail-field";
import { AdminTextarea } from "@/components/dashboard/admin-textarea";
import { OrderPackingSlip, printOrderPackingSlip } from "@/components/dashboard/order-packing-slip";
import { toast } from "sonner";
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
  deleteOrderAdmin,
  fetchOrderByIdAdmin,
  fetchOrderItemsAdmin,
  fetchOrderStatusHistoryAdmin,
  updateOrderInternalNoteAdmin,
  updateOrderShippingAdmin,
  updateOrderStatusAdmin,
  type OrderItemRow,
  type OrderRow,
  type OrderStatus,
  type OrderStatusHistoryRow,
} from "@/lib/supabase/orders";
import { formatOrderStatus, orderStatusVariant } from "@/lib/order-status";
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
  const navigate = useNavigate();
  const noteId = useId();
  const internalNoteId = useId();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [history, setHistory] = useState<OrderStatusHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [savingInternalNote, setSavingInternalNote] = useState(false);
  const [shippingEdit, setShippingEdit] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    shipping_street: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_province: "",
  });
  const [savingShipping, setSavingShipping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!orderId || !supabase) {
      toast.error(!supabase ? "Supabase is not configured." : "Missing order id.");
      setLoading(false);
      return;
    }
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
      if (o) {
        setNextStatus(o.status);
        setInternalNote(o.admin_internal_note ?? "");
        setShippingForm({
          first_name: o.first_name,
          last_name: o.last_name,
          phone: o.phone,
          email: o.email,
          shipping_street: o.shipping_street,
          shipping_city: o.shipping_city,
          shipping_postal_code: o.shipping_postal_code,
          shipping_province: o.shipping_province,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function onSaveStatus() {
    if (!orderId || !order || !nextStatus || nextStatus === order.status) {
      toast.error("Choose a new status to update.");
      return;
    }
    setSaving(true);
    const res = await updateOrderStatusAdmin(orderId, nextStatus, note || undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Update failed.");
      return;
    }
    setNote("");
    if (res.stockRestored) {
      toast.success("Status updated — stock restored to inventory.");
    } else {
      toast.success("Status updated.");
    }
    await load();
  }

  async function onSaveInternalNote() {
    if (!orderId) return;
    setSavingInternalNote(true);
    const res = await updateOrderInternalNoteAdmin(orderId, internalNote);
    setSavingInternalNote(false);
    if (!res.ok) {
      toast.error(res.error ?? "Save failed.");
      return;
    }
    toast.success("Internal note saved.");
    await load();
  }

  async function onSaveShipping() {
    if (!orderId) return;
    setSavingShipping(true);
    const res = await updateOrderShippingAdmin(orderId, shippingForm);
    setSavingShipping(false);
    if (!res.ok) {
      toast.error(res.error ?? "Save failed.");
      return;
    }
    toast.success("Shipping details updated.");
    setShippingEdit(false);
    await load();
  }

  async function onDeleteOrder() {
    if (!orderId) return;
    setDeleting(true);
    const res = await deleteOrderAdmin(orderId);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Delete failed.");
      return;
    }
    toast.success(
      res.stockRestored ? "Order deleted — stock restored to inventory." : "Order deleted.",
    );
    navigate("/dashboard/orders", { replace: true });
  }

  useEffect(() => {
    if (!orderId) {
      toast.error("Invalid order link.");
    }
  }, [orderId]);

  if (!orderId) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Invalid order link.
      </p>
    );
  }

  const orderRef = order?.order_number ?? orderId.slice(0, 8);

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title={order?.order_number ? `Order ${order.order_number}` : "Order detail"}
        description="Line items, shipping snapshot, packing slip, and fulfillment status."
        backLink={{ to: "/dashboard/orders", label: "All orders" }}
        actions={
          order ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => printOrderPackingSlip()}>
                <Printer className="mr-2 h-4 w-4" />
                Print slip
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete order
              </Button>
            </div>
          ) : null
        }
      />

      <AdminConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => !deleting && setDeleteOpen(o)}
        title="Delete this order?"
        subtitle={
          <>
            Order <span className="font-mono font-medium text-foreground">{orderRef}</span> and all
            related line items will be removed permanently. Variant stock will be returned to inventory if not already restored.
          </>
        }
        busy={deleting}
        onConfirm={() => void onDeleteOrder()}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading order…
        </div>
      ) : !order ? (
        <p className="text-sm text-muted-foreground">Order not found.</p>
      ) : (
        <>
          <OrderPackingSlip order={order} items={items} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className={cn(ADMIN_LIST_CARD_CLASS, "lg:col-span-2")}>
              <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Totals in {order.currency}.</CardDescription>
              </CardHeader>
              <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS)}>
                <AdminDetailGrid>
                  <AdminDetailField label="Status">
                    <Badge variant={orderStatusVariant(order.status)} className="capitalize">
                      {formatOrderStatus(order.status)}
                    </Badge>
                  </AdminDetailField>
                  <AdminDetailField label="Payment method">
                    <span className="uppercase">{order.payment_method}</span>
                  </AdminDetailField>
                  <AdminDetailField label="Subtotal">
                    <span className="tabular-nums">
                      {formatMinorUnits(order.subtotal_cents, order.currency)}
                    </span>
                  </AdminDetailField>
                  <AdminDetailField label="Shipping">
                    <span className="tabular-nums">
                      {formatMinorUnits(order.shipping_cents, order.currency)}
                    </span>
                  </AdminDetailField>
                  <AdminDetailField label="Discount">
                    <span className="tabular-nums">
                      {formatMinorUnits(order.discount_cents, order.currency)}
                    </span>
                  </AdminDetailField>
                  <AdminDetailField label="Total">
                    <span className="text-lg font-semibold tabular-nums">
                      {formatMinorUnits(order.total_cents, order.currency)}
                    </span>
                  </AdminDetailField>
                </AdminDetailGrid>
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
                  <NativeSelect
                    id="status-select"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {formatOrderStatus(s)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={noteId}>Timeline note (optional)</Label>
                  <AdminTextarea
                    id={noteId}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. Shipped via TCS, tracking sent by email"
                  />
                </div>
                <Button type="button" size="sm" className="w-full" disabled={saving} onClick={() => void onSaveStatus()}>
                  {saving ? "Saving…" : "Save status"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className={ADMIN_LIST_CARD_CLASS}>
            <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Customer & shipping</CardTitle>
                  <CardDescription>
                    {shippingEdit ? "Edit courier / accounting details." : "Snapshot from checkout."}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShippingEdit((v) => !v)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {shippingEdit ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS)}>
              {shippingEdit ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ship-first">First name</Label>
                    <Input
                      id="ship-first"
                      value={shippingForm.first_name}
                      onChange={(e) => setShippingForm((f) => ({ ...f, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-last">Last name</Label>
                    <Input
                      id="ship-last"
                      value={shippingForm.last_name}
                      onChange={(e) => setShippingForm((f) => ({ ...f, last_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-phone">Phone</Label>
                    <Input
                      id="ship-phone"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-email">Email</Label>
                    <Input
                      id="ship-email"
                      type="email"
                      value={shippingForm.email}
                      onChange={(e) => setShippingForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ship-street">Street address</Label>
                    <Input
                      id="ship-street"
                      value={shippingForm.shipping_street}
                      onChange={(e) => setShippingForm((f) => ({ ...f, shipping_street: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-city">City</Label>
                    <Input
                      id="ship-city"
                      value={shippingForm.shipping_city}
                      onChange={(e) => setShippingForm((f) => ({ ...f, shipping_city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-province">Province</Label>
                    <Input
                      id="ship-province"
                      value={shippingForm.shipping_province}
                      onChange={(e) => setShippingForm((f) => ({ ...f, shipping_province: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-postal">Postal code</Label>
                    <Input
                      id="ship-postal"
                      value={shippingForm.shipping_postal_code}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, shipping_postal_code: e.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingShipping}
                      onClick={() => void onSaveShipping()}
                    >
                      {savingShipping ? "Saving…" : "Save shipping"}
                    </Button>
                  </div>
                </div>
              ) : (
                <AdminDetailGrid>
                  <AdminDetailField label="Email">{order.email || "—"}</AdminDetailField>
                  <AdminDetailField label="Phone">{order.phone || "—"}</AdminDetailField>
                  <AdminDetailField label="Name" span={3}>
                    {[order.first_name, order.last_name].filter(Boolean).join(" ") || "—"}
                  </AdminDetailField>
                  <AdminDetailField label="Address" span={3}>
                    <span className="whitespace-pre-wrap font-normal leading-relaxed">
                      {[
                        order.shipping_street,
                        [order.shipping_city, order.shipping_province, order.shipping_postal_code]
                          .filter(Boolean)
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join("\n") || "—"}
                    </span>
                  </AdminDetailField>
                  {order.customer_note ? (
                    <AdminDetailField label="Customer note" span={3}>
                      <span className="font-normal leading-relaxed">{order.customer_note}</span>
                    </AdminDetailField>
                  ) : null}
                </AdminDetailGrid>
              )}
            </CardContent>
          </Card>

          <Card className={ADMIN_LIST_CARD_CLASS}>
            <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
              <CardTitle>Internal admin note</CardTitle>
              <CardDescription>Private — never shown to the customer or on the storefront.</CardDescription>
            </CardHeader>
            <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "space-y-4")}>
              <AdminTextarea
                id={internalNoteId}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={4}
                placeholder="e.g. Customer called — change address before dispatch"
              />
              <Button
                type="button"
                size="sm"
                disabled={savingInternalNote}
                onClick={() => void onSaveInternalNote()}
              >
                {savingInternalNote ? "Saving…" : "Save internal note"}
              </Button>
            </CardContent>
          </Card>

          {(() => {
            const snap = order.checkout_snapshot;
            const delivery =
              snap && typeof snap === "object"
                ? (snap as Record<string, unknown>).delivery
                : null;
            if (!delivery || typeof delivery !== "object") return null;
            const d = delivery as Record<string, unknown>;
            const thresholds = d.free_delivery_thresholds_paisa;
            const thresholdLabel =
              Array.isArray(thresholds) && thresholds.length > 0
                ? thresholds.map((x) => String(x)).join(", ")
                : "—";
            return (
              <Card className={ADMIN_LIST_CARD_CLASS}>
                <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
                  <CardTitle>Delivery rules at checkout</CardTitle>
                  <CardDescription>
                    Snapshot of store delivery settings used to compute this order (immutable record).
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS)}>
                  <AdminDetailGrid>
                    <AdminDetailField label="Standard delivery">
                      {typeof d.standard_delivery_paisa === "number"
                        ? formatMinorUnits(d.standard_delivery_paisa, "PKR")
                        : "—"}
                    </AdminDetailField>
                    <AdminDetailField label="Currency">
                      {typeof d.standard_delivery_currency === "string"
                        ? d.standard_delivery_currency
                        : "—"}
                    </AdminDetailField>
                    <AdminDetailField label="Free-delivery thresholds" span={3}>
                      <span className="font-mono text-xs">{thresholdLabel}</span>
                    </AdminDetailField>
                    <AdminDetailField label="Merchandise subtotal">
                      {typeof d.merchandise_subtotal_paisa === "number"
                        ? formatMinorUnits(d.merchandise_subtotal_paisa, order.currency)
                        : "—"}
                    </AdminDetailField>
                    <AdminDetailField label="Shipping charged">
                      {typeof d.shipping_charged_paisa === "number"
                        ? formatMinorUnits(d.shipping_charged_paisa, order.currency)
                        : "—"}
                    </AdminDetailField>
                    <AdminDetailField label="Free shipping applied">
                      {d.free_shipping_applied === true
                        ? "Yes"
                        : d.free_shipping_applied === false
                          ? "No"
                          : "—"}
                    </AdminDetailField>
                  </AdminDetailGrid>
                </CardContent>
              </Card>
            );
          })()}

          <Card className={ADMIN_LIST_CARD_CLASS}>
            <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
              <CardTitle>Line items</CardTitle>
              <CardDescription>{items.length} product line{items.length === 1 ? "" : "s"}.</CardDescription>
            </CardHeader>
            <CardContent className={ADMIN_LIST_CARD_CONTENT_CLASS}>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No line items.</p>
              ) : (
                <TableContainer>
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className={ADMIN_TABLE_HEAD}>
                        <th className={adminTh()}>Product</th>
                        <th className={adminTh()}>SKU</th>
                        <th className={adminTh()}>Unit</th>
                        <th className={adminTh()}>Compare</th>
                        <th className={adminTh()}>Qty</th>
                        <th className={adminTh()}>Stock @ order</th>
                        <th className={adminThEnd()}>Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((line) => (
                        <tr key={line.id} className={ADMIN_TABLE_ROW}>
                          <td className={adminTd()}>
                            <div className="font-medium">{line.product_name_snapshot}</div>
                            {line.product_slug_snapshot ? (
                              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {line.product_slug_snapshot}
                              </div>
                            ) : null}
                          </td>
                          <td className={adminTd("font-mono text-xs")}>{line.sku_snapshot}</td>
                          <td className={adminTd("tabular-nums")}>
                            {formatMinorUnits(line.unit_price_cents, order.currency)}
                          </td>
                          <td className={adminTd("tabular-nums")}>
                            {line.compare_at_unit_price_cents != null
                              ? formatMinorUnits(line.compare_at_unit_price_cents, order.currency)
                              : "—"}
                          </td>
                          <td className={adminTd("tabular-nums")}>{line.quantity}</td>
                          <td className={adminTd("text-xs tabular-nums")}>
                            {line.inventory_on_hand_before != null &&
                            line.inventory_reserved_before != null ? (
                              <>
                                {line.inventory_on_hand_before} on hand · {line.inventory_reserved_before}{" "}
                                reserved
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={adminTd("tabular-nums font-medium")}>
                            {formatMinorUnits(line.line_subtotal_cents, order.currency)}
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
              <CardDescription>Append-only history from checkout and manual updates.</CardDescription>
            </CardHeader>
            <CardContent className={ADMIN_LIST_CARD_CONTENT_CLASS}>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history rows yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
                    >
                      <div>
                        <Badge variant={orderStatusVariant(h.status)} className="capitalize">
                          {formatOrderStatus(h.status)}
                        </Badge>
                        {h.note ? (
                          <p className="mt-2 text-muted-foreground">{h.note}</p>
                        ) : null}
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">
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

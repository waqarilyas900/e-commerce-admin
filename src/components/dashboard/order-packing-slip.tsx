import type { OrderItemRow, OrderRow } from "@/lib/supabase/orders";
import { formatMinorUnits } from "@/lib/format-money";
import { formatOrderStatus } from "@/lib/order-status";

type OrderPackingSlipProps = {
  order: OrderRow;
  items: OrderItemRow[];
};

export function OrderPackingSlip({ order, items }: OrderPackingSlipProps) {
  const ref = order.order_number ?? order.id.slice(0, 8);
  const customerName = [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const address = [
    order.shipping_street,
    [order.shipping_city, order.shipping_province, order.shipping_postal_code]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div id="order-packing-slip" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #order-packing-slip, #order-packing-slip * { visibility: visible; }
          #order-packing-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            font-family: system-ui, sans-serif;
            font-size: 12px;
            color: #111;
          }
        }
      `}</style>
      <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Packing slip — {ref}</h1>
      <p style={{ margin: "4px 0" }}>
        <strong>Status:</strong> {formatOrderStatus(order.status)} · <strong>Payment:</strong>{" "}
        {order.payment_method.toUpperCase()}
      </p>
      <p style={{ margin: "4px 0" }}>
        <strong>Placed:</strong> {new Date(order.created_at).toLocaleString()}
      </p>
      <hr style={{ margin: "16px 0" }} />
      <h2 style={{ fontSize: "14px", marginBottom: "8px" }}>Ship to</h2>
      <p style={{ margin: "2px 0", whiteSpace: "pre-wrap" }}>
        {customerName}
        {"\n"}
        {order.phone}
        {"\n"}
        {order.email}
        {"\n"}
        {address}
      </p>
      {order.customer_note ? (
        <>
          <h2 style={{ fontSize: "14px", margin: "16px 0 8px" }}>Customer note</h2>
          <p style={{ margin: 0 }}>{order.customer_note}</p>
        </>
      ) : null}
      <hr style={{ margin: "16px 0" }} />
      <h2 style={{ fontSize: "14px", marginBottom: "8px" }}>Items</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 4px" }}>
              Product
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 4px" }}>
              SKU
            </th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: "6px 4px" }}>
              Qty
            </th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: "6px 4px" }}>
              Line
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((line) => (
            <tr key={line.id}>
              <td style={{ padding: "6px 4px", borderBottom: "1px solid #eee" }}>
                {line.product_name_snapshot}
              </td>
              <td style={{ padding: "6px 4px", borderBottom: "1px solid #eee", fontFamily: "monospace" }}>
                {line.sku_snapshot}
              </td>
              <td style={{ padding: "6px 4px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                {line.quantity}
              </td>
              <td style={{ padding: "6px 4px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                {formatMinorUnits(line.line_subtotal_cents, order.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: "16px", textAlign: "right", fontSize: "14px" }}>
        <strong>Total: {formatMinorUnits(order.total_cents, order.currency)}</strong>
      </p>
    </div>
  );
}

export function printOrderPackingSlip(): void {
  window.print();
}

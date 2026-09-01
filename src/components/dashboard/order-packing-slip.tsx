import type { OrderItemRow, OrderRow } from "@/lib/supabase/orders";
import { APP_LOGO_SRC } from "@/config/brand";
import { formatMinorUnits } from "@/lib/format-money";
import { formatOrderStatus } from "@/lib/order-status";

export type PackingSlipStoreInfo = {
  storeName: string;
  supportPhone?: string;
  supportEmail?: string;
};

type OrderPackingSlipProps = {
  order: OrderRow;
  items: OrderItemRow[];
  store?: PackingSlipStoreInfo;
};

const ACCENT = "#E0703A";
const INK = "#1C1D1D";
const MUTED = "#6B6B68";

export function OrderPackingSlip({ order, items, store }: OrderPackingSlipProps) {
  const ref = order.order_number ?? order.id.slice(0, 8).toUpperCase();
  const customerName = [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const cityLine = [order.shipping_city, order.shipping_province, order.shipping_postal_code]
    .filter(Boolean)
    .join(", ");
  const logoSrc =
    typeof window !== "undefined" ? `${window.location.origin}${APP_LOGO_SRC}` : APP_LOGO_SRC;
  const storeName = store?.storeName?.trim() || "SimpleCart Store";

  return (
    <div id="order-packing-slip" className="hidden print:block">
      <style>{`
        @media print {
          @page { margin: 14mm; size: A4; }
          body * { visibility: hidden; }
          #order-packing-slip, #order-packing-slip * { visibility: visible; }
          #order-packing-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-sizing: border-box;
            padding: 0;
            font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.45;
            color: ${INK};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          paddingBottom: "16px",
          borderBottom: `3px solid ${ACCENT}`,
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
          <img
            src={logoSrc}
            alt={storeName}
            style={{ height: "52px", width: "auto", maxWidth: "220px", objectFit: "contain" }}
          />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "10pt",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            Packing slip
          </div>
          <div style={{ fontSize: "22pt", fontWeight: 700, fontFamily: "ui-monospace, monospace", marginTop: "4px" }}>
            {ref}
          </div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <section
          style={{
            border: `1px solid #ddd`,
            borderRadius: "8px",
            padding: "14px 16px",
            background: "#fafafa",
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "9pt",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            Ship to
          </h2>
          <p style={{ margin: 0, fontSize: "13pt", fontWeight: 700 }}>{customerName}</p>
          {order.phone ? <p style={{ margin: "6px 0 0", fontWeight: 600 }}>{order.phone}</p> : null}
          {order.email ? <p style={{ margin: "4px 0 0", color: MUTED, fontSize: "10pt" }}>{order.email}</p> : null}
          {order.shipping_street ? <p style={{ margin: "10px 0 0" }}>{order.shipping_street}</p> : null}
          {cityLine ? <p style={{ margin: "4px 0 0" }}>{cityLine}</p> : null}
        </section>

        <section
          style={{
            border: `1px solid #ddd`,
            borderRadius: "8px",
            padding: "14px 16px",
          }}
        >
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "9pt",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            Order details
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
            <tbody>
              <tr>
                <td style={{ padding: "3px 0", color: MUTED, width: "42%" }}>Status</td>
                <td style={{ padding: "3px 0", fontWeight: 600 }}>{formatOrderStatus(order.status)}</td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: MUTED }}>Payment</td>
                <td style={{ padding: "3px 0", fontWeight: 600 }}>{order.payment_method.toUpperCase()}</td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: MUTED }}>Placed</td>
                <td style={{ padding: "3px 0" }}>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {order.customer_note ? (
        <section
          style={{
            border: `1px dashed ${ACCENT}`,
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "20px",
            background: "#fff8f4",
          }}
        >
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: "6px",
            }}
          >
            Customer note
          </div>
          <p style={{ margin: 0 }}>{order.customer_note}</p>
        </section>
      ) : null}

      <section>
        <h2
          style={{
            margin: "0 0 10px",
            fontSize: "9pt",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          Items to pack ({items.reduce((n, l) => n + l.quantity, 0)} units)
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: INK, color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "9pt", fontWeight: 600 }}>
                Product
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "9pt", fontWeight: 600 }}>
                SKU
              </th>
              <th style={{ textAlign: "center", padding: "10px 12px", fontSize: "9pt", fontWeight: 600, width: "56px" }}>
                Qty
              </th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "9pt", fontWeight: 600, width: "96px" }}>
                Line total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((line, i) => (
              <tr key={line.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7f7f7" }}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e8e8e8", fontWeight: 500 }}>
                  {line.product_name_snapshot}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #e8e8e8",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "10pt",
                  }}
                >
                  {line.sku_snapshot}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #e8e8e8",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "12pt",
                  }}
                >
                  {line.quantity}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e8e8e8", textAlign: "right" }}>
                  {formatMinorUnits(line.line_subtotal_cents, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
        <div style={{ minWidth: "240px", borderTop: `2px solid ${INK}`, paddingTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", marginBottom: "4px" }}>
            <span style={{ color: MUTED }}>Subtotal</span>
            <span>{formatMinorUnits(order.subtotal_cents, order.currency)}</span>
          </div>
          {order.discount_cents > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", marginBottom: "4px" }}>
              <span style={{ color: MUTED }}>Discount</span>
              <span>−{formatMinorUnits(order.discount_cents, order.currency)}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", marginBottom: "8px" }}>
            <span style={{ color: MUTED }}>Shipping</span>
            <span>{formatMinorUnits(order.shipping_cents, order.currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", fontSize: "14pt", fontWeight: 700, borderTop: "1px solid #ddd", paddingTop: "8px" }}>
            <span>Order total</span>
            <span>{formatMinorUnits(order.total_cents, order.currency)}</span>
          </div>
        </div>
      </div>

      <footer
        style={{
          marginTop: "28px",
          paddingTop: "14px",
          borderTop: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "16px",
          fontSize: "9pt",
          color: MUTED,
        }}
      >
        <div>
          <strong style={{ color: INK }}>{storeName}</strong>
          {store?.supportPhone ? <div style={{ marginTop: "4px" }}>Tel: {store.supportPhone}</div> : null}
          {store?.supportEmail ? <div>{store.supportEmail}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>Thank you for your order.</div>
      </footer>
    </div>
  );
}

export function printOrderPackingSlip(): void {
  window.print();
}

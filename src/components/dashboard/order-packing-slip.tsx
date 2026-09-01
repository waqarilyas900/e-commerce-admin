import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { OrderItemRow, OrderRow, PaymentMethod } from "@/lib/supabase/orders";
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
const BORDER = "#D8D8D6";
const PANEL = "#F6F5F3";

function formatPaymentLabel(method: PaymentMethod): string {
  switch (method) {
    case "cod":
      return "Cash on delivery (COD)";
    case "card":
      return "Card payment";
    case "bank_transfer":
      return "Bank transfer";
    case "wallet":
      return "Wallet";
    default:
      return method;
  }
}

function packingSlipQrUrl(orderId: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://admin.simplecartstore.com";
  return `${origin}/dashboard/orders/${orderId}`;
}

function sectionTitleStyle(): React.CSSProperties {
  return {
    margin: "0 0 10px",
    fontSize: "8pt",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: ACCENT,
  };
}

function panelStyle(): React.CSSProperties {
  return {
    border: `1px solid ${BORDER}`,
    borderRadius: "10px",
    padding: "14px 16px",
    background: "#fff",
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
  };
}

export function OrderPackingSlip({ order, items, store }: OrderPackingSlipProps) {
  const ref = order.order_number ?? order.id.slice(0, 8).toUpperCase();
  const customerName = [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const cityLine = [order.shipping_city, order.shipping_province, order.shipping_postal_code]
    .filter(Boolean)
    .join(", ");
  const logoSrc =
    typeof window !== "undefined" ? `${window.location.origin}${APP_LOGO_SRC}` : APP_LOGO_SRC;
  const storeName = store?.storeName?.trim() || "SimpleCart Store";
  const unitCount = items.reduce((n, l) => n + l.quantity, 0);
  const lineCount = items.length;
  const printedAt = useMemo(() => new Date().toLocaleString(), []);
  const isCod = order.payment_method === "cod";
  const qrTarget = packingSlipQrUrl(order.id);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(qrTarget, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: INK, light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qrTarget]);

  return (
    <div id="order-packing-slip" className="hidden print:block">
      <style>{`
        @media print {
          @page { margin: 12mm; size: A4; }
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
            font-size: 10.5pt;
            line-height: 1.45;
            color: ${INK};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Document banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          background: INK,
          color: "#fff",
          borderRadius: "10px 10px 0 0",
          padding: "10px 18px",
          fontSize: "8pt",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span>Packing &amp; dispatch slip</span>
        <span>Printed {printedAt}</span>
      </div>

      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "20px",
          padding: "18px 18px 16px",
          border: `1px solid ${BORDER}`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          marginBottom: "18px",
          background: PANEL,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <img
            src={logoSrc}
            alt={storeName}
            style={{ height: "48px", width: "auto", maxWidth: "210px", objectFit: "contain" }}
          />
          <div style={{ marginTop: "8px", fontSize: "11pt", fontWeight: 700 }}>{storeName}</div>
          {store?.supportPhone ? (
            <div style={{ marginTop: "2px", fontSize: "9pt", color: MUTED }}>{store.supportPhone}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "8pt", fontWeight: 600, letterSpacing: "0.12em", color: MUTED }}>
              Order reference
            </div>
            <div
              style={{
                fontSize: "24pt",
                fontWeight: 800,
                fontFamily: "ui-monospace, monospace",
                lineHeight: 1.1,
                marginTop: "2px",
                letterSpacing: "-0.02em",
              }}
            >
              {ref}
            </div>
            <div style={{ marginTop: "8px", fontSize: "8pt", color: MUTED, fontFamily: "ui-monospace, monospace" }}>
              ID {order.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: "8px",
              padding: "8px",
              background: "#fff",
              textAlign: "center",
            }}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code for order ${ref}`} width={96} height={96} style={{ display: "block" }} />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  background: "#eee",
                  borderRadius: "4px",
                }}
              />
            )}
            <div style={{ marginTop: "6px", fontSize: "7pt", fontWeight: 600, color: MUTED, maxWidth: 96 }}>
              Scan to open order
            </div>
          </div>
        </div>
      </header>

      {/* Meta row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr 0.85fr",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        <section style={panelStyle()}>
          <h2 style={sectionTitleStyle()}>Ship to</h2>
          <p style={{ margin: 0, fontSize: "14pt", fontWeight: 800, lineHeight: 1.25 }}>{customerName}</p>
          {order.phone ? (
            <p style={{ margin: "8px 0 0", fontWeight: 700, fontSize: "11pt" }}>{order.phone}</p>
          ) : null}
          {order.email ? (
            <p style={{ margin: "4px 0 0", color: MUTED, fontSize: "9pt" }}>{order.email}</p>
          ) : null}
          <div
            style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: `1px dashed ${BORDER}`,
              fontSize: "10pt",
            }}
          >
            {order.shipping_street ? <div>{order.shipping_street}</div> : null}
            {cityLine ? <div style={{ marginTop: "4px" }}>{cityLine}</div> : null}
          </div>
        </section>

        <section style={panelStyle()}>
          <h2 style={sectionTitleStyle()}>Order</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", color: MUTED }}>Status</td>
                <td style={{ padding: "4px 0", fontWeight: 700, textAlign: "right" }}>
                  {formatOrderStatus(order.status)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", color: MUTED }}>Placed</td>
                <td style={{ padding: "4px 0", textAlign: "right", fontSize: "9pt" }}>
                  {new Date(order.created_at).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", color: MUTED }}>Lines</td>
                <td style={{ padding: "4px 0", fontWeight: 700, textAlign: "right" }}>
                  {lineCount} SKU · {unitCount} units
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section
          style={{
            ...panelStyle(),
            borderColor: isCod ? ACCENT : BORDER,
            background: isCod ? "#fff9f5" : "#fff",
          }}
        >
          <h2 style={sectionTitleStyle()}>Payment</h2>
          <div
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: "6px",
              background: isCod ? ACCENT : INK,
              color: "#fff",
              fontSize: "9pt",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {formatPaymentLabel(order.payment_method)}
          </div>
          <div style={{ marginTop: "12px", fontSize: "18pt", fontWeight: 800 }}>
            {formatMinorUnits(order.total_cents, order.currency)}
          </div>
          <div style={{ marginTop: "4px", fontSize: "8pt", color: MUTED }}>
            {isCod ? "Collect on delivery" : "Prepaid order"}
          </div>
        </section>
      </div>

      {order.customer_note ? (
        <section
          style={{
            border: `1px dashed ${ACCENT}`,
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "18px",
            background: "#fff8f4",
          }}
        >
          <div style={sectionTitleStyle()}>Customer note</div>
          <p style={{ margin: 0, fontSize: "10pt" }}>{order.customer_note}</p>
        </section>
      ) : null}

      {/* Items */}
      <section style={{ marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h2 style={{ ...sectionTitleStyle(), margin: 0, color: MUTED }}>Pick list</h2>
          <span style={{ fontSize: "8pt", color: MUTED }}>Tick each line when packed</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${BORDER}` }}>
          <thead>
            <tr style={{ background: INK, color: "#fff" }}>
              <th style={{ width: "28px", padding: "9px 8px", fontSize: "8pt", fontWeight: 600 }}>#</th>
              <th style={{ width: "34px", padding: "9px 6px", fontSize: "8pt", fontWeight: 600 }}>✓</th>
              <th style={{ textAlign: "left", padding: "9px 12px", fontSize: "8pt", fontWeight: 600 }}>Product</th>
              <th style={{ textAlign: "left", padding: "9px 12px", fontSize: "8pt", fontWeight: 600 }}>SKU</th>
              <th style={{ textAlign: "center", padding: "9px 10px", fontSize: "8pt", fontWeight: 600, width: "52px" }}>
                Qty
              </th>
              <th style={{ textAlign: "right", padding: "9px 12px", fontSize: "8pt", fontWeight: 600, width: "92px" }}>
                Line
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((line, i) => (
              <tr key={line.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafaf9" }}>
                <td style={{ padding: "10px 8px", borderBottom: `1px solid ${BORDER}`, color: MUTED, fontSize: "9pt" }}>
                  {i + 1}
                </td>
                <td style={{ padding: "10px 6px", borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "14px",
                      height: "14px",
                      border: `1.5px solid ${INK}`,
                      borderRadius: "2px",
                    }}
                  />
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}>
                  {line.product_name_snapshot}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${BORDER}`,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "9.5pt",
                  }}
                >
                  {line.sku_snapshot}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    borderBottom: `1px solid ${BORDER}`,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "13pt",
                  }}
                >
                  {line.quantity}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, textAlign: "right" }}>
                  {formatMinorUnits(line.line_subtotal_cents, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals + signatures */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <section style={panelStyle()}>
          <h2 style={sectionTitleStyle()}>Fulfillment sign-off</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "8px" }}>
            <div>
              <div style={{ fontSize: "8pt", color: MUTED, marginBottom: "28px" }}>Packed by</div>
              <div style={{ borderBottom: `1px solid ${INK}`, height: "1px" }} />
            </div>
            <div>
              <div style={{ fontSize: "8pt", color: MUTED, marginBottom: "28px" }}>Checked by</div>
              <div style={{ borderBottom: `1px solid ${INK}`, height: "1px" }} />
            </div>
          </div>
          <div style={{ marginTop: "16px", fontSize: "8pt", color: MUTED }}>
            Date: _______________________
          </div>
        </section>

        <section style={{ ...panelStyle(), background: PANEL }}>
          <h2 style={sectionTitleStyle()}>Summary</h2>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: MUTED }}>Subtotal</span>
            <span>{formatMinorUnits(order.subtotal_cents, order.currency)}</span>
          </div>
          {order.discount_cents > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: MUTED }}>Discount</span>
              <span>−{formatMinorUnits(order.discount_cents, order.currency)}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: MUTED }}>Shipping</span>
            <span>{formatMinorUnits(order.shipping_cents, order.currency)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "10px",
              borderTop: `2px solid ${INK}`,
              fontSize: "14pt",
              fontWeight: 800,
            }}
          >
            <span>Total</span>
            <span>{formatMinorUnits(order.total_cents, order.currency)}</span>
          </div>
        </section>
      </div>

      <footer
        style={{
          marginTop: "22px",
          paddingTop: "12px",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "16px",
          fontSize: "8pt",
          color: MUTED,
        }}
      >
        <div>
          <strong style={{ color: INK, fontSize: "9pt" }}>{storeName}</strong>
          {store?.supportEmail ? <div style={{ marginTop: "3px" }}>{store.supportEmail}</div> : null}
          <div style={{ marginTop: "6px" }}>This document is for packing and dispatch — not a tax invoice.</div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontSize: "7.5pt" }}>
          {qrTarget}
        </div>
      </footer>
    </div>
  );
}

export function printOrderPackingSlip(): void {
  window.print();
}

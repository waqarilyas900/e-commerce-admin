import type { OrderItemRow, OrderRow } from "@/lib/supabase/orders";
import { formatMinorUnits } from "@/lib/format-money";
import { formatOrderStatus } from "@/lib/order-status";

export function formatOrderDispatchText(
  order: OrderRow,
  items: OrderItemRow[] = [],
): string {
  const ref = order.order_number ?? order.id.slice(0, 8);
  const name = [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const address = [
    order.shipping_street,
    [order.shipping_city, order.shipping_province, order.shipping_postal_code]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const lines: string[] = [
    `Order: ${ref}`,
    `Status: ${formatOrderStatus(order.status)}`,
    `Name: ${name}`,
    `Phone: ${order.phone || "—"}`,
    `Email: ${order.email || "—"}`,
    `Address:\n${address || "—"}`,
  ];

  if (items.length > 0) {
    lines.push("", "Items:");
    for (const line of items) {
      lines.push(
        `• ${line.product_name_snapshot} × ${line.quantity} (${line.sku_snapshot}) — ${formatMinorUnits(line.line_subtotal_cents, order.currency)}`,
      );
    }
  }

  lines.push(
    "",
    `Total: ${formatMinorUnits(order.total_cents, order.currency)} (${order.payment_method.toUpperCase()})`,
  );

  if (order.customer_note) {
    lines.push("", `Customer note: ${order.customer_note}`);
  }

  return lines.join("\n");
}

export function formatOrderListCopyText(order: OrderRow): string {
  const ref = order.order_number ?? order.id.slice(0, 8);
  const name = [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const city = [order.shipping_city, order.shipping_province].filter(Boolean).join(", ");
  return [
    `Order ${ref}`,
    name,
    order.phone || "—",
    city || "—",
    formatMinorUnits(order.total_cents, order.currency),
  ].join(" | ");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

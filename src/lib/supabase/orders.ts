import { supabase } from "@/lib/supabase/client";

/** Matches public.order_status after domain_enums migration. */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "cod" | "card" | "bank_transfer" | "wallet";

export type OrderRow = {
  id: string;
  user_id: string | null;
  email: string;
  status: OrderStatus;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  discount_id: string | null;
  shipping_method_id: string | null;
  order_number: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  payment_method: PaymentMethod;
  customer_note: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_variant_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  option_values_snapshot: Record<string, unknown>;
};

export type OrderStatusHistoryRow = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};

const ORDER_SELECT = [
  "id",
  "user_id",
  "email",
  "status",
  "subtotal_cents",
  "discount_cents",
  "shipping_cents",
  "total_cents",
  "currency",
  "discount_id",
  "shipping_method_id",
  "order_number",
  "first_name",
  "last_name",
  "phone",
  "shipping_street",
  "shipping_city",
  "shipping_postal_code",
  "shipping_province",
  "payment_method",
  "customer_note",
  "created_at",
  "updated_at",
].join(", ");

function logOrders(op: string, message: string | undefined) {
  if (!message) return;
  console.error(`[orders] ${op}`, message);
}

export async function fetchOrdersAdmin(options?: {
  limit?: number;
  status?: OrderStatus | "all";
}): Promise<OrderRow[]> {
  if (!supabase) return [];
  const limit = Math.min(options?.limit ?? 100, 500);
  let q = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.status && options.status !== "all") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    logOrders("fetchOrdersAdmin", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderRow[];
}

export async function fetchOrderByIdAdmin(
  orderId: string,
): Promise<OrderRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    logOrders("fetchOrderByIdAdmin", error.message);
    return null;
  }
  return data as OrderRow | null;
}

export async function fetchOrderItemsAdmin(
  orderId: string,
): Promise<OrderItemRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_variant_id, product_name_snapshot, sku_snapshot, unit_price_cents, quantity, option_values_snapshot",
    )
    .eq("order_id", orderId);
  if (error) {
    logOrders("fetchOrderItemsAdmin", error.message);
    return [];
  }
  return (data ?? []) as OrderItemRow[];
}

export async function fetchOrderStatusHistoryAdmin(
  orderId: string,
): Promise<OrderStatusHistoryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("order_status_history")
    .select("id, order_id, status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) {
    logOrders("fetchOrderStatusHistoryAdmin", error.message);
    return [];
  }
  return (data ?? []) as OrderStatusHistoryRow[];
}

export async function updateOrderStatusAdmin(
  orderId: string,
  nextStatus: OrderStatus,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const now = new Date().toISOString();
  const { error: uErr } = await supabase
    .from("orders")
    .update({ status: nextStatus, updated_at: now })
    .eq("id", orderId);
  if (uErr) {
    logOrders("updateOrderStatusAdmin", uErr.message);
    return { ok: false, error: uErr.message };
  }
  const { error: hErr } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: nextStatus,
    note: note?.trim() || null,
  });
  if (hErr) {
    logOrders("order_status_history insert", hErr.message);
    return { ok: false, error: hErr.message };
  }
  return { ok: true };
}

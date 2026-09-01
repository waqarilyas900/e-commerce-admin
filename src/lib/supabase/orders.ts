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
  admin_internal_note: string;
  /** Point-in-time JSON from checkout (e.g. delivery rules used). */
  checkout_snapshot: Record<string, unknown>;
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
  product_slug_snapshot: string;
  primary_image_url_snapshot: string;
  compare_at_unit_price_cents: number | null;
  line_subtotal_cents: number;
  inventory_on_hand_before: number | null;
  inventory_reserved_before: number | null;
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
  "admin_internal_note",
  "checkout_snapshot",
  "created_at",
  "updated_at",
].join(", ");

function logOrders(op: string, message: string | undefined) {
  if (!message) return;
  console.error(`[orders] ${op}`, message);
}

import { logAdminAction } from "@/lib/audit-log";

const RESTORE_STATUSES: OrderStatus[] = ["cancelled", "refunded"];

async function restoreOrderInventoryAdmin(
  orderId: string,
): Promise<{ ok: boolean; error?: string; alreadyRestored?: boolean; restoredLines?: number }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { data, error } = await supabase.rpc("restore_order_inventory", {
    p_order_id: orderId,
  });
  if (error) {
    logOrders("restoreOrderInventoryAdmin", error.message);
    return { ok: false, error: error.message };
  }
  const payload = data as {
    ok?: boolean;
    error?: string;
    already_restored?: boolean;
    restored_lines?: number;
  } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "Inventory restore failed" };
  }
  return {
    ok: true,
    alreadyRestored: payload.already_restored === true,
    restoredLines: payload.restored_lines ?? 0,
  };
}

export type OrdersPageResult = {
  rows: OrderRow[];
  total: number;
};

export async function fetchOrdersAdminPaginated(options: {
  page: number;
  pageSize: number;
  status?: OrderStatus | "all";
  search?: string;
}): Promise<OrdersPageResult> {
  if (!supabase) return { rows: [], total: 0 };
  const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
  const page = Math.max(options.page, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.status && options.status !== "all") {
    q = q.eq("status", options.status);
  }

  const search = options.search?.trim();
  if (search) {
    const term = `%${search}%`;
    q = q.or(
      [
        `order_number.ilike.${term}`,
        `email.ilike.${term}`,
        `phone.ilike.${term}`,
        `first_name.ilike.${term}`,
        `last_name.ilike.${term}`,
      ].join(","),
    );
  }

  const { data, error, count } = await q.range(from, to);
  if (error) {
    logOrders("fetchOrdersAdminPaginated", error.message);
    return { rows: [], total: 0 };
  }
  return { rows: (data ?? []) as unknown as OrderRow[], total: count ?? 0 };
}

export async function fetchOrdersAdminForExport(options?: {
  status?: OrderStatus | "all";
  search?: string;
  limit?: number;
}): Promise<OrderRow[]> {
  if (!supabase) return [];
  const limit = Math.min(options?.limit ?? 5000, 5000);
  let q = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.status && options.status !== "all") {
    q = q.eq("status", options.status);
  }
  const search = options?.search?.trim();
  if (search) {
    const term = `%${search}%`;
    q = q.or(
      [
        `order_number.ilike.${term}`,
        `email.ilike.${term}`,
        `phone.ilike.${term}`,
        `first_name.ilike.${term}`,
        `last_name.ilike.${term}`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) {
    logOrders("fetchOrdersAdminForExport", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderRow[];
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

export async function fetchOrdersByUserIdAdmin(
  userId: string,
  options?: { limit?: number },
): Promise<OrderRow[]> {
  if (!supabase) return [];
  const limit = Math.min(options?.limit ?? 100, 300);
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logOrders("fetchOrdersByUserIdAdmin", error.message);
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
      [
        "id",
        "order_id",
        "product_variant_id",
        "product_name_snapshot",
        "sku_snapshot",
        "unit_price_cents",
        "quantity",
        "option_values_snapshot",
        "product_slug_snapshot",
        "primary_image_url_snapshot",
        "compare_at_unit_price_cents",
        "line_subtotal_cents",
        "inventory_on_hand_before",
        "inventory_reserved_before",
      ].join(", "),
    )
    .eq("order_id", orderId);
  if (error) {
    logOrders("fetchOrderItemsAdmin", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderItemRow[];
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

export async function deleteOrderAdmin(
  orderId: string,
): Promise<{ ok: boolean; error?: string; stockRestored?: boolean }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const restore = await restoreOrderInventoryAdmin(orderId);
  if (!restore.ok) {
    return { ok: false, error: restore.error ?? "Could not restore stock before delete." };
  }
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) {
    logOrders("deleteOrderAdmin", error.message);
    return { ok: false, error: error.message };
  }
  await logAdminAction("delete", "orders", orderId, {
    stock_restored: !restore.alreadyRestored,
    restored_lines: restore.restoredLines ?? 0,
  });
  return { ok: true, stockRestored: !restore.alreadyRestored };
}

export async function updateOrderInternalNoteAdmin(
  orderId: string,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase
    .from("orders")
    .update({ admin_internal_note: note.trim(), updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) {
    logOrders("updateOrderInternalNoteAdmin", error.message);
    return { ok: false, error: error.message };
  }
  await logAdminAction("update_internal_note", "orders", orderId);
  return { ok: true };
}

export type OrderShippingPatch = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_province?: string;
};

export async function updateOrderShippingAdmin(
  orderId: string,
  patch: OrderShippingPatch,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase
    .from("orders")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) {
    logOrders("updateOrderShippingAdmin", error.message);
    return { ok: false, error: error.message };
  }
  await logAdminAction("update_shipping", "orders", orderId, patch as Record<string, unknown>);
  return { ok: true };
}

export async function updateOrderStatusAdmin(
  orderId: string,
  nextStatus: OrderStatus,
  note?: string,
): Promise<{ ok: boolean; error?: string; stockRestored?: boolean }> {
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

  let stockRestored = false;
  if (RESTORE_STATUSES.includes(nextStatus)) {
    const restore = await restoreOrderInventoryAdmin(orderId);
    if (!restore.ok) {
      return { ok: false, error: restore.error ?? "Status saved but stock restore failed." };
    }
    stockRestored = !restore.alreadyRestored && (restore.restoredLines ?? 0) > 0;
  }

  await logAdminAction("update_status", "orders", orderId, {
    status: nextStatus,
    stock_restored: stockRestored,
  });
  return { ok: true, stockRestored };
}

import { supabase } from "@/lib/supabase/client";

export type DashboardStats = {
  activeProductCount: number | null;
  variantSkuCount: number | null;
  collectionCount: number | null;
  openOrderCount: number | null;
  pendingReviewCount: number | null;
  wishlistSaveCount: number | null;
  restockQueuePendingCount: number | null;
};

const OPEN_STATUSES = [
  "pending",
  "confirmed",
  "paid",
  "processing",
] as const;

function logStats(op: string, message: string | undefined) {
  if (!message) return;
  console.error(`[dashboard-stats] ${op}`, message);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (!supabase) {
    return {
      activeProductCount: null,
      variantSkuCount: null,
      collectionCount: null,
      openOrderCount: null,
      pendingReviewCount: null,
      wishlistSaveCount: null,
      restockQueuePendingCount: null,
    };
  }

  const [
    activeProducts,
    variants,
    collections,
    openOrders,
    pendingReviews,
    wishlistSaves,
    restockQueuePending,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("product_variants").select("id", { count: "exact", head: true }),
    supabase.from("collections").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", [...OPEN_STATUSES]),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }),
    supabase
      .from("restock_notification_queue")
      .select("id", { count: "exact", head: true })
      .is("processed_at", null),
  ]);

  if (activeProducts.error)
    logStats("products count", activeProducts.error.message);
  if (variants.error) logStats("variants count", variants.error.message);
  if (collections.error)
    logStats("collections count", collections.error.message);
  if (openOrders.error) logStats("orders count", openOrders.error.message);
  if (pendingReviews.error)
    logStats("reviews count", pendingReviews.error.message);
  if (wishlistSaves.error)
    logStats("wishlist count", wishlistSaves.error.message);
  if (restockQueuePending.error)
    logStats("restock queue count", restockQueuePending.error.message);

  return {
    activeProductCount: activeProducts.count ?? null,
    variantSkuCount: variants.count ?? null,
    collectionCount: collections.count ?? null,
    openOrderCount: openOrders.count ?? null,
    pendingReviewCount: pendingReviews.count ?? null,
    wishlistSaveCount: wishlistSaves.error ? null : wishlistSaves.count ?? null,
    restockQueuePendingCount: restockQueuePending.error
      ? null
      : restockQueuePending.count ?? null,
  };
}

export type RecentOrderLine = {
  id: string;
  order_number: string | null;
  email: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

export async function fetchRecentOrdersForActivity(
  limit = 8,
): Promise<RecentOrderLine[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, email, total_cents, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logStats("fetchRecentOrdersForActivity", error.message);
    return [];
  }
  return (data ?? []) as RecentOrderLine[];
}

export type OrdersInRangeStats = {
  orderCount: number;
  revenueCents: number;
  avgOrderCents: number;
};

export async function fetchOrdersAggregatesSince(
  sinceIso: string,
): Promise<OrdersInRangeStats> {
  if (!supabase) {
    return { orderCount: 0, revenueCents: 0, avgOrderCents: 0 };
  }
  const { data, error } = await supabase
    .from("orders")
    .select("total_cents, status")
    .gte("created_at", sinceIso);
  if (error) {
    logStats("fetchOrdersAggregatesSince", error.message);
    return { orderCount: 0, revenueCents: 0, avgOrderCents: 0 };
  }
  const rows = (data ?? []).filter(
    (r) =>
      (r as { status: string }).status !== "cancelled" &&
      (r as { status: string }).status !== "refunded",
  ) as { total_cents: number }[];
  const orderCount = rows.length;
  const revenueCents = rows.reduce((s, r) => s + (r.total_cents ?? 0), 0);
  const avgOrderCents =
    orderCount > 0 ? Math.round(revenueCents / orderCount) : 0;
  return { orderCount, revenueCents, avgOrderCents };
}

import { supabase } from "@/lib/supabase/client";

export type ReviewModerationStatus = "pending" | "approved" | "rejected";

export type ReviewAdminRow = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewModerationStatus;
  created_at: string;
  updated_at: string;
  product_name?: string | null;
};

function logReviews(op: string, message: string | undefined) {
  if (!message) return;
  console.error(`[reviews-admin] ${op}`, message);
}

export async function fetchReviewsAdmin(options?: {
  status?: ReviewModerationStatus | "all";
  limit?: number;
}): Promise<ReviewAdminRow[]> {
  if (!supabase) return [];
  const limit = Math.min(options?.limit ?? 100, 500);
  let q = supabase
    .from("reviews")
    .select("id, product_id, user_id, rating, title, body, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.status && options.status !== "all") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    logReviews("fetchReviewsAdmin", error.message);
    return [];
  }
  const rows = (data ?? []) as ReviewAdminRow[];
  const pids = [...new Set(rows.map((r) => r.product_id))];
  if (pids.length === 0) return rows;
  const { data: prows, error: pErr } = await supabase
    .from("products")
    .select("id, name")
    .in("id", pids);
  if (pErr) {
    logReviews("fetchReviewsAdmin products", pErr.message);
    return rows;
  }
  const nameById = new Map((prows ?? []).map((p) => [(p as { id: string }).id, (p as { name: string }).name]));
  return rows.map((r) => ({
    ...r,
    product_name: nameById.get(r.product_id) ?? null,
  }));
}

export async function updateReviewStatusAdmin(
  reviewId: string,
  status: ReviewModerationStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reviews")
    .update({ status, updated_at: now })
    .eq("id", reviewId);
  if (error) {
    logReviews("updateReviewStatusAdmin", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

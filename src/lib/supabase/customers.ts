import { supabase } from "@/lib/supabase/client";

export type PublicUserRow = {
  id: string;
  auth_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

function logCustomers(op: string, message: string | undefined) {
  if (!message) return;
  console.error(`[customers] ${op}`, message);
}

/** Customer profiles (requires users_select_admin policy). */
export async function fetchCustomersAdmin(limit = 200): Promise<PublicUserRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_id, first_name, last_name, phone, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 500));
  if (error) {
    logCustomers("fetchCustomersAdmin", error.message);
    return [];
  }
  return (data ?? []) as PublicUserRow[];
}

/** Order counts per user_id from recent orders (bounded query). */
export async function fetchOrderCountByUserIds(
  userIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!supabase || userIds.length === 0) return map;
  const { data, error } = await supabase
    .from("orders")
    .select("user_id")
    .not("user_id", "is", null)
    .in("user_id", userIds);
  if (error) {
    logCustomers("fetchOrderCountByUserIds", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const uid = (row as { user_id: string }).user_id;
    map.set(uid, (map.get(uid) ?? 0) + 1);
  }
  return map;
}

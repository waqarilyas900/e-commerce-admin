import { supabase } from "@/lib/supabase/client";

export type StoreSettingsRow = {
  id: number;
  store_name: string;
  support_email: string;
  default_currency: string;
  updated_at: string;
};

function logStore(op: string, message: string | undefined) {
  if (!message) return;
  console.error(`[store-settings] ${op}`, message);
}

export async function fetchStoreSettings(): Promise<StoreSettingsRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("store_settings")
    .select("id, store_name, support_email, default_currency, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    logStore("fetchStoreSettings", error.message);
    return null;
  }
  return data as StoreSettingsRow | null;
}

export async function updateStoreSettings(patch: {
  store_name?: string;
  support_email?: string;
  default_currency?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase
    .from("store_settings")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    logStore("updateStoreSettings", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

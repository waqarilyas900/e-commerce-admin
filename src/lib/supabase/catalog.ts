import { supabase } from "@/lib/supabase/client";
import type {
  ColorRow,
  CollectionRow,
  ProductAssetRow,
  ProductRow,
  ProductVariantDbRow,
  ProductVariantRow,
  SizeRow,
} from "@/lib/supabase/catalog-types";
import {
  optionDefinitionsFromDbRows,
  type VariantOptionSchemaEntry,
} from "@/lib/variant-option-schema";

let warnedMissingCatalog = false;

function isMissingSchemaError(msg: string | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("could not find the table") ||
    m.includes("schema cache") ||
    m.includes("pgrst205") ||
    m.includes("does not exist") ||
    m.includes("not found")
  );
}

/** Avoid spamming the console when the catalog schema is not present yet. */
function logCatalogIssue(op: string, message: string | undefined) {
  if (!message) return;
  if (isMissingSchemaError(message)) {
    if (!warnedMissingCatalog) {
      warnedMissingCatalog = true;
      console.warn(
        "[catalog] Catalog tables were not found. Deploy the storefront database schema to this project, then reload.",
      );
    }
    return;
  }
  console.error(`[catalog] ${op}`, message);
}

/** Singleton row (id = 1) — used for SKU prefix, etc. */
export async function fetchStoreNameForSku(): Promise<string> {
  if (!supabase) return "Store";
  const { data, error } = await supabase
    .from("store_settings")
    .select("store_name")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    logCatalogIssue("fetchStoreName", error.message);
    return "Store";
  }
  const name = (data as { store_name?: string } | null)?.store_name?.trim();
  return name || "Store";
}

export async function fetchCollections(): Promise<CollectionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, hero_image, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    logCatalogIssue("fetchCollections", error.message);
    return [];
  }
  return (data ?? []) as CollectionRow[];
}

export async function fetchProductsWithVariantCount(): Promise<
  (ProductRow & { variant_count: number })[]
> {
  if (!supabase) return [];
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(
      "id, slug, name, short_description, description, status, images, tags, rating, reviews_count, stock_total, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (pErr || !products) {
    logCatalogIssue("fetchProducts", pErr?.message);
    return [];
  }
  const plist = products as ProductRow[];
  if (!plist.length) return [];

  const ids = plist.map((p) => p.id);
  const { data: counts } = await supabase
    .from("product_variants")
    .select("product_id")
    .in("product_id", ids);

  const nByProduct = new Map<string, number>();
  for (const row of counts ?? []) {
    const pid = (row as { product_id: string }).product_id;
    nByProduct.set(pid, (nByProduct.get(pid) ?? 0) + 1);
  }

  return plist.map((p) => ({
    ...p,
    variant_count: nByProduct.get(p.id) ?? 0,
  }));
}

export async function fetchProductWithVariants(
  productId: string,
): Promise<{
  product: ProductRow;
  variants: ProductVariantRow[];
  collectionIds: string[];
  assets: ProductAssetRow[];
} | null> {
  if (!supabase) return null;
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select(
      "id, slug, name, short_description, description, status, images, tags, rating, reviews_count, stock_total, created_at, updated_at",
    )
    .eq("id", productId)
    .maybeSingle();
  if (pErr || !product) {
    logCatalogIssue("fetchProduct", pErr?.message);
    return null;
  }

  const { data: pcRows } = await supabase
    .from("product_collections")
    .select("collection_id")
    .eq("product_id", productId);
  const collectionIds = (pcRows ?? []).map(
    (r: { collection_id: string }) => r.collection_id,
  );

  const { data: assetRows } = await supabase
    .from("product_assets")
    .select("id, product_id, url, kind, sort_order, alt_text")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  const { data: rawVariants, error: vErr } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, sku, option_values, price, compare_at_price, size_id, color_id",
    )
    .eq("product_id", productId)
    .order("sku", { ascending: true });
  if (vErr) {
    logCatalogIssue("fetchVariants", vErr.message);
    return null;
  }
  const base = (rawVariants ?? []) as ProductVariantDbRow[];
  const ids = base.map((v) => v.id);
  let merged: ProductVariantRow[] = [];
  if (ids.length) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("product_variant_id, quantity_on_hand, quantity_reserved")
      .in("product_variant_id", ids);
    const byId = new Map(
      (inv ?? []).map(
        (r: {
          product_variant_id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
        }) => [r.product_variant_id, r],
      ),
    );
    merged = base.map((v) => {
      const row = byId.get(v.id);
      return {
        ...v,
        quantity_on_hand: row?.quantity_on_hand ?? 0,
        quantity_reserved: row?.quantity_reserved ?? 0,
      };
    });
  }
  const { data: optRows, error: optErr } = await supabase
    .from("product_option_definitions")
    .select("option_key, label, presentation, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (optErr) {
    logCatalogIssue("fetchProductOptionDefinitions", optErr.message);
  }

  return {
    product: {
      ...(product as ProductRow),
      option_definitions: optionDefinitionsFromDbRows(
        optRows as
          | {
              option_key: string;
              label: string;
              presentation: string;
              sort_order: number;
            }[]
          | null,
      ),
    },
    variants: merged,
    collectionIds,
    assets: (assetRows ?? []) as ProductAssetRow[],
  };
}

export type ProductAssetPayload = {
  url: string;
  kind: "image" | "video";
  alt_text: string;
  sort_order: number;
};

export type ProductSavePayload = {
  /** Any number of collections; empty = only in “All products” on the storefront. */
  collection_ids: string[];
  slug: string;
  name: string;
  short_description: string;
  description: string;
  status: "draft" | "active";
  /** Gallery; `products.images` jsonb is derived from image rows for legacy storefront use. */
  assets: ProductAssetPayload[];
  tags: string[];
  rating: number | null;
  reviews_count: number | null;
  stock_total: number;
  /** PDP: labels and presentation per `option_values` key (normalized table). */
  option_definitions: VariantOptionSchemaEntry[];
};

export type VariantSavePayload = {
  sku: string;
  option_values: Record<string, string>;
  /** Optional FK to public.sizes */
  size_id: string | null;
  /** Optional FK to public.colors */
  color_id: string | null;
  price: number;
  compare_at_price: number | null;
  /** maps to inventory.quantity_on_hand */
  quantity_on_hand: number;
};

export async function saveProductAndVariants(
  productId: string | null,
  product: ProductSavePayload,
  variants: VariantSavePayload[],
): Promise<{ id: string; error?: string }> {
  if (!supabase) {
    return { id: "", error: "Database connection is not configured." };
  }

  const { collection_ids, assets, option_definitions, ...productRest } = product;
  const imageUrls = assets
    .filter((a) => a.kind === "image" && a.url.trim() !== "")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => a.url.trim());
  const row = {
    ...productRest,
    images: imageUrls,
    updated_at: new Date().toISOString(),
  };

  let id = productId;

  if (!id) {
    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      return { id: "", error: error?.message ?? "Insert failed." };
    }
    id = (data as { id: string }).id;
  } else {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) {
      return { id: "", error: error.message };
    }
  }

  const { error: pcDelErr } = await supabase
    .from("product_collections")
    .delete()
    .eq("product_id", id);
  if (pcDelErr) {
    return { id, error: pcDelErr.message };
  }
  if (collection_ids.length > 0) {
    const { error: pcInsErr } = await supabase.from("product_collections").insert(
      collection_ids.map((cid) => ({
        product_id: id,
        collection_id: cid,
      })),
    );
    if (pcInsErr) {
      return { id, error: pcInsErr.message };
    }
  }

  const { error: paDelErr } = await supabase
    .from("product_assets")
    .delete()
    .eq("product_id", id);
  if (paDelErr) {
    return { id, error: paDelErr.message };
  }
  const normalizedAssets = assets
    .map((a, i) => ({
      product_id: id,
      url: a.url.trim(),
      kind: a.kind,
      alt_text: a.alt_text.trim(),
      sort_order: a.sort_order ?? i,
    }))
    .filter((a) => a.url !== "");
  if (normalizedAssets.length > 0) {
    const { error: paInsErr } = await supabase
      .from("product_assets")
      .insert(normalizedAssets);
    if (paInsErr) {
      return { id, error: paInsErr.message };
    }
  }

  const { error: optDelErr } = await supabase
    .from("product_option_definitions")
    .delete()
    .eq("product_id", id);
  if (optDelErr) {
    return { id, error: optDelErr.message };
  }
  const defRows = (option_definitions ?? [])
    .map((d, i) => ({
      product_id: id,
      option_key: d.key.trim().slice(0, 200),
      label: (d.label.trim() || d.key.trim()).slice(0, 500),
      presentation: d.presentation,
      sort_order: i,
    }))
    .filter((r) => r.option_key !== "");
  if (defRows.length > 0) {
    const { error: optInsErr } = await supabase
      .from("product_option_definitions")
      .insert(defRows);
    if (optInsErr) {
      return { id, error: optInsErr.message };
    }
  }

  const { error: delErr } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", id);
  if (delErr) {
    return { id, error: delErr.message };
  }

  if (variants.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from("product_variants")
      .insert(
        variants.map((v) => ({
          product_id: id,
          sku: v.sku.trim(),
          option_values: v.option_values,
          size_id: v.size_id && v.size_id !== "" ? v.size_id : null,
          color_id: v.color_id && v.color_id !== "" ? v.color_id : null,
          price: v.price,
          compare_at_price: v.compare_at_price,
        })),
      )
      .select("id");
    if (insErr || !inserted?.length) {
      return { id, error: insErr?.message ?? "Variant insert failed." };
    }
    const invRows = inserted.map((row, i) => ({
      product_variant_id: (row as { id: string }).id,
      quantity_on_hand: Math.max(0, variants[i]!.quantity_on_hand),
      quantity_reserved: 0,
    }));
    const { error: invErr } = await supabase.from("inventory").insert(invRows);
    if (invErr) {
      return { id, error: invErr.message };
    }
  }

  return { id };
}

export async function deleteProduct(productId: string): Promise<string | undefined> {
  if (!supabase) return "Database connection is not configured.";
  const { error } = await supabase.from("products").delete().eq("id", productId);
  return error?.message;
}

export async function fetchSizes(): Promise<SizeRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sizes")
    .select("id, name, display_name, size_type, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error) {
    logCatalogIssue("fetchSizes", error.message);
    return [];
  }
  return (data ?? []) as SizeRow[];
}

export async function fetchSizeById(id: string): Promise<SizeRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("sizes")
    .select("id, name, display_name, size_type, sort_order, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logCatalogIssue("fetchSizeById", error.message);
    return null;
  }
  return data as SizeRow | null;
}

export type SizeWritePayload = {
  name: string;
  display_name: string;
  size_type: "numeric" | "text";
  sort_order: number;
  is_active: boolean;
};

export async function saveSize(
  sizeId: string | null,
  payload: SizeWritePayload,
): Promise<{ id: string; error?: string }> {
  if (!supabase) {
    return { id: "", error: "Database connection is not configured." };
  }
  const row = {
    name: payload.name.trim(),
    display_name: payload.display_name.trim(),
    size_type: payload.size_type,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
  };
  if (!sizeId) {
    const { data, error } = await supabase
      .from("sizes")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      return { id: "", error: error?.message ?? "Insert failed." };
    }
    return { id: (data as { id: string }).id };
  }
  const { error } = await supabase.from("sizes").update(row).eq("id", sizeId);
  if (error) {
    return { id: sizeId, error: error.message };
  }
  return { id: sizeId };
}

export async function deleteSizeRow(sizeId: string): Promise<string | undefined> {
  if (!supabase) return "Database connection is not configured.";
  const { error } = await supabase.from("sizes").delete().eq("id", sizeId);
  return error?.message;
}

/** All colors (admin). For pickers, filter `is_active` in UI or use `fetchActiveColors`. */
export async function fetchColors(): Promise<ColorRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex, rgb, swatch_image_url, is_active, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    logCatalogIssue("fetchColors", error.message);
    return [];
  }
  return (data ?? []) as ColorRow[];
}

export async function fetchActiveColors(): Promise<ColorRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex, rgb, swatch_image_url, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    logCatalogIssue("fetchActiveColors", error.message);
    return [];
  }
  return (data ?? []) as ColorRow[];
}

export async function fetchColorById(id: string): Promise<ColorRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("colors")
    .select("id, name, hex, rgb, swatch_image_url, is_active, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logCatalogIssue("fetchColorById", error.message);
    return null;
  }
  return data as ColorRow | null;
}

export type ColorWritePayload = {
  name: string;
  hex: string | null;
  rgb: string | null;
  swatch_image_url: string;
  is_active: boolean;
  sort_order: number;
};

export async function saveColor(
  colorId: string | null,
  payload: ColorWritePayload,
): Promise<{ id: string; error?: string }> {
  if (!supabase) {
    return { id: "", error: "Database connection is not configured." };
  }
  const row = {
    name: payload.name.trim(),
    hex: payload.hex?.trim() || null,
    rgb: payload.rgb?.trim() || null,
    swatch_image_url: payload.swatch_image_url.trim(),
    is_active: payload.is_active,
    sort_order: payload.sort_order,
  };
  if (!row.name) {
    return { id: "", error: "Name is required." };
  }
  if (!colorId) {
    const { data, error } = await supabase
      .from("colors")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      return { id: "", error: error?.message ?? "Insert failed." };
    }
    return { id: (data as { id: string }).id };
  }
  const { error } = await supabase.from("colors").update(row).eq("id", colorId);
  if (error) {
    return { id: colorId, error: error.message };
  }
  return { id: colorId };
}

export async function deleteColorRow(colorId: string): Promise<string | undefined> {
  if (!supabase) return "Database connection is not configured.";
  const { error } = await supabase.from("colors").delete().eq("id", colorId);
  return error?.message;
}

export type CollectionWritePayload = {
  slug: string;
  name: string;
  description: string;
  hero_image: string;
  sort_order: number;
};

export async function fetchCollectionById(
  id: string,
): Promise<CollectionRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, slug, name, description, hero_image, sort_order, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logCatalogIssue("fetchCollectionById", error.message);
    return null;
  }
  return data as CollectionRow | null;
}

export async function saveCollection(
  collectionId: string | null,
  payload: CollectionWritePayload,
): Promise<{ id: string; error?: string }> {
  if (!supabase) {
    return { id: "", error: "Database connection is not configured." };
  }
  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };
  if (!collectionId) {
    const { data, error } = await supabase
      .from("collections")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      return { id: "", error: error?.message ?? "Insert failed." };
    }
    return { id: (data as { id: string }).id };
  }
  const { error } = await supabase
    .from("collections")
    .update(row)
    .eq("id", collectionId);
  if (error) {
    return { id: collectionId, error: error.message };
  }
  return { id: collectionId };
}

export async function deleteCollectionRow(
  collectionId: string,
): Promise<string | undefined> {
  if (!supabase) return "Database connection is not configured.";
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId);
  return error?.message;
}

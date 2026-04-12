import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Layers, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StarRatingInput } from "@/components/dashboard/star-rating-input";
import { FlashMessage } from "@/components/dashboard/flash-message";
import { ProductDescriptionEditor } from "@/components/dashboard/product-description-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchCollections,
  fetchColors,
  fetchProductWithVariants,
  fetchSizes,
  fetchStoreNameForSku,
  saveProductAndVariants,
  deleteProduct,
  type ProductSavePayload,
  type VariantSavePayload,
} from "@/lib/supabase/catalog";
import { generateUniqueSkuForProduct, prefixFromStoreName } from "@/lib/sku-generator";
import type {
  CollectionRow,
  ColorRow,
  ProductAssetRow,
  SizeRow,
} from "@/lib/supabase/catalog-types";
import { slugFromLabel } from "@/lib/slug";
import { uploadProductMedia } from "@/lib/supabase/storage";
import { supabase } from "@/lib/supabase/client";
import { splitStockAcrossVariants } from "@/lib/stock-split";

type VariantForm = {
  sku: string;
  sizeId: string;
  colorId: string;
  price: string;
  compareAt: string;
};

type AssetForm = {
  key: string;
  url: string;
  kind: "image" | "video";
  alt_text: string;
};

function newAssetRow(): AssetForm {
  return {
    key: crypto.randomUUID(),
    url: "",
    kind: "image",
    alt_text: "",
  };
}

const emptyVariant = (): VariantForm => ({
  sku: "",
  sizeId: "",
  colorId: "",
  price: "0",
  compareAt: "",
});

function inferSizeId(sizes: SizeRow[], optionValues: Record<string, string>): string {
  if (!sizes.length) return "";
  const lab = optionValues.size;
  if (!lab) return "";
  return sizes.find((s) => s.display_name === lab)?.id ?? "";
}

function sizeChoices(sizes: SizeRow[], currentSizeId: string): SizeRow[] {
  return sizes.filter((s) => s.is_active || s.id === currentSizeId);
}

function inferColorId(colors: ColorRow[], optionValues: Record<string, string>): string {
  if (!colors.length) return "";
  const lab = optionValues.color;
  if (!lab) return "";
  return colors.find((c) => c.name === lab)?.id ?? "";
}

function colorChoices(colors: ColorRow[], currentColorId: string): ColorRow[] {
  return colors.filter((c) => c.is_active || c.id === currentColorId);
}

function buildAssetsFromLoad(
  imagesUnknown: unknown,
  dbAssets: ProductAssetRow[],
): AssetForm[] {
  if (dbAssets.length > 0) {
    return dbAssets.map((a) => ({
      key: a.id,
      url: a.url,
      kind: a.kind,
      alt_text: a.alt_text ?? "",
    }));
  }
  if (Array.isArray(imagesUnknown)) {
    const urls = imagesUnknown.filter((u): u is string => typeof u === "string" && u.trim() !== "");
    if (urls.length > 0) {
      return urls.map((url, i) => ({
        key: `legacy-${i}`,
        url,
        kind: "image" as const,
        alt_text: "",
      }));
    }
  }
  return [newAssetRow()];
}

export function ProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const isNew = productId === "new" || !productId;

  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingAssetKey, setUploadingAssetKey] = useState<string | null>(null);
  const [generatingSkuIndex, setGeneratingSkuIndex] = useState<number | null>(null);
  const [storeDisplayName, setStoreDisplayName] = useState("Store");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [assets, setAssets] = useState<AssetForm[]>([newAssetRow()]);
  const [tagsCsv, setTagsCsv] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState("");
  /** Total units for the product; split evenly across matrix variants, or assigned to the single SKU. */
  const [parentStock, setParentStock] = useState("0");
  /** Matrix rows (size × color). Empty = "simple" product with one SKU below. */
  const [variants, setVariants] = useState<VariantForm[]>([]);
  /** When there are no matrix rows, this single line is saved as one variant (no size/color). */
  const [simpleSku, setSimpleSku] = useState("");
  const [simplePrice, setSimplePrice] = useState("0");
  const [simpleCompareAt, setSimpleCompareAt] = useState("");
  const [generatingSimpleSku, setGeneratingSimpleSku] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void fetchCollections().then(setCollections);
    void fetchSizes().then(setSizes);
    void fetchColors().then(setColors);
    void fetchStoreNameForSku().then(setStoreDisplayName);
  }, []);

  useEffect(() => {
    if (isNew || !productId || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetchProductWithVariants(productId);
      if (cancelled) return;
      if (!res) {
        setError("Product not found.");
        setLoading(false);
        return;
      }
      const [sizeList, colorList] = await Promise.all([fetchSizes(), fetchColors()]);
      if (cancelled) return;
      setSizes(sizeList);
      setColors(colorList);

      const { product, variants: vv, collectionIds, assets: dbAssets } = res;
      setName(product.name);
      setShortDescription(product.short_description);
      setDescription(product.description);
      setStatus(product.status);
      setSelectedCollectionIds(new Set(collectionIds));
      setAssets(buildAssetsFromLoad(product.images, dbAssets));
      setTagsCsv((product.tags ?? []).join(", "));
      setRating(product.rating != null ? Number(product.rating) : 0);
      setReviewsCount(product.reviews_count != null ? String(product.reviews_count) : "");
      const sumVariantStock = vv.reduce((s, v) => s + (v.quantity_on_hand ?? 0), 0);
      const oneBare =
        vv.length === 1 && !vv[0].size_id && !vv[0].color_id;
      if (oneBare) {
        const v0 = vv[0];
        setSimpleSku(v0.sku);
        setSimplePrice(String(v0.price));
        setSimpleCompareAt(
          v0.compare_at_price != null ? String(v0.compare_at_price) : "",
        );
        setParentStock(
          String(
            product.stock_total != null && product.stock_total >= 0
              ? product.stock_total
              : v0.quantity_on_hand,
          ),
        );
        setVariants([]);
      } else if (vv.length > 0) {
        setSimpleSku("");
        setSimplePrice("0");
        setSimpleCompareAt("");
        setParentStock(
          String(
            product.stock_total != null && product.stock_total >= 0
              ? product.stock_total
              : sumVariantStock,
          ),
        );
        setVariants(
          vv.map((v) => ({
            sku: v.sku,
            sizeId: v.size_id ?? inferSizeId(sizeList, v.option_values ?? {}),
            colorId:
              v.color_id ?? inferColorId(colorList, v.option_values ?? {}),
            price: String(v.price),
            compareAt: v.compare_at_price != null ? String(v.compare_at_price) : "",
          })),
        );
      } else {
        setSimpleSku("");
        setSimplePrice("0");
        setSimpleCompareAt("");
        setParentStock(
          String(
            product.stock_total != null && product.stock_total >= 0
              ? product.stock_total
              : 0,
          ),
        );
        setVariants([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, productId]);

  async function onAssetFile(key: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingAssetKey(key);
    const res = await uploadProductMedia(file);
    setUploadingAssetKey(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setAssets((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, url: res.publicUrl, kind: res.kind } : row,
      ),
    );
    setMessage("File uploaded — save the product to persist.");
  }

  async function onGenerateSimpleSku() {
    setError(null);
    const others = [
      ...variants.map((v) => v.sku.trim()).filter(Boolean),
      ...(simpleSku.trim() ? [simpleSku.trim()] : []),
    ];
    setGeneratingSimpleSku(true);
    const res = await generateUniqueSkuForProduct(
      storeDisplayName,
      slugFromLabel(name) || "product",
      others,
    );
    setGeneratingSimpleSku(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSimpleSku(res.sku);
  }

  async function onGenerateSku(variantIndex: number) {
    setError(null);
    const others = variants
      .filter((_, j) => j !== variantIndex)
      .map((v) => v.sku.trim())
      .filter(Boolean);
    setGeneratingSkuIndex(variantIndex);
    const res = await generateUniqueSkuForProduct(
      storeDisplayName,
      slugFromLabel(name) || "product",
      others,
    );
    setGeneratingSkuIndex(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setVariants((prev) => {
      const next = [...prev];
      const row = next[variantIndex];
      if (row) next[variantIndex] = { ...row, sku: res.sku };
      return next;
    });
  }

  function moveAsset(index: number, dir: -1 | 1) {
    setAssets((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j]!, next[index]!];
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabase) {
      setError("Database connection is not configured.");
      return;
    }

    const tags = tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const slug = slugFromLabel(name);
    if (!slug) {
      setError(
        "Use a name with letters or numbers so we can build a URL (e.g. “Graphic Tee”).",
      );
      return;
    }

    const assetPayload = assets
      .filter((a) => a.url.trim() !== "")
      .map((a, i) => ({
        url: a.url.trim(),
        kind: a.kind,
        alt_text: a.alt_text.trim(),
        sort_order: i,
      }));

    const parentTotal = Number.parseInt(parentStock, 10);
    if (Number.isNaN(parentTotal) || parentTotal < 0) {
      setError("Total inventory must be a whole number zero or greater.");
      return;
    }

    const payload: ProductSavePayload = {
      collection_ids: Array.from(selectedCollectionIds),
      slug,
      name: name.trim(),
      short_description: shortDescription.trim(),
      description: description.trim(),
      status,
      assets: assetPayload,
      tags,
      rating: rating > 0 ? rating : null,
      reviews_count: reviewsCount.trim() === "" ? null : Number.parseInt(reviewsCount, 10),
      stock_total: parentTotal,
    };

    const vpayload: VariantSavePayload[] = [];

    if (variants.length === 0) {
      const price = Number.parseFloat(simplePrice);
      if (!simpleSku.trim() || Number.isNaN(price)) {
        setError(
          "Add a SKU and price for this product, or use “Add variant” for size/color rows.",
        );
        return;
      }
      vpayload.push({
        sku: simpleSku.trim(),
        option_values: {},
        size_id: null,
        color_id: null,
        price,
        compare_at_price:
          simpleCompareAt.trim() === ""
            ? null
            : Number.parseFloat(simpleCompareAt),
        quantity_on_hand: parentTotal,
      });
    } else {
      const allocations = splitStockAcrossVariants(parentTotal, variants.length);
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]!;
        const price = Number.parseFloat(v.price);
        if (!v.sku.trim() || Number.isNaN(price)) {
          setError("Each variant needs SKU and valid price.");
          return;
        }
        if (!v.sizeId) {
          setError("Each variant must have a size (manage sizes under Sizes).");
          return;
        }
        if (!v.colorId) {
          setError("Each variant must have a color (manage colors under Colors).");
          return;
        }
        const sizeLabel = sizes.find((s) => s.id === v.sizeId)?.display_name;
        if (!sizeLabel) {
          setError("Invalid size on a variant — refresh and pick a size again.");
          return;
        }
        const colorRow = colors.find((c) => c.id === v.colorId);
        if (!colorRow) {
          setError("Invalid color on a variant — refresh and pick a color again.");
          return;
        }
        const option_values: Record<string, string> = {
          size: sizeLabel,
          color: colorRow.name,
        };

        vpayload.push({
          sku: v.sku.trim(),
          option_values,
          size_id: v.sizeId,
          color_id: v.colorId,
          price,
          compare_at_price:
            v.compareAt.trim() === "" ? null : Number.parseFloat(v.compareAt),
          quantity_on_hand: Math.max(0, allocations[i] ?? 0),
        });
      }
    }

    setSaving(true);
    const result = await saveProductAndVariants(
      isNew ? null : productId ?? null,
      payload,
      vpayload,
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Saved.");
    if (isNew) {
      navigate(`/dashboard/products/${result.id}`, { replace: true });
    }
  }

  async function onDelete() {
    if (isNew || !productId || !supabase) return;
    if (!window.confirm("Delete this product and all variants?")) return;
    const err = await deleteProduct(productId);
    if (err) {
      setError(err);
      return;
    }
    navigate("/dashboard/products");
  }

  if (!supabase) {
    return (
      <p className="text-sm text-muted-foreground">
        Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const variantAllocPreview =
    variants.length > 0
      ? splitStockAcrossVariants(
          Math.max(0, parseInt(parentStock, 10) || 0),
          variants.length,
        )
      : [];

  return (
    <div className="w-full min-w-0 space-y-8">
      <PageHeader
        backLink={{ to: "/dashboard/products", label: "Products" }}
        title={isNew ? "New product" : "Edit product"}
        description={
          isNew
            ? "Parent listing plus sellable SKUs. Set total inventory on the parent; with variant rows it splits evenly. One SKU uses the full total."
            : "Update the parent listing, media, and variant SKUs."
        }
      />

      {isNew ? (
        <div className="w-full rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-3 text-sm leading-relaxed text-muted-foreground dark:bg-primary/10">
          <span className="font-medium text-foreground">Parent + sellable SKUs.</span> The parent is
          the listing (name, gallery, description). With no variant rows, you enter one SKU and
          price/stock for the product itself. Use &quot;Add variant&quot; when you need size/color
          combinations — each row is a child SKU. One Save stores everything.
        </div>
      ) : null}

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}
      {message ? <FlashMessage variant="success">{message}</FlashMessage> : null}

      <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-none space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Parent product</CardTitle>
            <CardDescription>
              Shared storefront listing: title, gallery, and copy. Set one SKU below when you are
              not using size/color variants, or set pricing on each variant row.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Storefront URL:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">
                    /products/{slugFromLabel(name) || "…"}
                  </code>
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "active")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                </select>
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium leading-none">Collections</legend>
              <p className="text-xs text-muted-foreground">
                Leave none selected to show this product only on &quot;All products&quot;. You can pick
                multiple.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                {collections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No collections yet — create some under Collections.
                  </p>
                ) : (
                  collections.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollectionIds.has(c.id)}
                        onChange={() => {
                          setSelectedCollectionIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span>
                        {c.name}{" "}
                        <span className="text-muted-foreground">({c.slug})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="short">Short description</Label>
              <Input
                id="short"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-stock">Total inventory (units)</Label>
              <Input
                id="parent-stock"
                value={parentStock}
                onChange={(e) => setParentStock(e.target.value)}
                inputMode="numeric"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                {variants.length > 1
                  ? `Saved total is split evenly across ${variants.length} variants (remainder goes to the first rows).`
                  : variants.length === 1
                    ? "Applies to the variant row below."
                    : "Applies to the single-SKU block in Pricing & SKUs below."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <ProductDescriptionEditor
                id="desc"
                value={description}
                onChange={setDescription}
              />
              <p className="text-xs text-muted-foreground">
                Rich text is stored as HTML and shown on the storefront with the same formatting.
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Media gallery</Label>
              <p className="text-xs text-muted-foreground">
                Multiple images and videos (MP4, WebM, MOV). Uploads go to your store media folder (
                <code className="text-[0.75rem]">products/media/</code>) or paste an external URL. The first image is
                used on product cards.
              </p>
              <div className="space-y-3">
                {assets.map((row, i) => (
                  <div
                    key={row.key}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={row.kind}
                        onChange={(e) => {
                          const k = e.target.value as "image" | "video";
                          setAssets((prev) =>
                            prev.map((r) => (r.key === row.key ? { ...r, kind: k } : r)),
                          );
                        }}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <Input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        disabled={uploadingAssetKey === row.key}
                        onChange={(e) => void onAssetFile(row.key, e)}
                        className="max-w-[220px] cursor-pointer text-xs file:mr-2"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={i === 0}
                        onClick={() => moveAsset(i, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={i === assets.length - 1}
                        onClick={() => moveAsset(i, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setAssets((prev) => prev.filter((r) => r.key !== row.key))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="https://…"
                      value={row.url}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssets((prev) =>
                          prev.map((r) => (r.key === row.key ? { ...r, url: v } : r)),
                        );
                      }}
                    />
                    <Input
                      placeholder="Alt text (optional)"
                      value={row.alt_text}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssets((prev) =>
                          prev.map((r) => (r.key === row.key ? { ...r, alt_text: v } : r)),
                        );
                      }}
                    />
                    {row.url ? (
                      <div className="text-xs text-muted-foreground truncate">{row.url}</div>
                    ) : null}
                    {uploadingAssetKey === row.key ? (
                      <p className="text-xs text-muted-foreground">Uploading…</p>
                    ) : null}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssets((a) => [...a, newAssetRow()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add media row
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rating (optional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <StarRatingInput
                    count={5}
                    value={rating}
                    size={28}
                    activeColor="#eab308"
                    isHalf
                    onChange={(v: number) => setRating(v)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {rating > 0 ? `${rating.toFixed(1)} / 5` : "No rating"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviews">Reviews count (optional)</Label>
                <Input
                  id="reviews"
                  value={reviewsCount}
                  onChange={(e) => setReviewsCount(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/35 bg-muted/20">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  Pricing &amp; SKUs
                </CardTitle>
                <CardDescription>
                  {variants.length === 0 ? (
                    <>
                      One SKU covers the whole product. Use{" "}
                      <span className="font-medium text-foreground">Add variant</span> when you
                      need separate size/color rows.
                    </>
                  ) : (
                    <>
                      Each row is a child: pick{" "}
                      <Link to="/dashboard/sizes" className="underline underline-offset-2">
                        size
                      </Link>{" "}
                      and{" "}
                      <Link to="/dashboard/colors" className="underline underline-offset-2">
                        color
                      </Link>
                      , then SKU, price, and compare-at. Inventory comes from the parent total above and
                      splits evenly across rows.
                    </>
                  )}
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() =>
                  setVariants((v) => {
                    if (v.length === 0) {
                      return [
                        {
                          sku: simpleSku.trim(),
                          sizeId: "",
                          colorId: "",
                          price: simplePrice.trim() === "" ? "0" : simplePrice,
                          compareAt: simpleCompareAt,
                        },
                      ];
                    }
                    return [...v, emptyVariant()];
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add variant
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.length === 0 ? (
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Single SKU (no size/color matrix)
                </p>
                <div className="grid gap-3 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-5">
                    <Label htmlFor="simple-sku">SKU</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <Input
                        id="simple-sku"
                        value={simpleSku}
                        onChange={(e) => setSimpleSku(e.target.value)}
                        className="min-w-0 flex-1 font-mono text-xs"
                        placeholder={`${prefixFromStoreName(storeDisplayName)}-123-4567`}
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0 sm:self-end"
                        disabled={generatingSimpleSku}
                        onClick={() => void onGenerateSimpleSku()}
                      >
                        {generatingSimpleSku ? "…" : "Generate SKU"}
                      </Button>
                    </div>
                    <p className="mt-1 text-[0.65rem] leading-snug text-muted-foreground">
                      Saved as one variant with no size or color.{" "}
                      <span className="font-mono text-[0.7rem]">
                        {prefixFromStoreName(storeDisplayName)}-###-####
                      </span>
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="simple-price">Price</Label>
                    <Input
                      id="simple-price"
                      value={simplePrice}
                      onChange={(e) => setSimplePrice(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Label htmlFor="simple-compare">Compare-at</Label>
                    <Input
                      id="simple-compare"
                      value={simpleCompareAt}
                      onChange={(e) => setSimpleCompareAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : null}
            {variants.length > 0 && sizes.length === 0 ? (
              <p className="text-sm text-destructive">
                No sizes in the database. Add sizes under Sizes before saving variants.
              </p>
            ) : null}
            {variants.length > 0 && colors.length === 0 ? (
              <p className="text-sm text-destructive">
                No colors in the database. Add colors under Colors before saving variants.
              </p>
            ) : null}
            {variants.map((v, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background p-4 shadow-sm"
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Child variant {i + 1}
                  {name.trim() ? (
                    <span className="font-normal normal-case text-muted-foreground">
                      {" "}
                      · under “{name.trim()}”
                    </span>
                  ) : null}
                </p>
                <div className="grid gap-3 md:grid-cols-12 md:items-end">
                <div className="md:col-span-2">
                  <Label>Size</Label>
                  <select
                    value={v.sizeId}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], sizeId: e.target.value };
                      setVariants(next);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    required
                  >
                    <option value="">—</option>
                    {sizeChoices(sizes, v.sizeId).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                        {!s.is_active ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Color</Label>
                  <select
                    value={v.colorId}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], colorId: e.target.value };
                      setVariants(next);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    required
                  >
                    <option value="">—</option>
                    {colorChoices(colors, v.colorId).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.is_active ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <Label>SKU</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <Input
                      value={v.sku}
                      onChange={(e) => {
                        const next = [...variants];
                        next[i] = { ...next[i], sku: e.target.value };
                        setVariants(next);
                      }}
                      className="min-w-0 flex-1 font-mono text-xs"
                      placeholder={`${prefixFromStoreName(storeDisplayName)}-123-4567`}
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 sm:self-end"
                      disabled={generatingSkuIndex === i}
                      onClick={() => void onGenerateSku(i)}
                    >
                      {generatingSkuIndex === i ? "…" : "Generate SKU"}
                    </Button>
                  </div>
                  <p className="mt-1 text-[0.65rem] leading-snug text-muted-foreground">
                    Type any SKU, or generate{" "}
                    <span className="font-mono text-[0.7rem]">
                      {prefixFromStoreName(storeDisplayName)}-###-####
                    </span>{" "}
                    (store prefix from “{storeDisplayName}”, then numeric segments; unique in the
                    database).
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label>Price</Label>
                  <Input
                    value={v.price}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], price: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Compare-at</Label>
                  <Input
                    value={v.compareAt}
                    onChange={(e) => {
                      const next = [...variants];
                      next[i] = { ...next[i], compareAt: e.target.value };
                      setVariants(next);
                    }}
                  />
                </div>
                <div className="md:col-span-2 flex flex-col justify-end">
                  <Label>Inventory split</Label>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {variantAllocPreview[i] ?? 0} units
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">From parent total</p>
                </div>
                <div className="flex md:col-span-12">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setVariants((rows) => rows.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove this variant
                  </Button>
                </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Save creates or updates the parent product and every variant row in one step.
          </p>
          <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={saving || uploadingAssetKey !== null || generatingSimpleSku}
          >
            {saving ? "Saving…" : "Save product & variants"}
          </Button>
          {!isNew ? (
            <Button type="button" variant="destructive" onClick={() => void onDelete()}>
              Delete product
            </Button>
          ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}

import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProductMultiSelect } from "@/components/dashboard/product-multi-select";
import {
  assignVoucherInstance,
  createSharedVoucherBatch,
  createVoucherBatchWithQuantity,
  deleteVoucherBatch,
  emptyInstanceOverrides,
  fetchProductsForVoucherPicker,
  fetchPublicUsersForAssign,
  fetchVoucherBatchStatsById,
  fetchVoucherInstances,
  updateVoucherBatch,
  type InstanceOverridePayload,
  type ProductOption,
  type PublicUserOption,
  type VoucherBatchStatsRow,
  type VoucherBatchWritePayload,
  type VoucherInstanceRow,
} from "@/lib/supabase/vouchers";
import { supabase } from "@/lib/supabase/client";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultValidFrom(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function userLabel(u: PublicUserOption) {
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || `User ${u.id.slice(0, 8)}…`;
}

function rowOverridesForSave(
  instanceId: string,
  draft: InstanceOverridePayload | undefined,
  productSets: Record<string, Set<string>>,
): InstanceOverridePayload {
  const base = draft ?? emptyInstanceOverrides();
  const scope = base.override_product_scope;
  let pids: string[] | null = base.override_product_ids;
  if (scope === "specific") {
    const set = productSets[instanceId];
    pids = set && set.size > 0 ? [...set] : [];
  } else if (scope === "all") {
    pids = [];
  }
  return { ...base, override_product_ids: pids };
}

export function VoucherEditPage() {
  const { voucherId } = useParams<{ voucherId: string }>();
  const navigate = useNavigate();
  const isNew = voucherId === "new" || !voucherId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [createKind, setCreateKind] = useState<"shared" | "multi">("multi");
  const [sharedCodeInput, setSharedCodeInput] = useState("WELCOME10");
  const [batchName, setBatchName] = useState("New campaign");
  const [quantity, setQuantity] = useState("100");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("percentage");
  const [voucherAmount, setVoucherAmount] = useState("10");
  const [productScope, setProductScope] = useState<"all" | "specific">("all");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [validFrom, setValidFrom] = useState(defaultValidFrom);
  const [validUntil, setValidUntil] = useState(defaultValidUntil);

  const [stats, setStats] = useState<VoucherBatchStatsRow | null>(null);
  const [instances, setInstances] = useState<VoucherInstanceRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [publicUsers, setPublicUsers] = useState<PublicUserOption[]>([]);
  /** Per-instance draft user id for assign dropdown */
  const [assignDraft, setAssignDraft] = useState<Record<string, string>>({});
  /** Optional admin-only name when this code is assigned (e.g. "Birthday — Jane"). */
  const [labelDraft, setLabelDraft] = useState<Record<string, string>>({});
  /** Custom rules per code (batch defaults when all null). */
  const [overrideDraft, setOverrideDraft] = useState<Record<string, InstanceOverridePayload>>({});
  const [overrideProducts, setOverrideProducts] = useState<Record<string, Set<string>>>({});
  /** Show per-code optional rules panel (also opened on load when row has saved overrides). */
  const [overridePanelOpen, setOverridePanelOpen] = useState<Record<string, boolean>>({});
  /** Multi batch: skip campaign-wide discount/dates (set per code when assigning). */
  const [deferBatchRules, setDeferBatchRules] = useState(false);

  useEffect(() => {
    if (!supabase || isNew || !voucherId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [s, inst, prods, users] = await Promise.all([
        fetchVoucherBatchStatsById(voucherId),
        fetchVoucherInstances(voucherId),
        fetchProductsForVoucherPicker(),
        fetchPublicUsersForAssign(),
      ]);
      if (cancelled) return;
      if (!s) {
        toast.error("Batch not found.");
        setLoading(false);
        return;
      }
      setStats(s);
      setInstances(inst);
      setProducts(prods);
      setPublicUsers(users);
      setBatchName(s.name);
      const multiDeferred = s.batch_kind === "multi" && s.discount_type == null;
      setDeferBatchRules(multiDeferred);
      setDiscountType(s.discount_type ?? "percentage");
      setVoucherAmount(s.voucher_amount != null ? String(s.voucher_amount) : "");
      setProductScope(s.product_scope);
      setSelectedProductIds(new Set(s.product_ids ?? []));
      setMinOrderAmount(String(s.min_order_amount));
      setValidFrom(s.valid_from ? toDatetimeLocalValue(s.valid_from) : "");
      setValidUntil(s.valid_until ? toDatetimeLocalValue(s.valid_until) : "");
      const drafts: Record<string, string> = {};
      const labels: Record<string, string> = {};
      const nextOverrides: Record<string, InstanceOverridePayload> = {};
      const nextOvProds: Record<string, Set<string>> = {};
      const nextOpen: Record<string, boolean> = {};
      for (const i of inst) {
        drafts[i.id] = i.assigned_public_user_id ?? "";
        labels[i.id] = i.voucher_label ?? "";
        nextOverrides[i.id] = {
          override_discount_type: (i.override_discount_type as "fixed" | "percentage" | null) ?? null,
          override_voucher_amount: i.override_voucher_amount,
          override_min_order_amount: i.override_min_order_amount,
          override_valid_from: i.override_valid_from,
          override_valid_until: i.override_valid_until,
          override_product_scope: (i.override_product_scope as "all" | "specific" | null) ?? null,
          override_product_ids: i.override_product_ids,
        };
        if (i.override_product_ids?.length) {
          nextOvProds[i.id] = new Set(i.override_product_ids);
        }
        const hasOv =
          i.override_discount_type != null ||
          i.override_voucher_amount != null ||
          i.override_min_order_amount != null ||
          i.override_valid_from != null ||
          i.override_valid_until != null ||
          i.override_product_scope != null ||
          (i.override_product_ids?.length ?? 0) > 0;
        if (hasOv) nextOpen[i.id] = true;
      }
      setAssignDraft(drafts);
      setLabelDraft(labels);
      setOverrideDraft(nextOverrides);
      setOverrideProducts(nextOvProds);
      setOverridePanelOpen(nextOpen);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, voucherId]);

  useEffect(() => {
    if (!isNew || !supabase) return;
    let cancelled = false;
    void (async () => {
      const [prods, users] = await Promise.all([
        fetchProductsForVoucherPicker(),
        fetchPublicUsersForAssign(),
      ]);
      if (!cancelled) {
        setProducts(prods);
        setPublicUsers(users);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew]);

  useEffect(() => {
    if (isNew && createKind === "shared") {
      setDeferBatchRules(false);
    }
  }, [isNew, createKind]);

  function buildDeferredPayload(): VoucherBatchWritePayload {
    return {
      name: batchName.trim(),
      discount_type: null,
      voucher_amount: null,
      product_scope: "all",
      product_ids: [],
      min_order_amount: Number.parseFloat(minOrderAmount) || 0,
      valid_from: null,
      valid_until: null,
    };
  }

  function buildFullPayload(): VoucherBatchWritePayload {
    const vf = new Date(validFrom).toISOString();
    const vu = new Date(validUntil).toISOString();
    const amt = Number.parseFloat(voucherAmount);
    return {
      name: batchName.trim(),
      discount_type: discountType,
      voucher_amount: Number.isNaN(amt) ? null : amt,
      product_scope: productScope,
      product_ids: productScope === "specific" ? [...selectedProductIds] : [],
      min_order_amount: Number.parseFloat(minOrderAmount) || 0,
      valid_from: vf,
      valid_until: vu,
    };
  }

  async function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast.error("Database connection is not configured.");
      return;
    }
    setSaving(true);
    if (createKind === "shared") {
      const vf = new Date(validFrom).toISOString();
      const vu = new Date(validUntil).toISOString();
      if (new Date(vu) <= new Date(vf)) {
        setSaving(false);
        toast.error("Valid until must be after valid from.");
        return;
      }
      const payload = buildFullPayload();
      if (payload.voucher_amount == null || payload.voucher_amount <= 0) {
        setSaving(false);
        toast.error("Enter a valid discount amount.");
        return;
      }
      const result = await createSharedVoucherBatch(payload, sharedCodeInput);
      setSaving(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Created shared voucher code.");
      navigate(`/dashboard/vouchers/${result.batchId}`, { replace: true });
      return;
    }

    const qty = Number.parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setSaving(false);
      toast.error("Enter how many voucher codes to generate (1–10,000).");
      return;
    }
    if (deferBatchRules) {
      const result = await createVoucherBatchWithQuantity(buildDeferredPayload(), qty);
      setSaving(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Created ${qty} voucher codes (set discount & dates per code when assigning).`);
      navigate(`/dashboard/vouchers/${result.batchId}`, { replace: true });
      return;
    }

    const vf = new Date(validFrom).toISOString();
    const vu = new Date(validUntil).toISOString();
    if (new Date(vu) <= new Date(vf)) {
      setSaving(false);
      toast.error("Valid until must be after valid from.");
      return;
    }
    const payload = buildFullPayload();
    if (payload.voucher_amount == null || payload.voucher_amount <= 0) {
      setSaving(false);
      toast.error("Enter a valid discount amount.");
      return;
    }
    const result = await createVoucherBatchWithQuantity(payload, qty);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Created ${qty} voucher codes.`);
    navigate(`/dashboard/vouchers/${result.batchId}`, { replace: true });
  }

  async function onUpdateBatch(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !voucherId || isNew) return;

    let payload: VoucherBatchWritePayload;
    if (stats?.batch_kind === "shared") {
      const vf = new Date(validFrom).toISOString();
      const vu = new Date(validUntil).toISOString();
      if (new Date(vu) <= new Date(vf)) {
        toast.error("Valid until must be after valid from.");
        return;
      }
      payload = buildFullPayload();
      if (payload.voucher_amount == null || payload.voucher_amount <= 0) {
        toast.error("Enter a valid discount amount.");
        return;
      }
    } else if (deferBatchRules) {
      payload = buildDeferredPayload();
    } else {
      const vf = new Date(validFrom).toISOString();
      const vu = new Date(validUntil).toISOString();
      if (new Date(vu) <= new Date(vf)) {
        toast.error("Valid until must be after valid from.");
        return;
      }
      payload = buildFullPayload();
      if (payload.voucher_amount == null || payload.voucher_amount <= 0) {
        toast.error("Enter a valid discount amount.");
        return;
      }
    }

    setSaving(true);
    const { error: uErr } = await updateVoucherBatch(voucherId, payload);
    setSaving(false);
    if (uErr) {
      toast.error(uErr);
      return;
    }
    toast.success("Campaign rules saved.");
    const s = await fetchVoucherBatchStatsById(voucherId);
    if (s) {
      setStats(s);
      if (s.batch_kind === "multi") {
        setDeferBatchRules(s.discount_type == null);
      }
    }
  }

  async function onAssign(instanceId: string) {
    const uid = assignDraft[instanceId]?.trim() || null;
    const ov = overrideDraft[instanceId];
    const merged = rowOverridesForSave(instanceId, ov, overrideProducts);
    const lbl = (labelDraft[instanceId] ?? "").trim() || null;
    const { error: aErr } = uid
      ? await assignVoucherInstance(instanceId, uid, merged, lbl)
      : await assignVoucherInstance(instanceId, null);
    if (aErr) {
      toast.error(aErr);
      return;
    }
    toast.success(uid ? "Assignment saved." : "Assignment cleared.");
    if (voucherId) {
      const inst = await fetchVoucherInstances(voucherId);
      setInstances(inst);
      const drafts: Record<string, string> = { ...assignDraft };
      const nextLabels: Record<string, string> = { ...labelDraft };
      const nextOverrides = { ...overrideDraft };
      const nextProds = { ...overrideProducts };
      for (const i of inst) {
        drafts[i.id] = i.assigned_public_user_id ?? "";
        nextLabels[i.id] = i.voucher_label ?? "";
        nextOverrides[i.id] = {
          override_discount_type: (i.override_discount_type as "fixed" | "percentage" | null) ?? null,
          override_voucher_amount: i.override_voucher_amount,
          override_min_order_amount: i.override_min_order_amount,
          override_valid_from: i.override_valid_from,
          override_valid_until: i.override_valid_until,
          override_product_scope: (i.override_product_scope as "all" | "specific" | null) ?? null,
          override_product_ids: i.override_product_ids,
        };
        if (i.override_product_ids?.length) {
          nextProds[i.id] = new Set(i.override_product_ids);
        } else {
          delete nextProds[i.id];
        }
      }
      setAssignDraft(drafts);
      setLabelDraft(nextLabels);
      setOverrideDraft(nextOverrides);
      setOverrideProducts(nextProds);
      const s = await fetchVoucherBatchStatsById(voucherId);
      if (s) setStats(s);
    }
  }

  async function onDelete() {
    if (isNew || !voucherId || !supabase) return;
    if (!window.confirm("Delete this entire batch and all its codes?")) return;
    const err = await deleteVoucherBatch(voucherId);
    if (err) {
      toast.error(err);
      return;
    }
    navigate("/dashboard/vouchers");
  }

  function patchOverride(instanceId: string, partial: Partial<InstanceOverridePayload>) {
    setOverrideDraft((d) => ({
      ...d,
      [instanceId]: { ...(d[instanceId] ?? emptyInstanceOverrides()), ...partial },
    }));
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

  const batchKind = stats?.batch_kind ?? "multi";
  const isShared = batchKind === "shared";

  if (isNew) {
    return (
      <div className="space-y-8">
        <PageHeader
          backLink={{ to: "/dashboard/vouchers", label: "Vouchers" }}
          title="Create voucher"
          description={
            createKind === "shared"
              ? "One promo code for all customers; each customer may redeem once. Rules are set on the campaign."
              : "Generate unique codes. Optionally skip batch-wide discount and set rules per code when assigning—or set defaults here for all codes."
          }
        />
        <form onSubmit={(e) => void onCreateSubmit(e)} className="mx-auto w-full max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voucher type</CardTitle>
              <CardDescription>
                A batch generates many unique codes with the same default rules. Shared is one code (for example WELCOME10)
                that each customer can redeem once. Both need a campaign name below for your list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Type</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="create-vk"
                        checked={createKind === "multi"}
                        onChange={() => setCreateKind("multi")}
                      />
                      Batch of unique codes
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="create-vk"
                        checked={createKind === "shared"}
                        onChange={() => setCreateKind("shared")}
                      />
                      One shared code (each customer once)
                    </label>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="vb-name">Campaign name (internal)</Label>
                  <Input
                    id="vb-name"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    required
                    placeholder="New campaign"
                  />
                  <p className="text-xs text-muted-foreground">
                    For your dashboard and reports only. Customers see the promo code at checkout—not this title. For
                    batch vouchers, you can add an optional per-code name when you assign a code to someone (see Codes
                    table after creation).
                  </p>
                </div>
                {createKind === "shared" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="vb-shared">Shared code</Label>
                    <Input
                      id="vb-shared"
                      value={sharedCodeInput}
                      onChange={(e) => setSharedCodeInput(e.target.value.toUpperCase())}
                      required
                      placeholder="WELCOME10"
                      className="font-mono uppercase"
                      maxLength={32}
                    />
                    <p className="text-xs text-muted-foreground">Letters and numbers only; stored uppercase.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="vb-qty">How many vouchers to create</Label>
                    <Input
                      id="vb-qty"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                      required
                      inputMode="numeric"
                      placeholder="100"
                    />
                    <p className="text-xs text-muted-foreground">Between 1 and 10,000 unique codes.</p>
                  </div>
                )}
                {createKind === "multi" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={deferBatchRules}
                        onChange={(e) => setDeferBatchRules(e.target.checked)}
                      />
                      Skip campaign discount and validity — set rules per code when assigning
                    </label>
                    <p className="text-xs text-muted-foreground">
                      You can add campaign-wide defaults later by editing this batch. Shared vouchers always require rules
                      below.
                    </p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {createKind === "multi" && deferBatchRules ? (
            <Card>
              <CardHeader>
                <CardTitle>Campaign rules</CardTitle>
                <CardDescription>
                  No batch-wide discount or dates. After creation, use <strong>Custom terms</strong> on each code when
                  you assign it to a customer (or add defaults here later via Edit).
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Discount rules</CardTitle>
                <CardDescription>
                  {createKind === "shared"
                    ? "These rules apply to every redemption of the shared code."
                    : "Default rules for every generated code. You can still override per assignment after creation."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vb-type">Discount type</Label>
                    <select
                      id="vb-type"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "fixed" | "percentage")}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount (PKR)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vb-amt">
                      {discountType === "percentage" ? "Percent off" : "Amount off (PKR)"}
                    </Label>
                    <Input
                      id="vb-amt"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      required
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applies to</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="scope"
                        checked={productScope === "all"}
                        onChange={() => setProductScope("all")}
                      />
                      All products
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="scope"
                        checked={productScope === "specific"}
                        onChange={() => setProductScope("specific")}
                      />
                      Specific products
                    </label>
                  </div>
                </div>

                {productScope === "specific" ? (
                  <div className="space-y-2">
                    <Label htmlFor="vb-products">Products</Label>
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products in catalog.</p>
                    ) : (
                      <ProductMultiSelect
                        inputId="vb-products"
                        products={products}
                        value={selectedProductIds}
                        onChange={setSelectedProductIds}
                        aria-label="Products this voucher applies to"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Search and select products from your catalog. The same picker applies to shared codes and batch
                      campaigns.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="vb-min">Minimum order amount (PKR)</Label>
                  <Input
                    id="vb-min"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vb-from">Valid from</Label>
                    <Input
                      id="vb-from"
                      type="datetime-local"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vb-until">Valid until</Label>
                    <Input
                      id="vb-until"
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : createKind === "shared" ? "Create shared voucher" : "Create codes"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        backLink={{ to: "/dashboard/vouchers", label: "Vouchers" }}
        title={stats?.name ?? "Voucher batch"}
        description={
          isShared
            ? "One shared code; each customer may redeem once. Edit campaign rules below."
            : stats?.discount_type == null
              ? "This batch has no campaign-wide discount. Configure each code under Codes (Custom terms when assigning), or add defaults below."
              : "Update default rules or assign codes to customers. Each unique code works once. Optional per-assignment overrides when a code is assigned."
        }
      />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{isShared ? "Type" : "Total codes"}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {isShared ? "Shared" : stats.total_codes}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats.available_count == null ? "—" : stats.available_count}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Used (redemptions)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stats.used_count}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In pool (unassigned)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.unassigned_available_count == null ? "—" : stats.unassigned_available_count}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Issued, not redeemed</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.assigned_not_redeemed_count == null ? "—" : stats.assigned_not_redeemed_count}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {isShared && stats?.shared_code ? (
        <Card className="mx-auto w-full max-w-3xl border-primary/30">
          <CardHeader>
            <CardTitle className="font-mono text-lg tracking-wide">{stats.shared_code}</CardTitle>
            <CardDescription>Customers enter this code at checkout. Validity and discount follow the campaign rules above.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <form onSubmit={(e) => void onUpdateBatch(e)} className="mx-auto w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign rules</CardTitle>
            <CardDescription>
              {isShared
                ? "Applies to every redemption of the shared code that is not yet completed."
                : deferBatchRules
                  ? "No batch-wide discount. Use Custom terms on each code when assigning, or turn off the option below to add defaults here."
                  : "Default rules for codes that are not yet redeemed. Per-code overrides are set when you assign a code."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-name">Campaign name (internal)</Label>
              <Input
                id="e-name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Shown in your admin list only. Per-code optional names are set under Codes when you assign a voucher to a
                customer.
              </p>
            </div>

            {!isShared ? (
              <div className="rounded-md border border-dashed border-border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={deferBatchRules}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setDeferBatchRules(next);
                      if (!next) {
                        setValidFrom((p) => p || defaultValidFrom());
                        setValidUntil((p) => p || defaultValidUntil());
                        setVoucherAmount((p) => p || "10");
                      }
                    }}
                  />
                  No campaign-wide discount — only per code (when assigning)
                </label>
              </div>
            ) : null}

            {isShared || !deferBatchRules ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="e-type">Discount type</Label>
                    <select
                      id="e-type"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "fixed" | "percentage")}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount (PKR)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-amt">
                      {discountType === "percentage" ? "Percent off" : "Amount off (PKR)"}
                    </Label>
                    <Input
                      id="e-amt"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      required
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applies to</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="escope"
                        checked={productScope === "all"}
                        onChange={() => setProductScope("all")}
                      />
                      All products
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="escope"
                        checked={productScope === "specific"}
                        onChange={() => setProductScope("specific")}
                      />
                      Specific products
                    </label>
                  </div>
                </div>

                {productScope === "specific" ? (
                  <div className="space-y-2">
                    <Label htmlFor="e-products">Products</Label>
                    <ProductMultiSelect
                      inputId="e-products"
                      products={products}
                      value={selectedProductIds}
                      onChange={setSelectedProductIds}
                      aria-label="Products this campaign applies to"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="e-min">Minimum order amount (PKR)</Label>
                  <Input
                    id="e-min"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="e-from">Valid from</Label>
                    <Input
                      id="e-from"
                      type="datetime-local"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-until">Valid until</Label>
                    <Input
                      id="e-until"
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Redemption needs a full rule set on each code (via <strong>Custom terms</strong>) or add batch defaults by
                unchecking the box above.
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save rules"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {!isShared ? (
        <Card className="mx-auto w-full max-w-5xl">
          <CardHeader>
            <CardTitle>Codes</CardTitle>
            <CardDescription>
              Assign a code to a customer to reserve it for them. Optionally set a voucher name (your reference), custom
              discount or dates, or product scope for that assignment. If this batch has no campaign-wide rules, use{" "}
              <strong>Custom terms</strong> to define the full discount and validity for each code. Leave assign empty for
              an open pool code. Click Save to apply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No instances.</p>
            ) : (
              <ScrollArea className="h-[min(28rem,60vh)] rounded-md border">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="border-b text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Voucher name</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Assign to</th>
                      <th className="px-3 py-2 font-medium w-[260px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((row) => {
                      const used = Boolean(row.redeemed_at);
                      const draft = assignDraft[row.id] ?? "";
                      const ov = overrideDraft[row.id] ?? emptyInstanceOverrides();
                      const panel = Boolean(overridePanelOpen[row.id]);
                      const ovProd =
                        overrideProducts[row.id] ??
                        (row.override_product_ids?.length
                          ? new Set(row.override_product_ids)
                          : new Set<string>());
                      return (
                        <Fragment key={row.id}>
                          <tr className="border-b border-border/50">
                            <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                            <td className="px-3 py-2 align-top">
                              {used ? (
                                <span className="text-xs text-muted-foreground">
                                  {row.voucher_label?.trim() ? row.voucher_label : "—"}
                                </span>
                              ) : (
                                <Input
                                  className="h-8 max-w-[11rem] text-xs"
                                  placeholder="Optional"
                                  value={labelDraft[row.id] ?? ""}
                                  onChange={(e) =>
                                    setLabelDraft((d) => ({ ...d, [row.id]: e.target.value }))
                                  }
                                  aria-label="Optional voucher name for this assignment"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {used ? (
                                <Badge variant="secondary">Used</Badge>
                              ) : (
                                <Badge className="bg-emerald-600/90 hover:bg-emerald-600">Available</Badge>
                              )}
                              {used && row.redeemed_at ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {new Date(row.redeemed_at).toLocaleString()}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {used
                                ? row.assigned_public_user_id
                                  ? userLabel(
                                      publicUsers.find((u) => u.id === row.assigned_public_user_id) ?? {
                                        id: row.assigned_public_user_id,
                                        first_name: "",
                                        last_name: "",
                                        phone: "",
                                      },
                                    )
                                  : "—"
                                : null}
                              {!used && row.assigned_public_user_id ? (
                                <span>
                                  {userLabel(
                                    publicUsers.find((u) => u.id === row.assigned_public_user_id) ?? {
                                      id: row.assigned_public_user_id,
                                      first_name: "",
                                      last_name: "",
                                      phone: "",
                                    },
                                  )}
                                </span>
                              ) : null}
                              {!used && !row.assigned_public_user_id ? (
                                <span className="italic">Open pool</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              {used ? null : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    className="h-8 max-w-[200px] rounded-md border border-input bg-background px-2 text-xs"
                                    value={draft}
                                    onChange={(e) =>
                                      setAssignDraft((d) => ({ ...d, [row.id]: e.target.value }))
                                    }
                                  >
                                    <option value="">Open pool (any customer)</option>
                                    {publicUsers.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {userLabel(u)}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() =>
                                      setOverridePanelOpen((p) => ({ ...p, [row.id]: !p[row.id] }))
                                    }
                                  >
                                    {panel ? "Hide" : "Custom"} terms
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 text-xs"
                                    onClick={() => void onAssign(row.id)}
                                  >
                                    Save
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {panel && !used ? (
                            <tr className="border-b border-border/50 bg-muted/20">
                              <td colSpan={5} className="px-3 py-4">
                                <p className="mb-3 text-xs text-muted-foreground">
                                  Leave fields empty to use the campaign defaults. Filled fields apply only when this code
                                  is assigned to a customer (not for open pool).
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Discount type</Label>
                                    <select
                                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                      value={ov.override_discount_type ?? ""}
                                      onChange={(e) =>
                                        patchOverride(row.id, {
                                          override_discount_type:
                                            e.target.value === ""
                                              ? null
                                              : (e.target.value as "fixed" | "percentage"),
                                        })
                                      }
                                    >
                                      <option value="">Use campaign default</option>
                                      <option value="percentage">Percentage</option>
                                      <option value="fixed">Fixed (PKR)</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Amount</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      inputMode="decimal"
                                      placeholder="Override amount"
                                      value={
                                        ov.override_voucher_amount != null
                                          ? String(ov.override_voucher_amount)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const t = e.target.value.trim();
                                        if (t === "") {
                                          patchOverride(row.id, { override_voucher_amount: null });
                                          return;
                                        }
                                        const n = Number.parseFloat(t);
                                        patchOverride(row.id, {
                                          override_voucher_amount: Number.isNaN(n) ? null : n,
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Min. order (PKR)</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      inputMode="decimal"
                                      placeholder="Override min order"
                                      value={
                                        ov.override_min_order_amount != null
                                          ? String(ov.override_min_order_amount)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const t = e.target.value.trim();
                                        if (t === "") {
                                          patchOverride(row.id, { override_min_order_amount: null });
                                          return;
                                        }
                                        const n = Number.parseFloat(t);
                                        patchOverride(row.id, {
                                          override_min_order_amount: Number.isNaN(n) ? null : n,
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Valid from</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      type="datetime-local"
                                      value={
                                        ov.override_valid_from
                                          ? toDatetimeLocalValue(ov.override_valid_from)
                                          : ""
                                      }
                                      onChange={(e) =>
                                        patchOverride(row.id, {
                                          override_valid_from: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : null,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Valid until</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      type="datetime-local"
                                      value={
                                        ov.override_valid_until
                                          ? toDatetimeLocalValue(ov.override_valid_until)
                                          : ""
                                      }
                                      onChange={(e) =>
                                        patchOverride(row.id, {
                                          override_valid_until: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : null,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                                    <Label className="text-xs">Product scope</Label>
                                    <div className="flex flex-wrap gap-3">
                                      <label className="flex items-center gap-2 text-xs">
                                        <input
                                          type="radio"
                                          name={`ov-scope-${row.id}`}
                                          checked={ov.override_product_scope == null}
                                          onChange={() => {
                                            patchOverride(row.id, {
                                              override_product_scope: null,
                                              override_product_ids: null,
                                            });
                                            setOverrideProducts((prev) => {
                                              const n = { ...prev };
                                              delete n[row.id];
                                              return n;
                                            });
                                          }}
                                        />
                                        Use campaign default
                                      </label>
                                      <label className="flex items-center gap-2 text-xs">
                                        <input
                                          type="radio"
                                          name={`ov-scope-${row.id}`}
                                          checked={ov.override_product_scope === "all"}
                                          onChange={() =>
                                            patchOverride(row.id, {
                                              override_product_scope: "all",
                                              override_product_ids: [],
                                            })
                                          }
                                        />
                                        All products
                                      </label>
                                      <label className="flex items-center gap-2 text-xs">
                                        <input
                                          type="radio"
                                          name={`ov-scope-${row.id}`}
                                          checked={ov.override_product_scope === "specific"}
                                          onChange={() => {
                                            patchOverride(row.id, {
                                              override_product_scope: "specific",
                                              override_product_ids: [],
                                            });
                                            setOverrideProducts((prev) => ({
                                              ...prev,
                                              [row.id]: prev[row.id] ?? new Set<string>(),
                                            }));
                                          }}
                                        />
                                        Specific products
                                      </label>
                                    </div>
                                    {ov.override_product_scope === "specific" ? (
                                      <div className="mt-2">
                                        <ProductMultiSelect
                                          products={products}
                                          value={ovProd}
                                          onChange={(next) =>
                                            setOverrideProducts((prev) => ({ ...prev, [row.id]: next }))
                                          }
                                          placeholder="Search products…"
                                          aria-label="Override products for this code"
                                        />
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="mx-auto flex max-w-3xl">
        <Button type="button" variant="destructive" onClick={() => void onDelete()}>
          Delete entire batch
        </Button>
      </div>
    </div>
  );
}

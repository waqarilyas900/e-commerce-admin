import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  ADMIN_LIST_CARD_CLASS,
  ADMIN_LIST_CARD_HEADER_CLASS,
  ADMIN_LIST_CARD_CONTENT_CLASS,
  ADMIN_LIST_PAGE_CLASS,
} from "@/components/dashboard/admin-list-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { APP_NAME } from "@/config/brand";
import {
  fetchStoreSettings,
  updateStoreSettings,
  type FooterPolicyLinkRow,
  type FooterPolicyLinkStored,
} from "@/lib/supabase/store-settings";
import { fetchPolicyPageSummaries, type PolicyPageSummary } from "@/lib/supabase/policy-pages";
import { uploadFaviconImage } from "@/lib/supabase/storage";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

const STORAGE_KEY = "ecom-admin-panel-settings-v1";

const POLICY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function normalizeInternalAdminPath(href: string): string {
  let p = href.split("#")[0]?.split("?")[0]?.trim() ?? "";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function isAllowedFooterNavHrefAdmin(href: string): boolean {
  const t = href.trim();
  if (!t || t.length > 2048) return false;
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
  if (/[\s<>"`]/.test(t)) return false;
  if (t.startsWith("/") && !t.startsWith("//")) return true;
  if (t.startsWith("https://")) return true;
  if (t.startsWith("http://localhost") || t.startsWith("http://127.0.0.1")) return true;
  return false;
}

function extractPoliciesSlugFromHref(href: string): string {
  const n = normalizeInternalAdminPath(href);
  const m = n.match(/^\/policies\/([a-z0-9-]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

function parseFooterPolicyLinksFromDb(raw: unknown): FooterPolicyLinkRow[] {
  if (!Array.isArray(raw)) return [];
  const out: FooterPolicyLinkRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) continue;
    const hrefStored = typeof o.href === "string" ? o.href.trim() : "";
    const slug = typeof o.slug === "string" ? o.slug.trim().toLowerCase() : "";
    if (hrefStored && isAllowedFooterNavHrefAdmin(hrefStored)) {
      const norm = hrefStored.startsWith("/")
        ? normalizeInternalAdminPath(hrefStored)
        : hrefStored.trim();
      const slugFromHref = norm.startsWith("/") ? extractPoliciesSlugFromHref(norm) : "";
      out.push({
        label,
        slug: slugFromHref || slug || "",
        customHref: norm,
      });
      continue;
    }
    if (slug && POLICY_SLUG_RE.test(slug)) {
      out.push({ label, slug, customHref: "" });
    }
  }
  return out;
}

function sanitizeFooterPolicyLinksForSave(rows: FooterPolicyLinkRow[]): FooterPolicyLinkStored[] {
  const seen = new Set<string>();
  const out: FooterPolicyLinkStored[] = [];
  for (const r of rows) {
    const label = r.label.trim();
    if (!label) continue;
    const ch = r.customHref.trim();
    if (ch) {
      if (!isAllowedFooterNavHrefAdmin(ch)) continue;
      const href = ch.startsWith("/") ? normalizeInternalAdminPath(ch) : ch.trim();
      if (href.startsWith("/") && normalizeInternalAdminPath(href) === "/contact") continue;
      const key = href.startsWith("/") ? normalizeInternalAdminPath(href) : href;
      if (seen.has(key)) continue;
      seen.add(key);
      const slugFromHref = extractPoliciesSlugFromHref(href);
      if (slugFromHref && href === `/policies/${slugFromHref}`) {
        out.push({ label, slug: slugFromHref });
      } else {
        out.push({ label, href });
      }
      continue;
    }
    const slug = r.slug.trim().toLowerCase();
    if (!slug || !POLICY_SLUG_RE.test(slug)) continue;
    const key = `/policies/${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, slug });
  }
  return out;
}

type Settings = {
  displayName: string;
  notifyOrders: boolean;
  notifyInventory: boolean;
};

function load(): Settings {
  if (typeof window === "undefined") {
    return {
      displayName: APP_NAME,
      notifyOrders: true,
      notifyInventory: true,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        displayName: APP_NAME,
        notifyOrders: true,
        notifyInventory: true,
      };
    }
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : APP_NAME,
      notifyOrders: Boolean(parsed.notifyOrders ?? true),
      notifyInventory: Boolean(parsed.notifyInventory ?? true),
    };
  } catch {
    return {
      displayName: APP_NAME,
      notifyOrders: true,
      notifyInventory: true,
    };
  }
}

export function SettingsPage() {
  const dnId = useId();
  const storeNameId = useId();
  const supportEmailId = useId();
  const currencyId = useId();
  const [displayName, setDisplayName] = useState(APP_NAME);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyInventory, setNotifyInventory] = useState(true);
  const [saved, setSaved] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [footerPhone, setFooterPhone] = useState("");
  const [footerHoursLine, setFooterHoursLine] = useState("");
  const [footerCustomerCareTitle, setFooterCustomerCareTitle] = useState("Customer care");
  const [footerPolicyLinks, setFooterPolicyLinks] = useState<FooterPolicyLinkRow[]>([]);
  const [policySummaries, setPolicySummaries] = useState<PolicyPageSummary[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState("PKR");
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaved, setStoreSaved] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const s = load();
      setDisplayName(s.displayName);
      setNotifyOrders(s.notifyOrders);
      setNotifyInventory(s.notifyInventory);
    });
  }, []);

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setStoreLoading(false));
      return;
    }
    void Promise.all([fetchStoreSettings(), fetchPolicyPageSummaries()]).then(([row, policies]) => {
      setPolicySummaries(policies);
      if (row) {
        setStoreName(row.store_name);
        setSiteTitle(row.site_title ?? "");
        setSiteDescription(row.site_description ?? "");
        setFaviconUrl(row.favicon_url ?? "");
        setSupportEmail(row.support_email);
        setFooterPhone(row.footer_phone ?? "");
        setFooterHoursLine(row.footer_hours_line ?? "");
        setFooterCustomerCareTitle((row.footer_customer_care_title ?? "").trim() || "Customer care");
        setFooterPolicyLinks(parseFooterPolicyLinksFromDb(row.footer_policy_links));
        setDefaultCurrency(row.default_currency || "PKR");
      }
      setStoreLoading(false);
    });
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Settings = {
      displayName: displayName.trim() || APP_NAME,
      notifyOrders,
      notifyInventory,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      toast.error("Could not save preferences in this browser.");
      return;
    }
    toast.success("Workspace preferences saved.");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  async function onSaveStore(e: FormEvent) {
    e.preventDefault();
    const trimmedName = storeName.trim();
    if (!trimmedName) {
      toast.error("Store name is required — it powers the storefront and emails.");
      return;
    }
    const res = await updateStoreSettings({
      store_name: trimmedName,
      site_title: siteTitle.trim(),
      site_description: siteDescription.trim(),
      favicon_url: faviconUrl.trim(),
      support_email: supportEmail.trim(),
      footer_phone: footerPhone.trim(),
      footer_hours_line: footerHoursLine.trim(),
      footer_customer_care_title: footerCustomerCareTitle.trim() || "Customer care",
      footer_policy_links: sanitizeFooterPolicyLinksForSave(footerPolicyLinks),
      default_currency: defaultCurrency.trim().toUpperCase() || "PKR",
    });
    if (!res.ok) {
      toast.error(res.error ?? "Save failed.");
      return;
    }
    toast.success("Store settings saved.");
    setStoreSaved(true);
    window.setTimeout(() => setStoreSaved(false), 2500);
  }

  async function onUploadFaviconFile(file: File) {
    setFaviconUploading(true);
    try {
      const up = await uploadFaviconImage(file);
      if ("error" in up) {
        toast.error(up.error);
        return;
      }
      setFaviconUrl(up.publicUrl);
      toast.success("Favicon uploaded. Save store settings to apply it.");
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) {
        faviconInputRef.current.value = "";
      }
    }
  }

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Settings"
        description="Store profile and contact details are saved for your live site. Delivery pricing is under Store configuration → Delivery. Workspace preferences below stay in this browser only."
      />

      <form onSubmit={onSaveStore} className="mx-auto w-full max-w-3xl space-y-6">
        <Card className={ADMIN_LIST_CARD_CLASS}>
          <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
            <CardTitle>Store (database)</CardTitle>
            <CardDescription>
              Identity, SEO, and footer details shown to customers on the storefront.
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "space-y-4")}>
            {storeLoading ? (
              <p className="text-sm text-muted-foreground">Loading store settings…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={storeNameId}>Store name</Label>
                  <Input
                    id={storeNameId}
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    autoComplete="organization"
                    required
                    placeholder="e.g. Outflint"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required. Shown in the header, checkout, and transactional email subjects — stored only in the
                    database.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-title">Site title (SEO)</Label>
                  <Input
                    id="site-title"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    placeholder="Browser tab title — empty uses store name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-desc">Meta description</Label>
                  <Input
                    id="site-desc"
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="Short description for search results"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon-url">Favicon URL</Label>
                  <Input
                    id="favicon-url"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://cdn.example.com/favicon.png or /favicon.ico"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void onUploadFaviconFile(file);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={faviconUploading}
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      {faviconUploading ? "Uploading..." : "Upload favicon"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Stored in bucket <code>e-commerce-store/branding/favicons</code> (max 1 MB).
                    </span>
                  </div>
                  {faviconUrl.trim() ? (
                    <div className="flex items-center gap-3 rounded-md border border-border p-2">
                      <img
                        src={faviconUrl}
                        alt="Favicon preview"
                        className="h-8 w-8 rounded object-contain"
                        loading="lazy"
                      />
                      <span className="truncate text-xs text-muted-foreground">{faviconUrl}</span>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Used in browser tabs and search results metadata. Use an absolute URL or a root-relative path.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={supportEmailId}>Support email</Label>
                  <Input
                    id={supportEmailId}
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer-phone">Footer phone / WhatsApp</Label>
                  <Input
                    id="footer-phone"
                    value={footerPhone}
                    onChange={(e) => setFooterPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer-hours">Footer hours line</Label>
                  <Input
                    id="footer-hours"
                    value={footerHoursLine}
                    onChange={(e) => setFooterHoursLine(e.target.value)}
                    placeholder="e.g. Mon–Sat 9am–6pm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={currencyId}>Default currency (ISO 4217)</Label>
                  <Input
                    id={currencyId}
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    placeholder="PKR"
                    className="max-w-[120px] font-mono uppercase"
                  />
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <Label htmlFor="footer-cc-title">Customer care — section title</Label>
                  <Input
                    id="footer-cc-title"
                    value={footerCustomerCareTitle}
                    onChange={(e) => setFooterCustomerCareTitle(e.target.value)}
                    placeholder="Customer care"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Contact us</strong> always links to{" "}
                    <code className="rounded bg-muted px-1">/contact</code> first. Footer items are now managed
                    from <strong>Footer items</strong> in the left menu. This section is legacy and only used as a
                    fallback.
                  </p>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <Label className="text-base font-medium">Legacy footer links (fallback)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFooterPolicyLinks((prev) => {
                          const used = new Set(prev.map((p) => p.slug.trim()).filter(Boolean));
                          const pick = policySummaries.find((p) => p.slug && !used.has(p.slug));
                          if (pick) return [...prev, { slug: pick.slug, label: pick.title, customHref: "" }];
                          return [...prev, { slug: "", label: "", customHref: "" }];
                        });
                      }}
                    >
                      Add policy link
                    </Button>
                  </div>
                  {footerPolicyLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No fallback links configured.
                    </p>
                  ) : (
                    <ul className="space-y-5">
                      {footerPolicyLinks.map((row, index) => (
                        <li
                          key={`policy-row-${index}-${row.slug}-${row.customHref}`}
                          className="flex flex-col gap-2.5"
                        >
                          <div className="min-w-0 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Link text</Label>
                            <Input
                              value={row.label}
                              onChange={(e) => {
                                const v = e.target.value;
                                setFooterPolicyLinks((p) =>
                                  p.map((x, i) => (i === index ? { ...x, label: v } : x)),
                                );
                              }}
                              placeholder="e.g. Shipping Policy"
                            />
                          </div>
                          <div className="w-full max-w-md space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Page slug</Label>
                            {policySummaries.length > 0 ? (
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={row.slug}
                                onChange={(e) => {
                                  const slug = e.target.value;
                                  const title = policySummaries.find((p) => p.slug === slug)?.title ?? "";
                                  setFooterPolicyLinks((p) =>
                                    p.map((x, i) =>
                                      i === index
                                        ? {
                                            slug,
                                            customHref: "",
                                            label: slug && !x.label.trim() ? title : x.label,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                              >
                                <option value="">Select slug…</option>
                                {policySummaries.map((p) => (
                                  <option key={p.slug} value={p.slug}>
                                    {p.slug} — {p.title}
                                  </option>
                                ))}
                                {row.slug && !policySummaries.some((p) => p.slug === row.slug) ? (
                                  <option value={row.slug}>{row.slug} (saved)</option>
                                ) : null}
                              </select>
                            ) : (
                              <Input
                                value={row.slug}
                                onChange={(e) =>
                                  setFooterPolicyLinks((p) =>
                                    p.map((x, i) =>
                                      i === index
                                        ? { ...x, slug: e.target.value.toLowerCase(), customHref: "" }
                                        : x,
                                    ),
                                  )
                                }
                                placeholder="e.g. shipping"
                                className="font-mono text-sm lowercase"
                              />
                            )}
                          </div>
                          <div className="w-full max-w-xl space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Custom URL (optional — overrides slug)
                            </Label>
                            <Input
                              value={row.customHref}
                              onChange={(e) =>
                                setFooterPolicyLinks((p) =>
                                  p.map((x, i) => (i === index ? { ...x, customHref: e.target.value } : x)),
                                )
                              }
                              placeholder="e.g. /policies/privacy or https://example.com/legal"
                              className="font-mono text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Opens:{" "}
                              <code className="rounded bg-muted px-1">
                                {row.customHref.trim() ||
                                  (row.slug.trim()
                                    ? `/policies/${row.slug.trim().toLowerCase()}`
                                    : "—")}
                              </code>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={index === 0}
                              aria-label="Move up"
                              onClick={() =>
                                setFooterPolicyLinks((p) => {
                                  if (index === 0) return p;
                                  const n = [...p];
                                  [n[index - 1], n[index]] = [n[index], n[index - 1]];
                                  return n;
                                })
                              }
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={index >= footerPolicyLinks.length - 1}
                              aria-label="Move down"
                              onClick={() =>
                                setFooterPolicyLinks((p) => {
                                  if (index >= p.length - 1) return p;
                                  const n = [...p];
                                  [n[index], n[index + 1]] = [n[index + 1], n[index]];
                                  return n;
                                })
                              }
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setFooterPolicyLinks((p) => p.filter((_, i) => i !== index))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button type="submit" size="sm">
                  Save store settings
                </Button>
                {storeSaved ? (
                  <span className="ml-2 text-sm text-muted-foreground" role="status">
                    Saved
                  </span>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </form>

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl space-y-6">
        <Card className={ADMIN_LIST_CARD_CLASS}>
          <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Shown in the window title and command palette hints.</CardDescription>
          </CardHeader>
          <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "space-y-4")}>
            <div className="space-y-2">
              <Label htmlFor={dnId}>Display name</Label>
              <Input
                id={dnId}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="organization"
              />
            </div>
          </CardContent>
        </Card>

        <Card className={ADMIN_LIST_CARD_CLASS}>
          <CardHeader className={ADMIN_LIST_CARD_HEADER_CLASS}>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose which alerts you want when in-app notifications are enabled.</CardDescription>
          </CardHeader>
          <CardContent className={cn(ADMIN_LIST_CARD_CONTENT_CLASS, "space-y-4")}>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox checked={notifyOrders} onCheckedChange={(c) => setNotifyOrders(c === true)} />
              Order events
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox checked={notifyInventory} onCheckedChange={(c) => setNotifyInventory(c === true)} />
              Low stock warnings
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">Save settings</Button>
          {saved ? (
            <span className="text-sm text-muted-foreground" role="status">
              Saved
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

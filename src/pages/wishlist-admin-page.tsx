import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
import {
  AdminListCard,
  AdminListEmpty,
  AdminListSkeleton,
  AdminFilterBar,
  ADMIN_LIST_PAGE_CLASS,
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  adminTh,
  adminThEnd,
  adminTd,
} from "@/components/dashboard/admin-list-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fetchRestockQueueAdmin,
  fetchTopWishlistedProductsAdmin,
  fetchWishlistOverviewStats,
  fetchWishlistRowsAdmin,
  type WishlistAdminRow,
  type WishlistProductRank,
  type RestockQueueAdminRow,
} from "@/lib/supabase/wishlist-admin";
import { supabase } from "@/lib/supabase/client";

type MainTab = "browse" | "queue" | "rankings";

const KINDS: Array<{ value: "all" | "variant" | "snapshot"; label: string }> = [
  { value: "all", label: "All" },
  { value: "variant", label: "Saved SKU" },
  { value: "snapshot", label: "Option demand" },
];

function formatUserLabel(r: WishlistAdminRow): string {
  const n = `${r.user_first_name ?? ""} ${r.user_last_name ?? ""}`.trim();
  return n || "—";
}

function OptionsJson({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <code className="block max-w-[280px] truncate text-xs" title={JSON.stringify(value)}>
      {JSON.stringify(value)}
    </code>
  );
}

export function WishlistAdminPage() {
  const [mainTab, setMainTab] = useState<MainTab>("browse");
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchWishlistOverviewStats>> | null>(null);
  const [rows, setRows] = useState<WishlistAdminRow[]>([]);
  const [rowTotal, setRowTotal] = useState(0);
  const [queue, setQueue] = useState<RestockQueueAdminRow[]>([]);
  const [rankings, setRankings] = useState<WishlistProductRank[]>([]);
  const [kind, setKind] = useState<"all" | "variant" | "snapshot">("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [metaLoading, setMetaLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    if (!supabase) return;
    const [s, q, r] = await Promise.all([
      fetchWishlistOverviewStats(),
      fetchRestockQueueAdmin(150),
      fetchTopWishlistedProductsAdmin(20, 8000),
    ]);
    setStats(s);
    setQueue(q);
    setRankings(r);
  }, []);

  const loadBrowse = useCallback(async () => {
    if (!supabase) return;
    const { rows: data, total } = await fetchWishlistRowsAdmin({
      kind,
      limit: pageSize,
      offset: page * pageSize,
    });
    setRows(data);
    setRowTotal(total);
  }, [kind, page]);

  useEffect(() => {
    if (!supabase) {
      setError(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      setMetaLoading(false);
      setTableLoading(false);
      return;
    }
    setError(null);
    void (async () => {
      setMetaLoading(true);
      try {
        await loadMeta();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load wishlist overview.");
      } finally {
        setMetaLoading(false);
      }
    })();
  }, [loadMeta]);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      setTableLoading(true);
      try {
        await loadBrowse();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load wishlist rows.");
      } finally {
        setTableLoading(false);
      }
    })();
  }, [loadBrowse]);

  async function loadAll() {
    if (!supabase) {
      setError(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      return;
    }
    setError(null);
    await Promise.all([
      (async () => {
        setMetaLoading(true);
        try {
          await loadMeta();
        } finally {
          setMetaLoading(false);
        }
      })(),
      (async () => {
        setTableLoading(true);
        try {
          await loadBrowse();
        } finally {
          setTableLoading(false);
        }
      })(),
    ]);
  }

  const mainTabs = (
    <AdminFilterBar>
      {(
        [
          { id: "browse" as const, label: "Browse saves" },
          { id: "queue" as const, label: "Restock queue" },
          { id: "rankings" as const, label: "Top products" },
        ] as const
      ).map((t) => (
        <Button
          key={t.id}
          type="button"
          size="sm"
          variant={mainTab === t.id ? "default" : "ghost"}
          className={cn(
            "rounded-lg",
            mainTab === t.id ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setMainTab(t.id)}
        >
          {t.label}
        </Button>
      ))}
    </AdminFilterBar>
  );

  const kindFilter =
    mainTab === "browse" ? (
      <AdminFilterBar>
        {KINDS.map((k) => (
          <Button
            key={k.value}
            type="button"
            size="sm"
            variant={kind === k.value ? "default" : "ghost"}
            className={cn(
              "rounded-lg",
              kind === k.value ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setKind(k.value);
              setPage(0);
            }}
          >
            {k.label}
          </Button>
        ))}
      </AdminFilterBar>
    ) : null;

  const totalPages = Math.max(1, Math.ceil(rowTotal / pageSize));

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Wishlist"
        description="Customer saves from the storefront: resolved SKUs, option-only demand (no variant yet), and restock notification jobs. Data loads directly from Supabase with admin RLS."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void loadAll()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh all
          </Button>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total rows</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {metaLoading && !stats ? "—" : stats?.totalRows.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Saved SKUs</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {metaLoading && !stats ? "—" : stats?.variantRows.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Option demand</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {metaLoading && !stats ? "—" : stats?.optionSnapshotRows.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Notify on restock</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {metaLoading && !stats ? "—" : stats?.notifyOnRestockRows.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Queue pending</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {metaLoading && !stats ? "—" : stats?.pendingRestockQueue.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Successful restock emails remove the wishlist row on the storefront cron — counts reflect current
        database state. Apply migration <code className="rounded bg-muted px-1">20260415200000_restock_queue_admin_select</code>{" "}
        so the restock queue is visible to admins.
      </p>

      <AdminListCard title="Views" description="Switch between browsing saved items, email queue health, and demand by product." headerRight={mainTabs}>
        {mainTab === "browse" ? (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {kindFilter}
              <p className="text-sm text-muted-foreground">
                Showing {rows.length} of {rowTotal.toLocaleString()} (page {page + 1} / {totalPages})
              </p>
            </div>
            {tableLoading ? (
              <AdminListSkeleton />
            ) : rows.length === 0 ? (
              <AdminListEmpty>No wishlist rows for this filter.</AdminListEmpty>
            ) : (
              <TableContainer>
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead>
                    <tr className={ADMIN_TABLE_HEAD}>
                      <th className={adminTh()}>Kind</th>
                      <th className={adminTh()}>Product</th>
                      <th className={adminTh()}>Variant / options</th>
                      <th className={adminTh()}>Customer</th>
                      <th className={adminTh()}>Notify</th>
                      <th className={adminTh()}>Saved</th>
                      <th className={adminThEnd()}>Product id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className={ADMIN_TABLE_ROW}>
                        <td className={adminTd()}>
                          <Badge variant={r.kind === "variant" ? "secondary" : "outline"}>
                            {r.kind === "variant" ? "SKU" : "Options"}
                          </Badge>
                        </td>
                        <td className={adminTd()}>
                          <div className="flex flex-col gap-0.5">
                            <span className="max-w-[200px] truncate font-medium" title={r.product_name ?? ""}>
                              {r.product_name ?? "—"}
                            </span>
                            {r.product_slug ? (
                              <span className="text-xs text-muted-foreground">{r.product_slug}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className={adminTd()}>
                          {r.kind === "variant" ? (
                            <span className="font-mono text-xs">{r.variant_sku ?? r.product_variant_id}</span>
                          ) : (
                            <OptionsJson value={r.requested_option_values} />
                          )}
                        </td>
                        <td className={adminTd()}>
                          <span className="max-w-[140px] truncate">{formatUserLabel(r)}</span>
                        </td>
                        <td className={adminTd()}>
                          <div className="flex flex-col gap-1">
                            <Badge variant={r.notify_on_restock ? "default" : "outline"}>
                              {r.notify_on_restock ? "yes" : "no"}
                            </Badge>
                            {r.restock_notified_at ? (
                              <span className="text-xs text-muted-foreground">
                                Last sent {new Date(r.restock_notified_at).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={adminTd("text-muted-foreground")}>
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className={cn(adminTd(), "text-right")}>
                          <Button variant="link" className="h-auto p-0 font-mono text-xs" asChild>
                            <Link to={`/dashboard/products/${r.product_id}`}>Open</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0 || tableLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || tableLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        ) : null}

        {mainTab === "queue" ? (
          metaLoading && queue.length === 0 ? (
            <AdminListSkeleton />
          ) : queue.length === 0 ? (
            <AdminListEmpty>No restock queue rows (pending or recent). Check migration if this stays empty while storefront sends emails.</AdminListEmpty>
          ) : (
            <TableContainer>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className={adminTh()}>Status</th>
                    <th className={adminTh()}>Email</th>
                    <th className={adminTh()}>Product</th>
                    <th className={adminTh()}>SKU</th>
                    <th className={adminTh()}>Queued</th>
                    <th className={adminThEnd()}>Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((q) => (
                    <tr key={q.id} className={ADMIN_TABLE_ROW}>
                      <td className={adminTd()}>
                        <Badge variant={q.processed_at ? "secondary" : "default"}>
                          {q.processed_at ? "done" : "pending"}
                        </Badge>
                      </td>
                      <td className={adminTd("max-w-[200px] truncate")} title={q.user_email}>
                        {q.user_email}
                      </td>
                      <td className={adminTd()}>{q.product_name ?? "—"}</td>
                      <td className={adminTd("font-mono text-xs")}>{q.variant_sku ?? "—"}</td>
                      <td className={adminTd("text-muted-foreground")}>
                        {new Date(q.created_at).toLocaleString()}
                      </td>
                      <td className={adminTd("text-right text-muted-foreground")}>
                        {q.processed_at ? new Date(q.processed_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          )
        ) : null}

        {mainTab === "rankings" ? (
          metaLoading && rankings.length === 0 ? (
            <AdminListSkeleton />
          ) : rankings.length === 0 ? (
            <AdminListEmpty>No wishlist data to rank yet.</AdminListEmpty>
          ) : (
            <TableContainer>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className={adminTh()}>#</th>
                    <th className={adminTh()}>Product</th>
                    <th className={adminTh()}>Total saves</th>
                    <th className={adminTh()}>SKU rows</th>
                    <th className={adminTh()}>Option demand</th>
                    <th className={adminThEnd()} />
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, i) => (
                    <tr key={r.product_id} className={ADMIN_TABLE_ROW}>
                      <td className={adminTd("tabular-nums text-muted-foreground")}>{i + 1}</td>
                      <td className={adminTd()}>
                        <span className="font-medium">{r.product_name ?? "—"}</span>
                      </td>
                      <td className={adminTd("tabular-nums")}>{r.save_count}</td>
                      <td className={adminTd("tabular-nums")}>{r.variant_row_count}</td>
                      <td className={adminTd("tabular-nums")}>{r.snapshot_count}</td>
                      <td className={cn(adminTd(), "text-right")}>
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                          <Link to={`/dashboard/products/${r.product_id}`}>Edit product</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          )
        ) : null}
      </AdminListCard>

      <Card className="border-dashed border-border/80 bg-muted/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Customer support</CardTitle>
          </div>
          <CardDescription>
            Open a customer profile to see their personal wishlist alongside orders and reviews. Product links above go
            to catalog edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Each customer profile includes a <strong className="font-medium text-foreground">Wishlist</strong> table
            when you open <span className="font-mono text-xs">/dashboard/customers/:id</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

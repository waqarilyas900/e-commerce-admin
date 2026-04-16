import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  AdminListCard,
  AdminListSkeleton,
  ADMIN_LIST_PAGE_CLASS,
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  adminTh,
  adminThEnd,
  adminTd,
  AdminRowEditLink,
} from "@/components/dashboard/admin-list-shell";
import {
  fetchProductsWithVariantCount,
  type ProductCatalogTagRef,
} from "@/lib/supabase/catalog";
import type { ProductRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Row = ProductRow & { variant_count: number; catalog_tags: ProductCatalogTagRef[] };

export function ProductsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!supabase) {
      toast.error("Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchProductsWithVariantCount();
      setRows(data as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Products"
        description="Parent listings and sellable SKUs: each product can have variants (size, color, etc.) with their own price and stock."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Link>
            </Button>
          </>
        }
      />

      <AdminListCard
        title="Catalog"
        description="Manage listings and variant counts. Open a row to edit details, media, and SKUs."
      >
        {loading ? (
          <AdminListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Create your first listing to appear on the storefront. You can add variants, images, and inventory in the editor."
          >
            <Button size="sm" asChild>
              <Link to="/dashboard/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Link>
            </Button>
          </EmptyState>
        ) : (
          <TableContainer>
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Name</th>
                  <th className={adminTh()}>Slug</th>
                  <th className={adminTh()}>Status</th>
                  <th className={adminTh()}>Tags</th>
                  <th className={adminTh()}>Variants</th>
                  <th className={adminThEnd()} />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd("font-medium text-foreground")}>{p.name}</td>
                    <td className={adminTd("font-mono text-xs text-muted-foreground")}>{p.slug}</td>
                    <td className={adminTd()}>
                      <Badge
                        variant={p.status === "active" ? "success" : "secondary"}
                        className="font-medium capitalize"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className={adminTd("max-w-[min(280px,32vw)] align-top")}>
                      {p.catalog_tags.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.catalog_tags.map((t) => {
                            const isLegacy = t.id.startsWith("legacy:");
                            const pill = (
                              <Badge
                                variant="outline"
                                className="max-w-[11rem] truncate font-normal"
                                title={t.label}
                              >
                                {t.label}
                              </Badge>
                            );
                            return isLegacy ? (
                              <span key={t.id}>{pill}</span>
                            ) : (
                              <Link
                                key={t.id}
                                to={`/dashboard/tags/${t.id}`}
                                className="inline-flex max-w-full shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {pill}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className={adminTd("tabular-nums text-muted-foreground")}>{p.variant_count}</td>
                    <td className={cn(adminTd(), "text-right")}>
                      <AdminRowEditLink to={`/dashboard/products/${p.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </AdminListCard>
    </div>
  );
}

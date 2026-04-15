import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
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
import { fetchProductsWithVariantCount } from "@/lib/supabase/catalog";
import type { ProductRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Row = ProductRow & { variant_count: number };

export function ProductsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setError("Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await fetchProductsWithVariantCount();
      setRows(data as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
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

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

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
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Name</th>
                  <th className={adminTh()}>Slug</th>
                  <th className={adminTh()}>Status</th>
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

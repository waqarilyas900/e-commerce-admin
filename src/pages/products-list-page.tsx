import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
import {
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
} from "@/components/dashboard/table-container";
import { fetchProductsWithVariantCount } from "@/lib/supabase/catalog";
import type { ProductRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";

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
    <div className="space-y-8">
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

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            Add electronics listings with <strong>Add product</strong>, or import catalog data using your usual deployment
            process. Variants are counted per parent below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet. Use Add product to create your first listing.</p>
          ) : (
            <TableContainer>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Slug</th>
                    <th className="px-3 py-2.5 pr-4">Status</th>
                    <th className="px-3 py-2.5 pr-4">Variants</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {p.slug}
                      </td>
                      <td className="px-3 py-2.5 pr-4">
                        <Badge variant={p.status === "active" ? "success" : "secondary"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums">{p.variant_count}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/dashboard/products/${p.id}`}>Edit</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

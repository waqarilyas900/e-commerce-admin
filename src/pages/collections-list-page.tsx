import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { fetchCollections } from "@/lib/supabase/catalog";
import type { CollectionRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";

export function CollectionsListPage() {
  const [rows, setRows] = useState<CollectionRow[]>([]);
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
      const data = await fetchCollections();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collections.");
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
        title="Collections"
        description="Merchandising groups for the site — a product can sit in none, one, or several collections."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/collections/new">
                <Plus className="mr-2 h-4 w-4" />
                Add collection
              </Link>
            </Button>
          </>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <Card>
        <CardHeader>
          <CardTitle>All collections</CardTitle>
          <CardDescription>
            Empty collections still appear on the storefront; assign products from each product&apos;s
            edit screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collections yet.</p>
          ) : (
            <TableContainer>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Slug</th>
                    <th className="px-3 py-2.5 pr-4">Sort</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 font-medium">{c.name}</td>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {c.slug}
                      </td>
                      <td className="px-3 py-2.5 pr-4">{c.sort_order}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link to={`/dashboard/collections/${c.id}`}>Edit</Link>
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

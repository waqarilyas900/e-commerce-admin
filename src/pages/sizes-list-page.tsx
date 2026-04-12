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
import { fetchSizes } from "@/lib/supabase/catalog";
import type { SizeRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";

export function SizesListPage() {
  const [rows, setRows] = useState<SizeRow[]>([]);
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
      const data = await fetchSizes();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sizes.");
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
        title="Sizes"
        description="Global list used when creating product variants (S, M, L, shoe sizes, etc.)."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/sizes/new">
                <Plus className="mr-2 h-4 w-4" />
                Add size
              </Link>
            </Button>
          </>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <Card>
        <CardHeader>
          <CardTitle>All sizes</CardTitle>
          <CardDescription>
            Display name is customer-facing; name is the internal key. Inactive rows stay on saved
            variants but are hidden from new picks. Deleting clears FK on variants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sizes yet.</p>
          ) : (
            <TableContainer>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Display name</th>
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Type</th>
                    <th className="px-3 py-2.5 pr-4">Sort</th>
                    <th className="px-3 py-2.5 pr-4">Status</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 font-medium">{s.display_name}</td>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {s.name}
                      </td>
                      <td className="px-3 py-2.5 pr-4 capitalize">{s.size_type}</td>
                      <td className="px-3 py-2.5 pr-4">{s.sort_order}</td>
                      <td className="px-3 py-2.5 pr-4">
                        {s.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link to={`/dashboard/sizes/${s.id}`}>Edit</Link>
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

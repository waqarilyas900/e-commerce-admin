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
import { fetchColors } from "@/lib/supabase/catalog";
import type { ColorRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";

function SwatchPreview({ color }: { color: ColorRow }) {
  if (color.swatch_image_url?.trim()) {
    return (
      <span className="inline-block h-8 w-8 overflow-hidden rounded border border-border">
        <img src={color.swatch_image_url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  const hx = color.hex?.trim();
  return (
    <span
      className="inline-block h-8 w-8 rounded border border-border"
      style={
        hx
          ? { backgroundColor: hx }
          : color.rgb?.trim()
            ? { backgroundColor: color.rgb }
            : { backgroundColor: "#e5e5e5" }
      }
    />
  );
}

export function ColorsListPage() {
  const [rows, setRows] = useState<ColorRow[]>([]);
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
      setRows(await fetchColors());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load colors.");
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
        title="Colors"
        description="Color swatches for variants: display name, optional hex, RGB, or texture image, and whether it appears in pickers."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/colors/new">
                <Plus className="mr-2 h-4 w-4" />
                Add color
              </Link>
            </Button>
          </>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <Card>
        <CardHeader>
          <CardTitle>All colors</CardTitle>
          <CardDescription>
            Inactive colors stay on saved variants but are hidden from new selections until
            re-activated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No colors yet.</p>
          ) : (
            <TableContainer>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="w-10 px-2 py-2.5" aria-label="Swatch" />
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Hex</th>
                    <th className="px-3 py-2.5 pr-4">RGB</th>
                    <th className="px-3 py-2.5 pr-4">Sort</th>
                    <th className="px-3 py-2.5 pr-4">Active</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-2 py-2.5">
                        <SwatchPreview color={c} />
                      </td>
                      <td className="px-3 py-2.5 pr-4 font-medium">{c.name}</td>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {c.hex ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                        {c.rgb ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4">{c.sort_order}</td>
                      <td className="px-3 py-2.5 pr-4">
                        {c.is_active ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link to={`/dashboard/colors/${c.id}`}>Edit</Link>
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

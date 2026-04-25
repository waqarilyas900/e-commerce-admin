import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";
import {
  AdminListCard,
  AdminListSkeleton,
  AdminListEmpty,
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
  fetchPolicyPagesAdmin,
  type PolicyPageAdminRow,
} from "@/lib/supabase/policy-pages-admin";
import { supabase } from "@/lib/supabase/client";

function storefrontOrigin(): string {
  const raw = import.meta.env.VITE_STOREFRONT_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function PoliciesListPage() {
  const [rows, setRows] = useState<PolicyPageAdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) {
      toast.error(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await fetchPolicyPagesAdmin());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load policies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const origin = storefrontOrigin();

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Footer items"
        description="Create and edit footer pages (title, slug, content). These items are shown in storefront footer under Customer care (after Contact us)."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/policies/new">
                <Plus className="mr-2 h-4 w-4" />
                Add footer item
              </Link>
            </Button>
          </>
        }
      />

      <AdminListCard
        title="All footer items"
        description={`Live URLs use your storefront origin (${origin}) with plain slugs.`}
      >
        {loading ? (
          <AdminListSkeleton />
        ) : rows.length === 0 ? (
          <AdminListEmpty>No footer items yet. Add one to show it in the storefront footer.</AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Title</th>
                  <th className={adminTh()}>URL slug</th>
                  <th className={adminTh()}>Sort</th>
                  <th className={adminThEnd()} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const live = `${origin}/${encodeURIComponent(r.slug)}`;
                  return (
                    <tr key={r.id} className={ADMIN_TABLE_ROW}>
                      <td className={adminTd("font-medium")}>{r.title}</td>
                      <td className={adminTd("font-mono text-xs text-muted-foreground")}>{r.slug}</td>
                      <td className={adminTd("text-muted-foreground")}>{r.sort_order}</td>
                      <td className={adminTd("text-right")}>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <a href={live} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Open live page</span>
                            </a>
                          </Button>
                          <AdminRowEditLink to={`/dashboard/policies/${r.id}`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
      </AdminListCard>
    </div>
  );
}

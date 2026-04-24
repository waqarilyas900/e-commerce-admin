import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { fetchHomePageSections } from "@/lib/supabase/catalog";
import type { HomePageSectionRow } from "@/lib/supabase/catalog-types";
import { supabase } from "@/lib/supabase/client";

export function HomeSectionsListPage() {
  const [rows, setRows] = useState<HomePageSectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!supabase) {
      toast.error(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchHomePageSections();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load home sections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Home sections"
        description="Named product rows on the storefront home page — each section matches products by one or more tags (any tag matches)."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/home-sections/new">
                <Plus className="mr-2 h-4 w-4" />
                Add section
              </Link>
            </Button>
          </>
        }
      />

      <AdminListCard
        title="All sections"
        description="Inactive sections are hidden on the site. Sort order controls top-to-bottom placement."
      >
        {loading ? (
          <AdminListSkeleton />
        ) : rows.length === 0 ? (
          <AdminListEmpty>No home sections yet.</AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Name</th>
                  <th className={adminTh()}>Slug</th>
                  <th className={adminTh()}>Status</th>
                  <th className={adminTh()}>Sort</th>
                  <th className={adminThEnd()} />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd("font-medium")}>{s.name}</td>
                    <td className={adminTd("font-mono text-xs text-muted-foreground")}>{s.slug}</td>
                    <td className={adminTd()}>
                      {s.is_active ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </td>
                    <td className={adminTd()}>{s.sort_order}</td>
                    <td className={adminTd("text-right")}>
                      <AdminRowEditLink to={`/dashboard/home-sections/${s.id}`}>
                        Edit
                      </AdminRowEditLink>
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

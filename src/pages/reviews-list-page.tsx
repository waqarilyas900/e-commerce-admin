import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { FlashMessage } from "@/components/dashboard/flash-message";
import {
  AdminListCard,
  AdminListSkeleton,
  AdminListEmpty,
  AdminFilterBar,
  ADMIN_LIST_PAGE_CLASS,
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  adminTh,
  adminThEnd,
  adminTd,
} from "@/components/dashboard/admin-list-shell";
import {
  fetchReviewsAdmin,
  updateReviewStatusAdmin,
  type ReviewAdminRow,
  type ReviewModerationStatus,
} from "@/lib/supabase/reviews-admin";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TABS: Array<{ value: ReviewModerationStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function ReviewsListPage() {
  const [rows, setRows] = useState<ReviewAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewModerationStatus | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setError(
        "Database connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
      );
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await fetchReviewsAdmin({ limit: 200, status: filter });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  async function setStatus(id: string, status: ReviewModerationStatus) {
    setBusyId(id);
    const res = await updateReviewStatusAdmin(id, status);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error ?? "Update failed.");
      return;
    }
    await load();
  }

  const filterBar = (
    <AdminFilterBar>
      {TABS.map((t) => (
        <Button
          key={t.value}
          type="button"
          size="sm"
          variant={filter === t.value ? "default" : "ghost"}
          className={cn(
            "rounded-lg",
            filter === t.value ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setFilter(t.value)}
        >
          {t.label}
        </Button>
      ))}
    </AdminFilterBar>
  );

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Reviews"
        description="Moderate storefront reviews: pending items are hidden from the public catalog until approved."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <AdminListCard
        title="Moderation queue"
        description="Linked product names load when the foreign key embed succeeds."
        headerRight={filterBar}
      >
        {loading ? (
          <AdminListSkeleton />
        ) : rows.length === 0 ? (
          <AdminListEmpty>No reviews in this filter.</AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Product</th>
                  <th className={adminTh()}>Rating</th>
                  <th className={adminTh()}>Title</th>
                  <th className={adminTh()}>Status</th>
                  <th className={adminTh()}>Submitted</th>
                  <th className={adminThEnd()}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd("max-w-[200px] truncate")} title={r.product_name ?? undefined}>
                      {r.product_name ?? "—"}
                    </td>
                    <td className={adminTd("tabular-nums")}>{r.rating} / 5</td>
                    <td className={adminTd("max-w-[240px] truncate")}>{r.title || r.body.slice(0, 48)}</td>
                    <td className={adminTd()}>
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "success"
                            : r.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className={adminTd("text-xs text-muted-foreground")}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className={adminTd()}>
                      <div className="flex flex-wrap gap-1">
                        {r.status !== "approved" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => void setStatus(r.id, "approved")}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {r.status !== "rejected" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => void setStatus(r.id, "rejected")}
                          >
                            Reject
                          </Button>
                        ) : null}
                        {r.status !== "pending" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyId === r.id}
                            onClick={() => void setStatus(r.id, "pending")}
                          >
                            Pending
                          </Button>
                        ) : null}
                      </div>
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

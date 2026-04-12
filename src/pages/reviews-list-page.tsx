import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
import {
  fetchReviewsAdmin,
  updateReviewStatusAdmin,
  type ReviewAdminRow,
  type ReviewModerationStatus,
} from "@/lib/supabase/reviews-admin";
import { supabase } from "@/lib/supabase/client";

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

  return (
    <div className="space-y-8">
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

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Moderation queue</CardTitle>
            <CardDescription>Linked product names load when the foreign key embed succeeds.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Button
                key={t.value}
                type="button"
                size="sm"
                variant={filter === t.value ? "default" : "outline"}
                onClick={() => setFilter(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews in this filter.</p>
          ) : (
            <TableContainer>
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Product</th>
                    <th className="px-3 py-2.5 pr-4">Rating</th>
                    <th className="px-3 py-2.5 pr-4">Title</th>
                    <th className="px-3 py-2.5 pr-4">Status</th>
                    <th className="px-3 py-2.5 pr-4">Submitted</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 max-w-[200px] truncate" title={r.product_name ?? undefined}>
                        {r.product_name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums">{r.rating} / 5</td>
                      <td className="px-3 py-2.5 pr-4 max-w-[240px] truncate">{r.title || r.body.slice(0, 48)}</td>
                      <td className="px-3 py-2.5 pr-4">
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
                      <td className="px-3 py-2.5 pr-4 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
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
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, TicketPercent } from "lucide-react";
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
import { fetchVoucherBatches, type VoucherBatchStatsRow } from "@/lib/supabase/vouchers";
import { supabase } from "@/lib/supabase/client";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function VouchersListPage() {
  const [rows, setRows] = useState<VoucherBatchStatsRow[]>([]);
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
      setRows(await fetchVoucherBatches());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vouchers.");
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
        title="Vouchers"
        description="Each campaign stores discount rules in a batch: either one shared code (one redemption per customer) or many single-use codes. Assign codes to shoppers and adjust terms per code when needed."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/dashboard/vouchers/new">
                <Plus className="mr-2 h-4 w-4" />
                Create voucher
              </Link>
            </Button>
          </>
        }
      />

      {error ? <FlashMessage variant="error">{error}</FlashMessage> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5" />
            All voucher batches
          </CardTitle>
          <CardDescription>
            Each row is a voucher batch (rules plus codes). If this list fails to load, confirm your database has the
            voucher batch and instance tables and that admin access policies are applied.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batches yet.</p>
          ) : (
            <TableContainer>
              <table className="w-full min-w-[1024px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Type</th>
                    <th className="px-3 py-2.5 pr-4">Code</th>
                    <th className="px-3 py-2.5 pr-4">Discount</th>
                    <th className="px-3 py-2.5 pr-4 text-right tabular-nums">Total</th>
                    <th className="px-3 py-2.5 pr-4 text-right tabular-nums">Available</th>
                    <th className="px-3 py-2.5 pr-4 text-right tabular-nums">Used</th>
                    <th className="px-3 py-2.5 pr-4">Valid until</th>
                    <th className="px-3 py-2.5 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 font-medium">{v.name}</td>
                      <td className="px-3 py-2.5 pr-4 text-muted-foreground">
                        {v.batch_kind === "shared" ? "Shared" : "Batch"}
                      </td>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {v.shared_code ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4 capitalize text-muted-foreground">
                        {v.batch_kind === "multi" && (v.discount_type == null || v.voucher_amount == null)
                          ? "— (per code)"
                          : v.discount_type === "percentage"
                            ? `${v.voucher_amount}%`
                            : `$${Number(v.voucher_amount ?? 0).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2.5 pr-4 text-right tabular-nums">{v.total_codes}</td>
                      <td className="px-3 py-2.5 pr-4 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                        {v.available_count == null ? "—" : v.available_count}
                      </td>
                      <td className="px-3 py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {v.used_count}
                      </td>
                      <td className="px-3 py-2.5 pr-4 text-muted-foreground">
                        {v.valid_until ? fmtDate(v.valid_until) : "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4 text-right">
                        <Link
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          to={`/dashboard/vouchers/${v.id}`}
                        >
                          Manage
                        </Link>
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

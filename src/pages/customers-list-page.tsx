import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";
import { ADMIN_MSG_CATALOG_UNAVAILABLE } from "@/lib/admin-user-messages";
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
  fetchCustomersAdmin,
  fetchOrderCountByUserIds,
  type PublicUserRow,
} from "@/lib/supabase/customers";
import { supabase } from "@/lib/supabase/client";

function displayName(u: PublicUserRow): string {
  const n = `${u.first_name} ${u.last_name}`.trim();
  return n || "—";
}

export function CustomersListPage() {
  const [rows, setRows] = useState<PublicUserRow[]>([]);
  const [orderCounts, setOrderCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    if (!supabase) {
      toast.error(ADMIN_MSG_CATALOG_UNAVAILABLE);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCustomersAdmin(400);
      setRows(data);
      const ids = data.map((r) => r.id);
      setOrderCounts(await fetchOrderCountByUserIds(ids));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = displayName(r).toLowerCase();
      const phone = (r.phone ?? "").toLowerCase();
      const idShort = r.id.slice(0, 8).toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        idShort.includes(q) ||
        r.id.toLowerCase() === q
      );
    });
  }, [rows, query]);

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Customers"
        description="Storefront profiles linked to orders, reviews, and assigned vouchers. Open a customer to see full activity."
      />

      <AdminListCard
        title="Directory"
        description="Search by name, phone, or profile id. Order counts reflect linked checkout rows."
        headerRight={
          <div className="relative w-full min-w-[min(100%,16rem)] sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter customers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9"
              aria-label="Filter customers"
            />
          </div>
        }
      >
        {loading ? (
          <AdminListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <AdminListEmpty>
            {rows.length === 0 ? "No customer profiles yet." : "No matches for your search."}
          </AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Customer</th>
                  <th className={adminTh()}>Phone</th>
                  <th className={adminTh()}>Orders</th>
                  <th className={adminTh()}>Joined</th>
                  <th className={adminThEnd()} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd()}>
                      <span className="font-medium text-foreground">{displayName(u)}</span>
                      <span className="mt-0.5 block font-mono text-[0.65rem] text-muted-foreground">
                        {u.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className={adminTd("tabular-nums text-muted-foreground")}>
                      {u.phone?.trim() || "—"}
                    </td>
                    <td className={adminTd("tabular-nums")}>{orderCounts.get(u.id) ?? 0}</td>
                    <td className={adminTd("text-muted-foreground")}>
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className={cn(adminTd(), "text-right")}>
                      <AdminRowEditLink to={`/dashboard/customers/${u.id}`}>View</AdminRowEditLink>
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

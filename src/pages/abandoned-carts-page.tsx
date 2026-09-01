import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  AdminListCard,
  AdminListEmpty,
  AdminListSkeleton,
  ADMIN_LIST_PAGE_CLASS,
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  adminTh,
  adminTd,
} from "@/components/dashboard/admin-list-shell";
import { fetchAbandonedCartsAdmin } from "@/lib/supabase/carts-admin";
import { formatMinorUnits } from "@/lib/format-money";

export function AbandonedCartsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAbandonedCartsAdmin>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAbandonedCartsAdmin(300).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className={ADMIN_LIST_PAGE_CLASS}>
      <PageHeader
        title="Abandoned carts"
        description="Items still in customer carts — useful for follow-up or support."
      />

      <AdminListCard
        title="Open carts"
        description={`${rows.length} cart line${rows.length === 1 ? "" : "s"} in the database.`}
      >
        {loading ? (
          <AdminListSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <AdminListEmpty icon={ShoppingCart}>No cart items found.</AdminListEmpty>
        ) : (
          <TableContainer>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className={ADMIN_TABLE_HEAD}>
                  <th className={adminTh()}>Customer</th>
                  <th className={adminTh()}>Phone</th>
                  <th className={adminTh()}>Product</th>
                  <th className={adminTh()}>SKU</th>
                  <th className={adminTh()}>Qty</th>
                  <th className={adminTh()}>Unit price</th>
                  <th className={adminTh()}>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={ADMIN_TABLE_ROW}>
                    <td className={adminTd()}>
                      <Link
                        to={`/dashboard/customers/${r.user_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.customer_name}
                      </Link>
                    </td>
                    <td className={adminTd("tabular-nums")}>{r.customer_phone}</td>
                    <td className={adminTd()}>
                      <Link
                        to={`/dashboard/products/${r.product_id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {r.product_name}
                      </Link>
                    </td>
                    <td className={adminTd("font-mono text-xs")}>{r.variant_sku}</td>
                    <td className={adminTd("tabular-nums")}>{r.quantity}</td>
                    <td className={adminTd("tabular-nums")}>
                      {formatMinorUnits(Math.round(r.unit_price * 100), "PKR")}
                    </td>
                    <td className={adminTd("text-muted-foreground")}>
                      {new Date(r.updated_at).toLocaleString()}
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

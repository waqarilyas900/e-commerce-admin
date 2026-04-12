import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  TableContainer,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
} from "@/components/dashboard/table-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProductsWithVariantCount } from "@/lib/supabase/catalog";
import { fetchOrdersAdmin } from "@/lib/supabase/orders";
import {
  fetchCustomersAdmin,
  fetchOrderCountByUserIds,
} from "@/lib/supabase/customers";
import { formatMinorUnits } from "@/lib/format-money";
import { supabase } from "@/lib/supabase/client";
import type { ProductRow } from "@/lib/supabase/catalog-types";

type Tab = "products" | "orders" | "customers";

export function ManagementPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [products, setProducts] = useState<(ProductRow & { variant_count: number })[]>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof fetchOrdersAdmin>>>([]);
  const [customers, setCustomers] = useState<
    Awaited<ReturnType<typeof fetchCustomersAdmin>>
  >([]);
  const [orderCounts, setOrderCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setErr("Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setLoading(false);
        return;
      }
      setErr(null);
      setLoading(true);
      try {
        const [p, o, u] = await Promise.all([
          fetchProductsWithVariantCount(),
          fetchOrdersAdmin({ limit: 50 }),
          fetchCustomersAdmin(80),
        ]);
        setProducts(p as (ProductRow & { variant_count: number })[]);
        setOrders(o);
        setCustomers(u);
        const ids = u.map((x) => x.id);
        setOrderCounts(await fetchOrderCountByUserIds(ids));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Load failed.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const title = useMemo(() => {
    if (tab === "products") return "Products";
    if (tab === "orders") return "Orders";
    return "Customers";
  }, [tab]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Management"
        description="Live snapshot from Supabase: catalog parents, recent orders, and registered customers (orders per customer when available)."
      />

      {err ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "products" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setTab("products")}
        >
          <Package className="h-4 w-4" />
          Products
        </Button>
        <Button
          type="button"
          variant={tab === "orders" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setTab("orders")}
        >
          <ShoppingCart className="h-4 w-4" />
          Orders
        </Button>
        <Button
          type="button"
          variant={tab === "customers" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setTab("customers")}
        >
          <Users className="h-4 w-4" />
          Customers
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {tab === "products"
                ? "Use Products in the sidebar for full editing."
                : tab === "orders"
                  ? "Open Orders for filters and fulfillment."
                  : "Requires admin read on public.users (see latest migration)."}
            </CardDescription>
          </div>
          {tab === "orders" ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/dashboard/orders">Full order desk</Link>
            </Button>
          ) : null}
          {tab === "products" ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/dashboard/products">Catalog</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}

          {!loading && tab === "products" ? (
            <TableContainer>
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Status</th>
                    <th className="px-3 py-2.5 pr-4">Variants</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 12).map((row) => (
                    <tr key={row.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4">{row.name}</td>
                      <td className="px-3 py-2.5 pr-4">
                        <Badge variant={row.status === "active" ? "success" : "secondary"}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums">{row.variant_count}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/dashboard/products/${row.id}`}>Edit</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          ) : null}

          {!loading && tab === "orders" ? (
            <TableContainer>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Order</th>
                    <th className="px-3 py-2.5 pr-4">Customer</th>
                    <th className="px-3 py-2.5 pr-4">Total</th>
                    <th className="px-3 py-2.5">State</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => (
                    <tr key={row.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4 font-mono text-xs">
                        <Link className="underline-offset-4 hover:underline" to={`/dashboard/orders/${row.id}`}>
                          {row.order_number ?? row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 pr-4">{row.email || "—"}</td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums">
                        {formatMinorUnits(row.total_cents, row.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          ) : null}

          {!loading && tab === "customers" ? (
            <TableContainer>
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead>
                  <tr className={ADMIN_TABLE_HEAD}>
                    <th className="px-3 py-2.5 pr-4">Name</th>
                    <th className="px-3 py-2.5 pr-4">Phone</th>
                    <th className="px-3 py-2.5 pr-4">Orders</th>
                    <th className="px-3 py-2.5">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((row) => (
                    <tr key={row.id} className={ADMIN_TABLE_ROW}>
                      <td className="px-3 py-2.5 pr-4">
                        {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4">{row.phone || "—"}</td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums">
                        {orderCounts.get(row.id) ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { APP_NAME } from "@/config/brand";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthLayout } from "@/layouts/auth-layout";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { LoginPage } from "@/pages/login-page";
import { DashboardHome } from "@/pages/dashboard-home";
import { AnalyticsPage } from "@/pages/analytics-page";
import { CustomersListPage } from "@/pages/customers-list-page";
import { CustomerDetailPage } from "@/pages/customer-detail-page";
import { SettingsPage } from "@/pages/settings-page";
import { ProfilePage } from "@/pages/profile-page";
import { ProductsListPage } from "@/pages/products-list-page";
import { ProductEditPage } from "@/pages/product-edit-page";
import { CollectionsListPage } from "@/pages/collections-list-page";
import { CollectionEditPage } from "@/pages/collection-edit-page";
import { SizesListPage } from "@/pages/sizes-list-page";
import { SizeEditPage } from "@/pages/size-edit-page";
import { ColorsListPage } from "@/pages/colors-list-page";
import { ColorEditPage } from "@/pages/color-edit-page";
import { VouchersListPage } from "@/pages/vouchers-list-page";
import { VoucherEditPage } from "@/pages/voucher-edit-page";
import { OrdersListPage } from "@/pages/orders-list-page";
import { OrderDetailPage } from "@/pages/order-detail-page";
import { ReviewsListPage } from "@/pages/reviews-list-page";
import { WishlistAdminPage } from "@/pages/wishlist-admin-page";

function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function GuestOnly() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard/customers" element={<CustomersListPage />} />
          <Route path="/dashboard/customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/dashboard/products" element={<ProductsListPage />} />
          <Route path="/dashboard/products/:productId" element={<ProductEditPage />} />
          <Route path="/dashboard/collections" element={<CollectionsListPage />} />
          <Route path="/dashboard/collections/:collectionId" element={<CollectionEditPage />} />
          <Route path="/dashboard/sizes" element={<SizesListPage />} />
          <Route path="/dashboard/sizes/:sizeId" element={<SizeEditPage />} />
          <Route path="/dashboard/colors" element={<ColorsListPage />} />
          <Route path="/dashboard/colors/:colorId" element={<ColorEditPage />} />
          <Route path="/dashboard/vouchers" element={<VouchersListPage />} />
          <Route path="/dashboard/vouchers/:voucherId" element={<VoucherEditPage />} />
          <Route path="/dashboard/orders" element={<OrdersListPage />} />
          <Route path="/dashboard/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/dashboard/reviews" element={<ReviewsListPage />} />
          <Route path="/dashboard/wishlist" element={<WishlistAdminPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    document.title = `${APP_NAME} — Admin`;
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

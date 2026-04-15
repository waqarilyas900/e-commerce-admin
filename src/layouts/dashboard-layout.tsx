import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] dark:bg-none">
      <AppSidebar
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-6 md:px-8 md:pb-20 md:pt-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

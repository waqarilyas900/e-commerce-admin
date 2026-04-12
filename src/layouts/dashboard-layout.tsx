import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-auto bg-muted/15 dark:bg-muted/5">
          <div className="mx-auto w-full max-w-[100rem] px-4 pb-12 pt-5 md:px-8 md:pt-7 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

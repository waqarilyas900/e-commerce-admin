import { PageHeader } from "@/components/dashboard/page-header";
import { ADMIN_DASHBOARD_MAX_CLASS } from "@/components/dashboard/admin-list-shell";
import { cn } from "@/lib/utils";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export function DashboardHome() {
  return (
    <div className={cn(ADMIN_DASHBOARD_MAX_CLASS, "space-y-10")}>
      <PageHeader
        title="Dashboard"
        description="Live counts from Supabase; charts are placeholders until you connect traffic analytics."
      />
      <StatCards />
      <div className="grid min-h-0 min-w-0 gap-6 lg:grid-cols-2">
        <ActivityChart />
        <DistributionChart />
      </div>
      <RecentActivity />
    </div>
  );
}

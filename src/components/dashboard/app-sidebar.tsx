import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, PanelLeft, Shield } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/config/brand";
import { mainNavItems } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SidebarNavProps = {
  pathname: string;
  collapsed: boolean;
  isMobile: boolean;
  onNavigate?: () => void;
  onToggleCollapse: () => void;
};

function SidebarNav({
  pathname,
  collapsed,
  isMobile,
  onNavigate,
  onToggleCollapse,
}: SidebarNavProps) {
  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-sidebar-border px-3",
          collapsed && !isMobile && "justify-center px-2",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {APP_NAME}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {APP_TAGLINE}
            </p>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {mainNavItems.map((item) => {
            const active =
              pathname === item.url ||
              (item.url !== "/dashboard" && pathname.startsWith(item.url));
            const Icon = item.icon;
            const link = (
              <Link
                to={item.url}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/12 text-foreground shadow-sm ring-1 ring-primary/20 dark:bg-primary/18"
                    : "text-muted-foreground hover:bg-sidebar-accent/90 hover:text-sidebar-foreground",
                  collapsed && !isMobile && "justify-center px-2",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobile) && (
                  <span className="truncate">{item.title}</span>
                )}
              </Link>
            );
            if (collapsed && !isMobile) {
              return (
                <Tooltip key={item.url} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }
            return <div key={item.url}>{link}</div>;
          })}
        </nav>
      </ScrollArea>
      {!isMobile && (
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}

type AppSidebarProps = {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const navProps: SidebarNavProps = {
    pathname: location.pathname,
    collapsed,
    isMobile,
    onToggleCollapse: () => setCollapsed((c) => !c),
  };

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 border-sidebar-border bg-sidebar">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarNav
              {...navProps}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col transition-[width] duration-200",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
    >
      <SidebarNav {...navProps} />
    </aside>
  );
}

export function MobileSidebarTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={onClick}
      aria-label="Open menu"
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );
}

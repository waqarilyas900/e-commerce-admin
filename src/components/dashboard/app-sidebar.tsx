import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, PanelLeft, Shield } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/config/brand";
import { navGroups } from "@/config/navigation";
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
          "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border/80 px-4",
          collapsed && !isMobile && "justify-center px-2",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              {APP_NAME}
            </p>
            <p className="truncate text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-6" aria-label="Main">
          {navGroups.map((group) => (
            <div key={group.id}>
              {(!collapsed || isMobile) && (
                <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/90">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url));
                  const Icon = item.icon;
                  const link = (
                    <Link
                      to={item.url}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                        active
                          ? "bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/15 dark:bg-primary/15"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        collapsed && !isMobile && "justify-center px-2",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                        )}
                        aria-hidden
                      />
                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </Link>
                  );
                  if (collapsed && !isMobile) {
                    return (
                      <Tooltip key={item.url} delayDuration={0}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return <div key={item.url}>{link}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
      {!isMobile && (
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Collapse</span>
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
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
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
        "sticky top-0 z-30 hidden h-screen shrink-0 border-r border-sidebar-border/80 bg-sidebar transition-[width] duration-200 ease-out md:flex md:flex-col",
        collapsed ? "w-[4.5rem]" : "w-64",
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
      variant="outline"
      size="icon"
      className="h-10 w-10 shrink-0 md:hidden"
      onClick={onClick}
      aria-label="Open menu"
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LineChart,
  FolderCog,
  Settings,
  Table2,
  Search,
  User,
  Package,
  Layers,
  Ruler,
  Palette,
  ClipboardList,
  MessageSquare,
  TicketPercent,
} from "lucide-react";
import { mainNavItems } from "@/config/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const iconMap = {
  "/dashboard": LayoutDashboard,
  "/dashboard/analytics": LineChart,
  "/dashboard/management": FolderCog,
  "/dashboard/products": Package,
  "/dashboard/orders": ClipboardList,
  "/dashboard/sizes": Ruler,
  "/dashboard/colors": Palette,
  "/dashboard/collections": Layers,
  "/dashboard/vouchers": TicketPercent,
  "/dashboard/reviews": MessageSquare,
  "/dashboard/data": Table2,
  "/dashboard/settings": Settings,
} as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm text-muted-foreground shadow-sm sm:flex md:w-72"
      >
        <Search className="h-4 w-4 shrink-0 opacity-50" />
        <span className="flex-1 truncate">Search pages…</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          Cmd+K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background sm:hidden"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to page or action…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {mainNavItems.map((item) => {
              const Icon =
                iconMap[item.url as keyof typeof iconMap] ?? LayoutDashboard;
              return (
                <CommandItem
                  key={item.url}
                  onSelect={() => {
                    navigate(item.url);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                navigate("/dashboard/profile");
                setOpen(false);
              }}
            >
              <User className="h-4 w-4" />
              Profile
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/dashboard/data");
                setOpen(false);
              }}
            >
              <Table2 className="h-4 w-4" />
              Open data table
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

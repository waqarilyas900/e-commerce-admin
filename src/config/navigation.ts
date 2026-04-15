import {
  LayoutDashboard,
  LineChart,
  Settings,
  Package,
  Layers,
  Ruler,
  Palette,
  TicketPercent,
  ClipboardList,
  MessageSquare,
  Heart,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/dashboard/analytics", icon: LineChart },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { title: "Products", url: "/dashboard/products", icon: Package },
      { title: "Collections", url: "/dashboard/collections", icon: Layers },
      { title: "Sizes", url: "/dashboard/sizes", icon: Ruler },
      { title: "Colors", url: "/dashboard/colors", icon: Palette },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { title: "Orders", url: "/dashboard/orders", icon: ClipboardList },
      { title: "Customers", url: "/dashboard/customers", icon: Users },
      { title: "Vouchers", url: "/dashboard/vouchers", icon: TicketPercent },
      { title: "Reviews", url: "/dashboard/reviews", icon: MessageSquare },
      { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
    ],
  },
  {
    id: "system",
    label: "Workspace",
    items: [{ title: "Settings", url: "/dashboard/settings", icon: Settings }],
  },
];

/** Flat list for breadcrumbs, command palette fallbacks, and legacy imports */
export const mainNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

import {
  LayoutDashboard,
  LineChart,
  FolderCog,
  Settings,
  Table2,
  Package,
  Layers,
  Ruler,
  Palette,
  TicketPercent,
  ClipboardList,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: LineChart,
  },
  {
    title: "Management",
    url: "/dashboard/management",
    icon: FolderCog,
  },
  {
    title: "Products",
    url: "/dashboard/products",
    icon: Package,
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: ClipboardList,
  },
  {
    title: "Sizes",
    url: "/dashboard/sizes",
    icon: Ruler,
  },
  {
    title: "Colors",
    url: "/dashboard/colors",
    icon: Palette,
  },
  {
    title: "Collections",
    url: "/dashboard/collections",
    icon: Layers,
  },
  {
    title: "Vouchers",
    url: "/dashboard/vouchers",
    icon: TicketPercent,
  },
  {
    title: "Reviews",
    url: "/dashboard/reviews",
    icon: MessageSquare,
  },
  {
    title: "Data",
    url: "/dashboard/data",
    icon: Table2,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

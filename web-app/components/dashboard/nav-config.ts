import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenText,
  LayoutDashboard,
  Package,
  PackageOpen,
  ReceiptText,
  ScrollText,
  Settings,
  Store,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import { ROLES, type RoleSlug } from "@/lib/roles";

const ALL_ROLES: RoleSlug[] = [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN, ROLES.CASHIER];
const ADMIN_ROLES: RoleSlug[] = [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN];
const SUPER_ADMIN_ONLY: RoleSlug[] = [ROLES.SUPER_ADMIN];

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: RoleSlug[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { href: "/products", label: "Products", icon: Package, roles: ALL_ROLES },
  { href: "/products/low-stock", label: "Low Stock", icon: PackageOpen, roles: ALL_ROLES },
  { href: "/customers", label: "Customers", icon: Users, roles: ALL_ROLES },
  { href: "/sales", label: "Sales", icon: ReceiptText, roles: ALL_ROLES },
  { href: "/credit-book", label: "Credit Book", icon: BookOpenText, roles: ADMIN_ROLES },
  { href: "/expenses", label: "Expenses", icon: Wallet, roles: ADMIN_ROLES },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ADMIN_ROLES },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ADMIN_ROLES },
  { href: "/users", label: "Users", icon: UserCog, roles: ADMIN_ROLES },
  { href: "/shops", label: "Shops", icon: Store, roles: SUPER_ADMIN_ONLY },
  { href: "/settings", label: "Settings", icon: Settings, roles: ADMIN_ROLES },
];
/**
 * AdminSidebar — navigation sidebar for the admin panel.
 *
 * Desktop: permanently visible fixed sidebar.
 * Mobile: rendered inside a Sheet (see AdminLayout).
 */

import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Truck,
  Store,
  Megaphone,
  BarChart3,
  Scale,
  Bell,
  ClipboardList,
  Settings,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",       to: "/admin",                  icon: LayoutDashboard },
  { key: "users",        label: "Users",           to: "/admin/users",            icon: Users },
  { key: "pickups",      label: "Pickups",         to: "/admin/pickups",          icon: Truck },
  { key: "marketplace",  label: "Marketplace",     to: "/admin/marketplace",      icon: Store },
  { key: "campaigns",    label: "Campaigns",       to: "/admin/campaigns",        icon: Megaphone },
  { key: "analytics",    label: "Reports & Analytics", to: "/admin/analytics",    icon: BarChart3 },
  { key: "scrap-rates",  label: "Scrap Rates",     to: "/admin/scrap-rates",      icon: Scale },
  { key: "notifications",label: "Notifications",   to: "/admin/notifications",    icon: Bell },
  { key: "audit-log",    label: "Audit Log",       to: "/admin/audit-log",        icon: ClipboardList },
  { key: "settings",     label: "Settings",        to: "/admin/settings",         icon: Settings },
];

export { NAV_ITEMS };

const AdminSidebar = ({ onNavigate }) => {
  return (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-5">
        <img src="/logo.png" alt="EcoSetu" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        <div>
          <h1 className="font-heading text-base font-bold text-foreground tracking-tight">
            EcoSetu
          </h1>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-red-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-red-500">
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ key, label, to, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            end={to === "/admin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )
            }
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
              )}
            />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 px-5 py-4">
        <p className="text-[11px] text-muted-foreground">
          EcoSetu Admin Panel
        </p>
      </div>
    </div>
  );
};

export default AdminSidebar;

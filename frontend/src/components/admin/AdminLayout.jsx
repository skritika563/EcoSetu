/**
 * AdminLayout — dedicated layout shell for the admin module.
 *
 * Desktop: fixed sidebar (256px) + scrollable main content.
 * Mobile: collapsible sidebar via Sheet + top header bar.
 *
 * Deliberately does NOT reuse AppShell — admin gets its own management-
 * oriented layout that feels distinct from the consumer surfaces.
 */

import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, LogOut, User as UserIcon, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-200">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card lg:block">
        <AdminSidebar />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-md px-4 lg:px-6">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <AdminSidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Right side controls: Theme toggle + Notifications + User menu */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle (Light / Dark) */}
            <div className="flex items-center">
              <ThemeToggle />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full relative"
              onClick={() => navigate("/admin/notifications")}
              aria-label="Admin Notifications"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 py-1 pl-1 pr-3 text-sm transition hover:bg-muted/60 focus:outline-hidden">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.profileImage} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden font-medium text-foreground sm:inline">
                    {user?.name ?? "Admin"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content with page entrance animation */}
        <motion.main
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default AdminLayout;


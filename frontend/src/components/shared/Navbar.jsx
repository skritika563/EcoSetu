/**
 * Navbar — global top navigation for EcoSetu.
 *
 * Two distinct states:
 *   Guest         → public marketing links + Log in / Get Started
 *   Authenticated → role-aware primary nav, notifications, profile menu.
 *                   Log in / Get Started are never shown.
 *
 * On mobile, authenticated users get primary navigation from the fixed
 * BottomNavigation instead of a drawer, so the top bar stays down to brand,
 * notifications and profile. The drawer therefore only serves guests.
 *
 * Primary nav items come from config/navigation.js — shared with the bottom
 * navigation so the two can never disagree.
 */

import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Recycle,
  LayoutDashboard,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ROLE_META } from "@/config/roles";
import { getPrimaryNav } from "@/config/navigation";
import { notifyComingSoon } from "@/lib/comingSoon";
import { getInitials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BrandLogo from "@/components/shared/BrandLogo";
import NotificationBell from "@/components/shared/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ─── Public nav links (guests only) ──────────────────────────────────────── */
const PUBLIC_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Marketplace", href: "/#marketplace" },
  { label: "For Organizations", href: "/#organizations" },
  { label: "For Collectors", href: "/#collectors" },
];

/* ─── Theme toggle button ─────────────────────────────────────────────────── */
const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      id="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
};

/* ─── Primary nav (authenticated, desktop) ───────────────────────────────── */
const PrimaryNav = ({ role }) => {
  const location = useLocation();
  const items = getPrimaryNav(role);

  if (items.length === 0) return null;

  const linkClasses = (isActive) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {items.map((item) => {
        if (!item.available) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => notifyComingSoon(item.label)}
              className={linkClasses(false)}
            >
              {item.label}
            </button>
          );
        }

        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.key}
            to={item.to}
            className={linkClasses(isActive)}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
};

/* ─── User dropdown (authenticated) ──────────────────────────────────────── */
const UserDropdown = ({ user, role, logout }) => {
  const navigate = useNavigate();
  const meta = ROLE_META[role] ?? ROLE_META.household;
  const RoleIcon = meta.icon;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="user-menu-trigger"
          variant="ghost"
          className="flex h-auto items-center gap-2 rounded-full px-1.5 py-1 hover:bg-muted"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={user?.profileImage} alt="" />
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground lg:block">
            {user?.name}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]" sideOffset={8}>
        <DropdownMenuLabel className="flex flex-col gap-1 pb-2">
          <span className="truncate font-semibold text-foreground">{user?.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
          <span
            className={cn(
              "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              meta.badgeClass
            )}
          >
            <RoleIcon className="h-3 w-3" />
            {meta.label}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem id="nav-go-home" asChild>
            <Link to="/" className="flex items-center gap-2">
              <RoleIcon className="h-4 w-4" />
              Home
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem id="nav-dashboard" asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Sustainability dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            id="nav-profile"
            onSelect={() => notifyComingSoon("Profile")}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Profile settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          id="nav-logout"
          onSelect={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ─── Mobile drawer (guests only) ────────────────────────────────────────── */
const GuestDrawer = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button
        id="mobile-menu-trigger"
        variant="ghost"
        size="icon"
        className="h-9 w-9 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>

    <SheetContent
      side="right"
      showCloseButton={false}
      className="flex w-80 flex-col gap-0 p-0"
    >
      <SheetTitle className="sr-only">Navigation menu</SheetTitle>
      <SheetDescription className="sr-only">
        Site navigation, sign in and appearance settings.
      </SheetDescription>

      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <BrandLogo />
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-4">
        {PUBLIC_LINKS.map((link) => (
          <SheetClose key={link.href} asChild>
            <Link
              to={link.href}
              className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {link.label}
            </Link>
          </SheetClose>
        ))}

        <Separator className="my-3" />

        <SheetClose asChild>
          <Link id="mobile-nav-login" to="/auth/login">
            <Button variant="outline" className="w-full">
              Log in
            </Button>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link id="mobile-nav-signup" to="/auth/register" className="mt-2 block">
            <Button className="w-full">Get Started</Button>
          </Link>
        </SheetClose>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Recycle className="h-3.5 w-3.5 text-primary" />
          Building a greener tomorrow
        </span>
        <ThemeToggle />
      </div>
    </SheetContent>
  </Sheet>
);

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
const Navbar = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const roleMeta = ROLE_META[role];

  return (
    <motion.header
      id="main-navbar"
      initial={false}
      animate={
        scrolled
          ? { boxShadow: "0 1px 24px 0 oklch(0.43 0.11 152 / 0.10)" }
          : { boxShadow: "none" }
      }
      transition={{ duration: 0.2 }}
      className={cn(
        // `--sidebar` is the design system's app-chrome surface (a soft green
        // tint in light, a lift in dark), so the bar reads as a distinct layer
        // instead of blending into the cream page background. Opaque on
        // purpose: the /95 opacity modifier does not track the theme variable.
        "sticky top-0 z-50 w-full border-b border-border bg-sidebar transition-shadow duration-200"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: brand + (authenticated) primary nav */}
        <div className="flex min-w-0 items-center gap-6">
          <BrandLogo />
          {isAuthenticated && <PrimaryNav role={role} />}
        </div>

        {/* Center: public links (guests, desktop) */}
        {!isAuthenticated && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isAuthenticated && roleMeta && (
            <Badge
              variant="outline"
              className={cn("mr-1 hidden border-0 text-xs font-medium xl:inline-flex", roleMeta.badgeClass)}
            >
              {roleMeta.label}
            </Badge>
          )}

          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserDropdown user={user} role={role} logout={logout} />
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <Button id="nav-login" variant="ghost" size="sm" asChild>
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button id="nav-signup" size="sm" className="shadow-sm" asChild>
                  <Link to="/auth/register">Get Started</Link>
                </Button>
              </div>
              <GuestDrawer />
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;

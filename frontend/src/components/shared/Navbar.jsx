/**
 * Navbar — Global top navigation bar for EcoSetu.
 *
 * Features:
 * - EcoSetu brand wordmark + logo
 * - Navigation links (context-aware: guest vs authenticated)
 * - Role badge for authenticated users
 * - Dark mode toggle
 * - User dropdown (avatar, logout)
 * - Mobile sheet drawer
 * - Framer Motion scroll-aware elevation
 */

import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Recycle,
  Home,
  Building2,
  Truck,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ─── Role metadata ─────────────────────────────────────────────────────────── */
const ROLE_META = {
  household:    { label: "Household",    icon: Home,        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", home: "/household" },
  organization: { label: "Organization", icon: Building2,   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",             home: "/organization" },
  collector:    { label: "Collector",    icon: Truck,       color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",          home: "/collector" },
  admin:        { label: "Admin",        icon: ShieldCheck, color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",                  home: "/admin" },
};

/* ─── Public nav links (guests only) ──────────────────────────────────────── */
const PUBLIC_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Organizations", href: "/#organizations" },
  { label: "For Collectors", href: "/#collectors" },
];

/* ─── Utility: get user initials ─────────────────────────────────────────── */
const getInitials = (name) =>
  name
    ? name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
    : "?";

/* ─── Logo ───────────────────────────────────────────────────────────────── */
const EcoSetuLogo = ({ className }) => (
  <Link to="/" className={cn("flex items-center gap-2 select-none group", className)}>
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform duration-200 group-hover:scale-105">
      <Leaf className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.2} />
    </div>
    <span className="font-heading text-xl font-bold tracking-tight text-foreground">
      Eco<span className="text-primary">Setu</span>
    </span>
  </Link>
);

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

/* ─── User dropdown (authenticated) ──────────────────────────────────────── */
const UserDropdown = ({ user, role, logout }) => {
  const navigate = useNavigate();
  const meta = ROLE_META[role] || ROLE_META.household;
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
          className="flex items-center gap-2 rounded-full px-2 py-1 h-auto hover:bg-muted"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={user?.profileImage} alt={user?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium text-foreground max-w-[120px] truncate">
            {user?.name}
          </span>
          <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <DropdownMenuLabel className="flex flex-col gap-1 pb-2">
          <span className="font-semibold text-foreground truncate">{user?.name}</span>
          <span className="text-xs font-normal text-muted-foreground truncate">{user?.email}</span>
          <span className={cn("mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.color)}>
            <RoleIcon className="h-3 w-3" />
            {meta.label}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem id="nav-go-dashboard" asChild>
            <Link to={meta.home} className="flex items-center gap-2">
              <RoleIcon className="h-4 w-4" />
              My Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem id="nav-profile" asChild>
            <Link to="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          id="nav-logout"
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ─── Mobile sheet drawer ─────────────────────────────────────────────────── */
const MobileDrawer = ({ isAuthenticated, user, role, logout }) => {
  const navigate = useNavigate();
  const meta = role ? ROLE_META[role] : null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button id="mobile-menu-trigger" variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <EcoSetuLogo />
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto px-5 py-4 gap-1">
          {isAuthenticated && user && meta ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted mb-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </div>

              <SheetClose asChild>
                <Link id="mobile-nav-dashboard" to={meta.home} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  <meta.icon className="h-4 w-4 text-primary" />
                  My Dashboard
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link id="mobile-nav-profile" to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  <User className="h-4 w-4 text-primary" />
                  Profile Settings
                </Link>
              </SheetClose>

              <Separator className="my-3" />

              <button
                id="mobile-nav-logout"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </>
          ) : (
            <>
              {PUBLIC_LINKS.map((link) => (
                <SheetClose key={link.href} asChild>
                  <a href={link.href} className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    {link.label}
                  </a>
                </SheetClose>
              ))}

              <Separator className="my-3" />

              <SheetClose asChild>
                <Link id="mobile-nav-login" to="/login">
                  <Button variant="outline" className="w-full">Log in</Button>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link id="mobile-nav-signup" to="/signup">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </SheetClose>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Recycle className="h-3.5 w-3.5 text-primary" />
            Building a greener tomorrow
          </span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Navbar (main export) ───────────────────────────────────────────────── */
const Navbar = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      id="main-navbar"
      initial={false}
      animate={scrolled ? { boxShadow: "0 1px 24px 0 oklch(0.43 0.11 152 / 0.10)" } : { boxShadow: "none" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-200",
        scrolled
          ? "bg-background/90 backdrop-blur-md border-border"
          : "bg-background/60 backdrop-blur-sm border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <EcoSetuLogo />

        {/* Center: Nav links (desktop, public only) */}
        {!isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {PUBLIC_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        {/* Authenticated: role badge */}
        {isAuthenticated && role && (
          <div className="hidden md:flex items-center">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium border-0", ROLE_META[role]?.color)}
            >
              <span className="mr-1">●</span>
              {ROLE_META[role]?.label}
            </Badge>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <UserDropdown user={user} role={role} logout={logout} />
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button id="nav-login" variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button id="nav-signup" size="sm" className="shadow-sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <MobileDrawer
            isAuthenticated={isAuthenticated}
            user={user}
            role={role}
            logout={logout}
          />
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;

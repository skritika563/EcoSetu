/**
 * AppShell — the main layout wrapper.
 *
 * Renders:
 *   Navbar
 *   <main> — page content via Outlet / children
 *   Footer
 *   BottomNavigation — mobile primary nav, authenticated users only
 *
 * `main` is a flex column so full-height pages (auth cards) can centre
 * themselves with flex-1. Both `main` and the footer carry bottom padding for
 * authenticated mobile users: the fixed BottomNavigation can sit over the
 * tail of ANY page's content (not just the footer) once that page is short
 * enough for its last card to land behind the bar, so both need clearance.
 *
 * Pages that need a full-bleed layout (e.g. profile completion) opt out by not
 * nesting inside this shell.
 */

import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import PageLoader from "@/components/shared/PageLoader";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { cn } from "@/lib/utils";

const AppShell = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className={cn("flex flex-1 flex-col", isAuthenticated && "pb-16 md:pb-0")}>
        {/* Suspense sits inside the shell so lazy page chunks load without
            tearing down the navbar and footer. */}
        <Suspense fallback={<PageLoader />}>{children ?? <Outlet />}</Suspense>
      </main>

      <Footer className={cn(isAuthenticated && "pb-16 md:pb-0")} />

      <BottomNavigation />
    </div>
  );
};

export default AppShell;

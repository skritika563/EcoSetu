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
 * themselves with flex-1. The footer carries bottom padding for authenticated
 * mobile users, since it is the only content the fixed bottom navigation can
 * overlap at the end of the document.
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

      <main className="flex flex-1 flex-col">
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

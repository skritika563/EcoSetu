/**
 * AppShell — The main layout wrapper.
 *
 * Renders:
 *   Navbar
 *   <main> — page content via Outlet / children
 *   Footer
 *
 * Pages that need a full-bleed layout (e.g., auth pages, dashboard)
 * can opt out of the standard shell by not nesting inside it.
 */

import { Outlet } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";

const AppShell = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default AppShell;

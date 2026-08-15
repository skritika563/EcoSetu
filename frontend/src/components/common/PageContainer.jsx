/**
 * PageContainer — the standard page gutter and max width.
 *
 * Every dashboard page uses this so horizontal rhythm is identical across
 * modules and only has to change in one place.
 */

import { cn } from "@/lib/utils";

const PageContainer = ({ children, className }) => (
  <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
);

export default PageContainer;

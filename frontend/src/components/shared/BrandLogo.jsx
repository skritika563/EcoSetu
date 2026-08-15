/**
 * BrandLogo — the EcoSetu wordmark + leaf mark.
 *
 * Used by the Navbar, Footer and every auth page so the brand lockup is
 * defined exactly once.
 *
 * @param {"sm"|"md"} [size] - sm: navbar/footer, md: auth pages
 * @param {string} [to] - link target; pass null to render a non-interactive mark
 */

import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", text: "text-xl" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5", text: "text-2xl" },
};

const BrandLogo = ({ size = "sm", to = "/", className }) => {
  const scale = SIZES[size] ?? SIZES.sm;

  const content = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary shadow-sm transition-transform duration-200 group-hover:scale-105",
          scale.box
        )}
      >
        <Leaf className={cn("text-primary-foreground", scale.icon)} strokeWidth={2.2} />
      </div>
      <span
        className={cn(
          "font-heading font-bold tracking-tight text-foreground",
          scale.text
        )}
      >
        Eco<span className="text-primary">Setu</span>
      </span>
    </>
  );

  const classes = cn("group flex select-none items-center gap-2", className);

  if (!to) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link to={to} className={classes} aria-label="EcoSetu home">
      {content}
    </Link>
  );
};

export default BrandLogo;

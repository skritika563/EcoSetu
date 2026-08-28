/**
 * BrandLogo — the EcoSetu wordmark + mark.
 *
 * Used by the Navbar, Footer and every auth page so the brand lockup is
 * defined exactly once.
 *
 * @param {"sm"|"md"} [size] - sm: navbar/footer, md: auth pages
 * @param {string} [to] - link target; pass null to render a non-interactive mark
 */

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", text: "text-xl" },
  md: { box: "h-10 w-10 rounded-xl", text: "text-2xl" },
};

const BrandLogo = ({ size = "sm", to = "/", className }) => {
  const scale = SIZES[size] ?? SIZES.sm;

  const content = (
    <>
      <img
        src="/logo.png"
        alt="EcoSetu"
        className={cn(
          "shrink-0 object-cover shadow-sm transition-transform duration-200 group-hover:scale-105",
          scale.box
        )}
      />
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

/**
 * Footer — Global footer for EcoSetu.
 *
 * Sections:
 * - Brand tagline
 * - Platform links
 * - Community links
 * - Legal links
 * - Environmental stats bar
 */

import { Link } from "react-router-dom";
import { Leaf, Recycle, TreePine, Heart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const PLATFORM_LINKS = [
  { label: "Schedule Pickup", href: "/household" },
  { label: "Scrap Marketplace", href: "/collector" },
  { label: "Collection Drives", href: "/organization" },
  { label: "Scrap Rates", href: "/scrap-rates" },
];

const COMMUNITY_LINKS = [
  { label: "For Households", href: "/#households" },
  { label: "For Collectors", href: "/#collectors" },
  { label: "For NGOs & Schools", href: "/#organizations" },
  { label: "How It Works", href: "/#how-it-works" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact Us", href: "/contact" },
];

const STATS = [
  { icon: Recycle, value: "50,000+", label: "kg Recycled" },
  { icon: TreePine, value: "1,200+", label: "Trees Saved" },
  { icon: Leaf, value: "800+", label: "Happy Households" },
];

const Footer = () => {
  return (
    <footer id="site-footer" className="mt-auto border-t border-border bg-card">
      {/* Stats ribbon */}
      <div className="bg-primary/5 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold text-foreground leading-tight">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 w-fit group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Leaf className="h-4 w-4 text-primary-foreground" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight">
                Eco<span className="text-primary">Setu</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Connecting households, collectors, and organizations to build a cleaner, circular economy across India.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase">
              Community
            </h3>
            <ul className="space-y-2.5">
              {COMMUNITY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-10" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} EcoSetu. All rights reserved.
          </span>
          <span className="flex items-center gap-1.5">
            Made with <Heart className="h-3 w-3 text-primary fill-primary" /> for a greener India
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

/**
 * LandingPage — the public marketing entry point for EcoSetu.
 *
 * Only guests reach this page: authenticated users get their role dashboard at
 * `/` instead (see AuthHome in App.jsx).
 *
 * Sections:
 *   1. Hero — what EcoSetu is + primary CTAs
 *   2. How It Works — the three-step pickup flow
 *   3. Platform — marketplace, Eco Points, campaigns  [#marketplace]
 *   4. Built for everyone — households / organizations / collectors
 *   5. Impact — environmental numbers
 *   6. Final CTA
 *
 * Kept deliberately tight: six sections that each say something new.
 */

import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Gift,
  IndianRupee,
  Leaf,
  Megaphone,
  Recycle,
  ShieldCheck,
  Sparkles,
  Store,
  TreePine,
  TrendingUp,
  Users,
} from "lucide-react";

import { ROLE_META } from "@/config/roles";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Interactive dot field behind the hero (React Bits). Loaded lazily so its gsap
 * dependency never blocks the hero's first paint.
 */
const DotGrid = lazy(() => import("@/components/reactbits/DotGrid"));

/** Dot colours per theme — the canvas takes hex props, not CSS tokens. */
const DOT_COLORS = {
  light: { base: "#DCE6D6", active: "#2C6E49" },
  dark: { base: "#22352A", active: "#4C956C" },
};

/* ─── How it works ───────────────────────────────────────────────────────── */
const STEPS = [
  {
    step: "01",
    icon: CalendarCheck,
    title: "Schedule a Pickup",
    description:
      "Tell us what scrap you have and when. Add a photo and our AI estimates the category for you — or skip it entirely.",
  },
  {
    step: "02",
    icon: Recycle,
    title: "Get It Collected",
    description:
      "A verified collector arrives at your doorstep. Everything is weighed and sorted on the spot, and you're paid at transparent rates.",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Track Your Impact",
    description:
      "Earn Eco Points on every pickup, watch your CO₂ savings add up, and see exactly where your waste ended up.",
  },
];

/* ─── Platform capabilities ──────────────────────────────────────────────── */
const PLATFORM = [
  {
    icon: Store,
    title: "A real marketplace",
    description:
      "Collectors list sorted material — plastic, metal, paper, e-waste — and households, schools and NGOs buy it at algorithmic rates that stay fair on both sides.",
    points: ["Verified sellers only", "Bulk pricing tiers", "Secure online payment"],
  },
  {
    icon: Gift,
    title: "Eco Points that add up",
    description:
      "Every kilogram you recycle earns points. Track your streak, see your CO₂ and tree equivalents, and redeem what you've built up.",
    points: ["Points on every pickup", "Impact dashboard", "Redeemable rewards"],
  },
  {
    icon: Megaphone,
    title: "Community campaigns",
    description:
      "NGOs, schools and universities run collection drives with public goals. Neighbours join in, and everyone sees the total climb together.",
    points: ["Drives near you", "Shared goals", "Participation tracking"],
  },
];

/* ─── Role positioning ───────────────────────────────────────────────────── */
const ROLE_FEATURES = [
  {
    anchor: "households",
    icon: ROLE_META.household.icon,
    title: "For Households",
    description:
      "Schedule pickups, sell scrap at fair rates, and earn rewards for recycling. No more haggling — transparent pricing, right at your doorstep.",
    color: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40",
  },
  {
    anchor: "organizations",
    icon: ROLE_META.organization.icon,
    title: "For Organizations",
    description:
      "Schools, NGOs and universities run sustainability drives, manage bulk pickups, and measure institutional environmental impact in one place.",
    color: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
  },
  {
    anchor: "collectors",
    icon: ROLE_META.collector.icon,
    title: "For Scrap Collectors",
    description:
      "Accept pickup jobs, grow your business, and sell sorted materials on the marketplace. Predictable income, digital records, no middleman cuts.",
    color: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 bg-amber-100 dark:bg-amber-900/40",
  },
];

/* ─── Impact numbers ─────────────────────────────────────────────────────── */
const IMPACT = [
  { icon: Recycle, value: "50,000+", label: "kg Recycled" },
  { icon: TreePine, value: "1,200+", label: "Trees Saved" },
  { icon: Users, value: "3,500+", label: "Active Users" },
  { icon: IndianRupee, value: "8.5L+", label: "Earned by Collectors" },
];

/* ─── Trust strip ────────────────────────────────────────────────────────── */
const TRUST = [
  { icon: BadgeCheck, label: "Verified collectors" },
  { icon: ShieldCheck, label: "Transparent rates" },
  { icon: Leaf, label: "Tracked impact" },
];

const sectionHeading = "font-heading text-3xl font-bold text-foreground md:text-4xl";

const LandingPage = () => {
  const { isDark } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const dots = isDark ? DOT_COLORS.dark : DOT_COLORS.light;

  return (
  <div>
    {/* ═══ Hero ═════════════════════════════════════════════════════════ */}
    <section className="relative overflow-hidden">
      <div className="ecosetu-gradient-subtle absolute inset-0 -z-10" />

      {/* Interactive dot field — decorative, so it is skipped entirely for
          reduced-motion users and never intercepts pointer events. */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <Suspense fallback={null}>
            <DotGrid
              dotSize={5}
              gap={24}
              baseColor={dots.base}
              activeColor={dots.active}
              proximity={110}
              shockRadius={220}
              shockStrength={4}
              resistance={750}
              returnDuration={1.2}
            />
          </Suspense>
        </div>
      )}

      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 md:py-32 lg:px-8 lg:py-40">
        <motion.div initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Leaf className="h-3.5 w-3.5" />
              India&apos;s Circular Economy Platform
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={0.08}
            className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            Turn your scrap into
            <br />
            <span className="gradient-text">value for everyone</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={0.16}
            className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Schedule scrap pickups, sell recyclables at fair rates, join collection drives and
            earn Eco Points — all from one platform.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={0.24}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <Button id="hero-signup" size="lg" className="h-11 px-8 shadow-md" asChild>
              <Link to="/auth/register">
                Get Started — It&apos;s Free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button id="hero-marketplace" size="lg" variant="outline" className="h-11" asChild>
              <a href="#marketplace">
                <Store className="mr-1.5 h-4 w-4" />
                Explore Marketplace
              </a>
            </Button>
          </motion.div>

          <motion.ul
            variants={fadeUp}
            custom={0.32}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>

    {/* ═══ How It Works ═════════════════════════════════════════════════ */}
    <section id="how-it-works" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14 text-center"
        >
          <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-medium text-primary">
            Simple Process
          </motion.p>
          <motion.h2 variants={fadeUp} custom={0.06} className={sectionHeading}>
            How Eco Setu works
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={0.12}
            className="mx-auto mt-3 max-w-lg text-muted-foreground"
          >
            From scheduling to impact tracking — everything in three easy steps.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              custom={i * 0.1}
              variants={fadeUp}
            >
              <Card className="relative h-full border-border/50 bg-card transition-shadow duration-300 hover:shadow-md">
                <CardContent className="px-6 pb-8 pt-8 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary/60">
                    Step {item.step}
                  </span>
                  <h3 className="mt-2 font-heading text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ═══ Platform: marketplace, points, campaigns ═════════════════════ */}
    <section id="marketplace" className="bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14 text-center"
        >
          <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-medium text-primary">
            More Than Pickups
          </motion.p>
          <motion.h2 variants={fadeUp} custom={0.06} className={sectionHeading}>
            A full circular economy
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={0.12}
            className="mx-auto mt-3 max-w-lg text-muted-foreground"
          >
            Waste doesn&apos;t stop at collection. EcoSetu closes the loop — resold, rewarded and
            measured.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLATFORM.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={i * 0.1}
                variants={fadeUp}
              >
                <Card className="h-full border-border/50 bg-card">
                  <CardContent className="px-6 pb-8 pt-8">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-10 text-center"
        >
          <Button size="lg" className="h-11 px-8" asChild>
            <Link to="/auth/register">
              <CalendarCheck className="mr-1.5 h-4 w-4" />
              Schedule a Pickup
            </Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Free to join · Scheduled pickups cost nothing
          </p>
        </motion.div>
      </div>
    </section>

    {/* ═══ Built for everyone ═══════════════════════════════════════════ */}
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14 text-center"
        >
          <motion.p variants={fadeUp} custom={0} className="mb-2 text-sm font-medium text-primary">
            Built for Everyone
          </motion.p>
          <motion.h2 variants={fadeUp} custom={0.06} className={sectionHeading}>
            One platform, many roles
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={0.12}
            className="mx-auto mt-3 max-w-lg text-muted-foreground"
          >
            Whether you&apos;re a household recycler, an organization running drives, or a scrap
            collector — Eco Setu has you covered.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ROLE_FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                id={feat.anchor}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={i * 0.1}
                variants={fadeUp}
                className="scroll-mt-24"
              >
                <Card className={cn("h-full border-0", feat.color)}>
                  <CardContent className="px-6 pb-8 pt-8">
                    <div
                      className={cn(
                        "mb-5 flex h-12 w-12 items-center justify-center rounded-xl",
                        feat.iconColor
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {feat.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {feat.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>

    {/* ═══ Impact ═══════════════════════════════════════════════════════ */}
    <section className="border-y border-border bg-muted/30 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {IMPACT.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.08}
                variants={fadeUp}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-heading text-2xl font-bold text-foreground md:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>

    {/* ═══ Final CTA ════════════════════════════════════════════════════ */}
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="ecosetu-gradient relative overflow-hidden rounded-2xl px-8 py-16 text-center md:px-16 md:py-20"
        >
          <div className="absolute right-4 top-4 opacity-10">
            <Recycle className="h-32 w-32 text-white" />
          </div>

          <motion.div variants={fadeUp} custom={0} className="relative z-10 space-y-5">
            <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
              Ready to make a difference?
            </h2>
            <p className="mx-auto max-w-lg text-base text-white/80 md:text-lg">
              Join thousands of users across India building a cleaner, more sustainable future —
              one pickup at a time.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                id="cta-signup"
                size="lg"
                className="h-11 bg-white px-8 text-primary shadow-md hover:bg-white/90"
                asChild
              >
                <Link to="/auth/register">
                  Create your free account
                  <Sparkles className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  </div>
  );
};

export default LandingPage;

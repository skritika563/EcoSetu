/**
 * RewardsPage — spend Eco Points.
 *
 * This is the outflow side of the points economy: pickups and campaign
 * participation credit points (services/ecoScoreService.js on the backend),
 * and this page is where they're spent. The balance shown here is always
 * the server's own figure re-read on load — never a client-side tally —
 * and redemption itself is a server-side atomic debit (see
 * backend/controllers/rewardController.js), so nothing here can overdraw.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Gift, History, Leaf, Package, Sparkles, Ticket, Wrench } from "lucide-react";

import useRewards from "@/hooks/useRewards";
import { formatFriendlyDate, formatNumber } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Category presentation — mirrors the backend's REWARD_CATEGORIES enum
 * (models/Reward.js). Labels/icons/tints live here, never on the server,
 * the same split every other domain config in this app uses.
 */
const CATEGORY_META = {
  voucher: { label: "Vouchers", icon: Ticket, tint: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  "eco-product": { label: "Eco Products", icon: Package, tint: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  donation: { label: "Donations", icon: Leaf, tint: "text-primary bg-primary/10" },
  service: { label: "Services", icon: Wrench, tint: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
};

const getCategoryMeta = (key) =>
  CATEGORY_META[key] ?? { label: "Other", icon: Gift, tint: "text-muted-foreground bg-muted" };

const RewardCard = ({ reward, balance, onRedeem, redeeming }) => {
  const meta = getCategoryMeta(reward.category);
  const Icon = meta.icon;
  const affordable = balance >= reward.pointsCost;
  const shortBy = reward.pointsCost - balance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="text-right">
            <p className="font-heading text-lg font-bold text-foreground">
              {formatNumber(reward.pointsCost)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">points</p>
          </div>
        </div>

        <h3 className="mt-3 font-heading text-base font-semibold text-foreground">{reward.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{reward.description}</p>
        {reward.redemptionNote && (
          <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground/80">{reward.redemptionNote}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {reward.partner && <span>by {reward.partner}</span>}
          {reward.stock !== null && !reward.isSoldOut && (
            <span className="text-amber-600 dark:text-amber-400">{formatNumber(reward.stock)} left</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        {reward.isSoldOut ? (
          <Button variant="outline" className="w-full" disabled>
            Out of stock
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={!affordable || redeeming}
            onClick={() => onRedeem(reward)}
          >
            {affordable ? "Redeem" : `${formatNumber(shortBy)} points short`}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

const RewardsPage = () => {
  const { catalogue, ledger, redeem } = useRewards();
  const [pendingReward, setPendingReward] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [category, setCategory] = useState("all");

  const balance = catalogue.data?.balance ?? 0;
  const allRewards = catalogue.data?.rewards ?? [];
  const redemptions = ledger.data?.redemptions ?? [];

  // Filter chips are DERIVED from what's actually in the catalogue right
  // now, not a hardcoded list of every possible category — a category with
  // nothing currently active in it (eco-product, once its only rewards
  // were retired) simply stops showing a chip, rather than linking to a
  // permanently-empty tab.
  const presentCategories = [...new Set(allRewards.map((r) => r.category))];
  const filters = [
    { value: "all", label: "All" },
    ...presentCategories.map((value) => ({ value, label: getCategoryMeta(value).label })),
  ];
  const rewards = category === "all" ? allRewards : allRewards.filter((r) => r.category === category);

  const handleRedeem = async () => {
    if (!pendingReward) return;
    setRedeeming(true);
    try {
      const result = await redeem(pendingReward.id);
      setPendingReward(null);
      // A "none"-effect reward (a donation, mainly) has nowhere to spend a
      // code — it's just a reference number for this redemption, not
      // something to type in anywhere, so the toast doesn't call it a code.
      toast.success(
        result.redemption.effect === "none"
          ? `Redeemed — we'll notify you once it's fulfilled (ref: ${result.redemption.code})`
          : `Redeemed — your code is ${result.redemption.code}`
      );
    } catch (err) {
      toast.error(err.message || "Couldn't redeem this reward.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          <Gift className="h-5 w-5 text-primary" />
          Rewards
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend the Eco Points you earn from pickups and campaigns.
        </p>
      </div>

      {/* Balance */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Your balance
            </p>
            {catalogue.loading && !catalogue.data ? (
              <Skeleton className="mt-2 h-9 w-32" />
            ) : (
              <p className="mt-1 font-heading text-3xl font-bold text-foreground">
                {formatNumber(balance)}{" "}
                <span className="text-base font-medium text-muted-foreground">points</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Redeemed so far</p>
            <p className="mt-1 font-heading text-xl font-semibold text-foreground">
              {formatNumber(ledger.data?.totalPointsSpent ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 h-3.5 w-3.5" />
            My redemptions
          </TabsTrigger>
        </TabsList>

        {/* ── Catalogue ─────────────────────────────────────────────────── */}
        <TabsContent value="catalogue" className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setCategory(f.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  category === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {catalogue.error ? (
            <ErrorState
              title="Unable to load rewards"
              description={catalogue.error}
              onRetry={catalogue.refetch}
            />
          ) : catalogue.loading && rewards.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No rewards here yet"
              description="Nothing in this category right now — check back soon."
              className="py-12"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  balance={balance}
                  onRedeem={setPendingReward}
                  redeeming={redeeming}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Redemption ledger ─────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-5">
          {ledger.error ? (
            <ErrorState
              title="Unable to load your redemptions"
              description={ledger.error}
              onRetry={ledger.refetch}
            />
          ) : ledger.loading && redemptions.length === 0 ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing redeemed yet"
              description="Rewards you claim will appear here with their codes."
              className="py-12"
            />
          ) : (
            <div className="space-y-2.5">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.rewardName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFriendlyDate(r.createdAt)} · {formatNumber(r.pointsSpent)} points
                    </p>
                    {/* Expiry only matters for a still-usable coupon — a
                        donation (effect "none") isn't spent anywhere, and a
                        fulfilled/cancelled one is already a closed record. */}
                    {r.status === "issued" && r.effect !== "none" && r.expiresAt && (
                      <p
                        className={cn(
                          "mt-0.5 text-[11px]",
                          new Date(r.expiresAt) < new Date() ? "text-destructive" : "text-muted-foreground/80"
                        )}
                      >
                        {new Date(r.expiresAt) < new Date()
                          ? "Expired"
                          : `Expires ${formatFriendlyDate(r.expiresAt)}`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {/* "none"-effect codes (donations) aren't spendable
                          anywhere — labelled "Ref" rather than "Code" so
                          this never reads as something to enter at
                          checkout/booking. */}
                      {r.effect === "none" && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Ref</span>
                      )}
                      <code className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
                        {r.code}
                      </code>
                    </div>
                    <span className="text-xs capitalize text-muted-foreground">{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!pendingReward}
        onOpenChange={(open) => !open && setPendingReward(null)}
        title="Redeem this reward?"
        description={
          pendingReward
            ? `"${pendingReward.name}" costs ${formatNumber(pendingReward.pointsCost)} Eco Points. This will be deducted from your balance and can't be undone.`
            : ""
        }
        confirmLabel="Redeem"
        cancelLabel="Cancel"
        variant="default"
        loading={redeeming}
        onConfirm={handleRedeem}
      />
    </PageContainer>
  );
};

export default RewardsPage;

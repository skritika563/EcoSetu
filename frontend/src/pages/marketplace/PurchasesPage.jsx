/**
 * PurchasesPage — orders where the signed-in user is the BUYER.
 *
 * Tabs map to real order statuses (config/marketplace PURCHASE_TABS);
 * "Processing" covers pending/confirmed/ready, which is why filtering
 * happens client-side over one fetch rather than one request per tab —
 * a tab isn't always a single status.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag } from "lucide-react";

import { usePurchases } from "@/hooks/useMarketplaceOrders";
import { PURCHASE_TABS } from "@/config/marketplace";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import OrderCard from "@/components/marketplace/OrderCard";

const PurchasesPage = () => {
  const navigate = useNavigate();
  const { orders, loading, error, refetch } = usePurchases();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const tabConfig = PURCHASE_TABS.find((t) => t.value === tab);
    const query = search.trim().toLowerCase();

    return orders
      .filter((order) => !tabConfig?.statuses || tabConfig.statuses.includes(order.orderStatus))
      .filter(
        (order) =>
          !query ||
          order.id.toLowerCase().includes(query) ||
          order.product?.title?.toLowerCase().includes(query) ||
          order.seller?.name?.toLowerCase().includes(query)
      );
  }, [orders, tab, search]);

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <MarketplaceHeader title="My Purchases" description="Everything you've bought on the marketplace." />

      {error ? (
        <ErrorState title="Unable to load your purchases" description={error} onRetry={refetch} />
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, item or seller"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search purchases"
            />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full sm:w-fit">
              {PURCHASE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {PURCHASE_TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-4">
                {loading ? (
                  <ListSkeleton count={3} />
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title={search.trim() ? "No purchases match your search." : "No purchases yet"}
                    description={
                      search.trim()
                        ? undefined
                        : "Items you buy on the marketplace will show up here."
                    }
                    actionLabel={search.trim() ? undefined : "Browse the marketplace"}
                    onAction={search.trim() ? undefined : () => navigate("/marketplace")}
                    className="py-12"
                  />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((order) => (
                      <OrderCard key={order.id} order={order} perspective="buyer" />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </PageContainer>
  );
};

export default PurchasesPage;

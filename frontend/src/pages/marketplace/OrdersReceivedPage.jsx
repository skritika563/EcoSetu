/**
 * OrdersReceivedPage — orders placed on the signed-in user's own listings.
 *
 * The seller's counterpart to PurchasesPage. Tabs here map one-to-one onto
 * real statuses, so each tab fetches its own filtered set server-side rather
 * than filtering a single payload the way the buyer's "Processing" tab has to.
 *
 * ?productId= scopes the whole page to one listing's orders (every status,
 * no tabs) — how "View customer details" on a product page lands here, so a
 * seller checking on one item isn't wading through their entire queue.
 */

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Inbox } from "lucide-react";

import { useReceivedOrders } from "@/hooks/useMarketplaceOrders";
import { SELLER_ORDER_TABS } from "@/config/marketplace";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import OrderCard from "@/components/marketplace/OrderCard";

const EMPTY_COPY = {
  pending: "No orders waiting for your confirmation.",
  confirmed: "No confirmed orders right now.",
  ready: "Nothing marked ready for the buyer.",
  completed: "No completed orders yet.",
  cancelled: "No cancelled orders.",
};

const OrdersReceivedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId");
  const [tab, setTab] = useState("pending");
  const { orders, loading, error, refetch } = useReceivedOrders(productId ? null : tab, productId);

  // Scoped view: one listing's customers, every status, no tabs — a flat
  // list is the right shape here since it's usually a handful of orders.
  if (productId) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
          <Link to={`/marketplace/product/${productId}`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to listing
          </Link>
        </Button>

        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Customer details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone who's ordered this listing.</p>
        </div>

        {error ? (
          <ErrorState title="Unable to load orders" description={error} onRetry={refetch} />
        ) : loading ? (
          <ListSkeleton count={3} />
        ) : orders.length === 0 ? (
          <EmptyState icon={Inbox} title="No customers for this listing yet" className="py-12" />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} perspective="seller" />
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <MarketplaceHeader
        title="Orders Received"
        description="Orders buyers have placed on your listings."
      />

      <Tabs value={tab} onValueChange={setTab}>
        {/* Five tabs won't fit on a 320px screen — scroll rather than wrap
            into an unreadable two-line grid. */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max min-w-full sm:w-fit sm:min-w-0">
            {SELLER_ORDER_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {SELLER_ORDER_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {error ? (
              <ErrorState title="Unable to load your orders" description={error} onRetry={refetch} />
            ) : loading ? (
              <ListSkeleton count={3} />
            ) : orders.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={EMPTY_COPY[t.value]}
                description={
                  t.value === "pending"
                    ? "When someone buys from you, the order lands here first."
                    : undefined
                }
                actionLabel={t.value === "pending" ? "Manage my listings" : undefined}
                onAction={t.value === "pending" ? () => navigate("/marketplace/listings") : undefined}
                className="py-12"
              />
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} perspective="seller" />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
};

export default OrdersReceivedPage;

/**
 * OrderDetailsPage — one marketplace order, from whichever side is viewing.
 *
 * ONE PAGE, BOTH PARTIES: `viewerRole` comes from the server (it checks
 * whether the caller is the order's buyer or seller) — the client never
 * decides which side it's on. Only the seller gets status-advance buttons,
 * and the backend re-validates every transition regardless of what the UI
 * offered.
 *
 * Mounted at both /marketplace/purchases/:id and /marketplace/orders/:id so
 * each list links somewhere that reads naturally; the page itself adapts.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  MapPin,
  MessageCircle,
  Package,
  RotateCcw,
  Truck,
} from "lucide-react";

import { useMarketplaceOrder } from "@/hooks/useMarketplaceOrders";
import {
  canCancelOrder,
  getMarketplaceCategory,
  getOrderStatus,
  getPaymentStatusMeta,
  getSellerNextActions,
} from "@/config/marketplace";
import { formatCurrency, formatFriendlyDate, formatRelativeTime } from "@/lib/format";
import { downloadOrderInvoice } from "@/lib/marketplaceInvoice";
import { notifyComingSoon } from "@/lib/comingSoon";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Where "back" goes depends on which side of the order the viewer is on.
 * Defined at module scope — a component declared inside the page body is
 * recreated on every render, which remounts its subtree and trips React's
 * own lint rule.
 */
const BackLink = ({ viewerRole }) => {
  const isSeller = viewerRole === "seller";
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
      <Link to={isSeller ? "/marketplace/orders" : "/marketplace/purchases"}>
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        {isSeller ? "Orders Received" : "My Purchases"}
      </Link>
    </Button>
  );
};

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { order, loading, error, refetch, changeStatus } = useMarketplaceOrder(orderId);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [trackingAction, setTrackingAction] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [working, setWorking] = useState(false);

  if (error) {
    return (
      <PageContainer className="py-10">
        <BackLink viewerRole={order?.viewerRole} />
        <ErrorState title="We couldn't load this order" description={error} onRetry={refetch} className="mt-4" />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink viewerRole={order?.viewerRole} />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer className="py-10">
        <BackLink viewerRole={order?.viewerRole} />
        <EmptyState title="Order not found" description="This order may no longer exist." className="mt-4" />
      </PageContainer>
    );
  }

  const isSeller = order.viewerRole === "seller";
  const counterparty = isSeller ? order.buyer : order.seller;
  const category = getMarketplaceCategory(order.product?.category);
  const CategoryIcon = category.icon;
  const status = getOrderStatus(order.orderStatus);
  const payment = getPaymentStatusMeta(order.paymentStatus);
  const nextActions = isSeller ? getSellerNextActions(order.orderStatus, order.fulfillmentMethod) : [];

  const runTransition = async (nextStatus, reason, tracking) => {
    setWorking(true);
    try {
      await changeStatus(nextStatus, reason, tracking);
      toast.success(nextStatus === "cancelled" ? "Order cancelled" : `Order marked ${nextStatus}`);
      setCancelOpen(false);
      setCancelReason("");
      setTrackingAction(null);
      setTrackingNumber("");
    } catch (err) {
      toast.error(err.message || "Couldn't update this order.");
    } finally {
      setWorking(false);
    }
  };

  // Actions flagged needsTracking (see getSellerNextActions) prompt for an
  // optional tracking reference first, instead of firing immediately.
  const handleActionClick = (action) => {
    if (action.needsTracking) {
      setTrackingAction(action);
      return;
    }
    runTransition(action.status);
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink viewerRole={order?.viewerRole} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Order {order.id}</p>
          <h1 className="mt-0.5 font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatFriendlyDate(order.createdAt)}
          </h1>
        </div>
        <span
          className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium", status.className)}
        >
          {status.label}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: item + timeline ─────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                {order.product?.imageUrl ? (
                  <img src={order.product.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className={cn("flex h-full w-full items-center justify-center", category.tint)}>
                    <CategoryIcon className="h-7 w-7" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{order.product?.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.quantity} {order.product?.unit === "kg" ? "kg" : `× item`} ·{" "}
                  {formatCurrency(order.unitPrice, { decimals: 2 })} each
                </p>
                {order.product?.id && (
                  <Button variant="link" size="sm" asChild className="mt-1 h-auto p-0 text-xs">
                    <Link to={`/marketplace/product/${order.product.id}`}>View listing</Link>
                  </Button>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="font-heading text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(order.totalAmount, { decimals: 2 })}
              </span>
            </div>
          </div>

          {/* Status history — real recorded transitions, not a template. */}
          {order.statusHistory?.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-heading text-sm font-semibold text-foreground">Order timeline</h2>
              <ol className="mt-3 space-y-3">
                {order.statusHistory.map((entry, i) => (
                  <li key={`${entry.status}-${entry.at}-${i}`} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        i === order.statusHistory.length - 1 ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize text-foreground">{entry.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(entry.at)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* ── Right: parties, fulfillment, actions ──────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isSeller ? "Buyer" : "Seller"}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">{counterparty?.name ?? "—"}</p>
            {isSeller && order.buyer?.phone && (
              <p className="mt-0.5 text-xs text-muted-foreground">{order.buyer.phone}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-1">
              {/* Buyer-side only — the seller's own order view already
                  shows a "View customer details" path from the listing
                  itself, and linking a seller to their own profile here
                  would be pointless. */}
              {!isSeller && order.seller?.id && (
                <Button variant="ghost" size="sm" className="-ml-2 h-7 text-xs" asChild>
                  <Link to={`/marketplace/seller/${order.seller.id}`}>View seller profile</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 text-xs", isSeller && "-ml-2")}
                onClick={() => notifyComingSoon("Marketplace messaging")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Contact {isSeller ? "buyer" : "seller"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fulfillment</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground">
              {order.fulfillmentMethod === "delivery" ? (
                <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {order.fulfillmentMethod === "delivery" ? "Delivery" : "Buyer pickup"}
            </p>

            {order.fulfillmentMethod === "delivery" && (order.trackingNumber || order.shippedAt) && (
              <p className="mt-2 text-xs text-muted-foreground">
                {order.shippedAt && <>Shipped {formatRelativeTime(order.shippedAt)}</>}
                {order.trackingNumber && (
                  <>
                    {order.shippedAt ? " · " : ""}Tracking: <span className="font-medium text-foreground">{order.trackingNumber}</span>
                  </>
                )}
              </p>
            )}

            {order.deliveryAddress && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {order.deliveryAddress.line}, {order.deliveryAddress.city}{" "}
                  {order.deliveryAddress.pincode}
                  {order.deliveryAddress.contactPhone && ` · ${order.deliveryAddress.contactPhone}`}
                </span>
              </p>
            )}

            <Separator className="my-3" />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Payment</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  payment.className
                )}
              >
                {payment.label}
              </span>
            </div>

            {order.paymentStatus === "test_paid" && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                This is a historical order from before real payments — it was never actually charged.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {nextActions.map((action) => (
              <Button
                key={action.status}
                onClick={() => handleActionClick(action)}
                disabled={working}
              >
                {action.label}
              </Button>
            ))}

            {canCancelOrder(order.orderStatus) && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
                disabled={working}
              >
                Cancel order
              </Button>
            )}

            <Button variant="outline" onClick={() => downloadOrderInvoice(order)}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Invoice
            </Button>

            {!isSeller && order.product?.id && order.orderStatus === "completed" && (
              <Button variant="ghost" asChild>
                <Link to={`/marketplace/product/${order.product.id}`}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Buy again
                </Link>
              </Button>
            )}
          </div>

          {order.cancellation && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive">
                Cancelled by the {order.cancellation.cancelledBy}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{order.cancellation.reason}</p>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              The {isSeller ? "buyer" : "seller"} will be notified, and the item goes back on sale.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancelling (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={working}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              onClick={() => runTransition("cancelled", cancelReason.trim())}
              disabled={working}
            >
              {working ? "Cancelling…" : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!trackingAction} onOpenChange={(open) => !open && setTrackingAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as shipped</DialogTitle>
            <DialogDescription>
              Add a tracking reference if you have one — the buyer will see it. Optional.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Tracking number (optional)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            maxLength={120}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingAction(null)} disabled={working}>
              Cancel
            </Button>
            <Button
              onClick={() => runTransition(trackingAction.status, undefined, trackingNumber.trim() || undefined)}
              disabled={working}
            >
              {working ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default OrderDetailsPage;

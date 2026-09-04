/**
 * ProductDetailsPage — one listing, in full.
 *
 * OWNERSHIP SPLIT: when the viewer owns the listing, Buy Now is replaced by
 * Edit / Manage. `isOwner` comes from the SERVER (it compares the listing's
 * sellerId against the authenticated user) rather than being computed here
 * from a client-held id — the backend would reject a self-purchase anyway,
 * but the UI shouldn't offer it in the first place.
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  Info,
  MapPin,
  Package,
  Pencil,
  Recycle,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { useProduct } from "@/hooks/useProducts";
import { useAddresses } from "@/hooks/useAddresses";
import { useAuth } from "@/contexts/AuthContext";
import { getMarketplaceCategory, getCondition } from "@/config/marketplace";
import { formatCurrency, formatFriendlyDate, formatWeight } from "@/lib/format";
import * as orderService from "@/services/marketplaceOrderService";
import { loadRazorpayCheckout } from "@/lib/razorpay";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ProductGallery from "@/components/marketplace/ProductGallery";
import SellerCard from "@/components/marketplace/SellerCard";
import WishlistButton from "@/components/marketplace/WishlistButton";
import CheckoutSummary from "@/components/marketplace/CheckoutSummary";
import { cn } from "@/lib/utils";

const BackLink = () => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
    <Link to="/marketplace">
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      Marketplace
    </Link>
  </Button>
);

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product, loading, error, refetch, applyProduct } = useProduct(productId);
  const { addresses, addAddress, updateAddress } = useAddresses();
  const { user } = useAuth();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [checkingCustomers, setCheckingCustomers] = useState(false);

  if (error) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <ErrorState title="We couldn't load this listing" description={error} onRetry={refetch} className="mt-4" />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <EmptyState
          title="Listing not found"
          description="It may have been removed or sold."
          className="mt-4"
        />
      </PageContainer>
    );
  }

  const category = getMarketplaceCategory(product.category);
  const CategoryIcon = category.icon;
  const condition = getCondition(product.condition);
  const isSoldOut = product.status === "sold" || product.quantity === 0;

  /**
   * Opens a real Razorpay order for this purchase's server-computed total
   * and drives Checkout, resolving with the {razorpayOrderId,
   * razorpayPaymentId, razorpaySignature} proof only once a payment has
   * genuinely gone through. Mirrors BookPickupPage's collectInstantFeePayment
   * for the instant-pickup fee — same wrapping-callbacks-in-a-promise
   * approach, same reject-rather-than-silently-resolve on cancel/failure.
   */
  const collectOrderPayment = async ({ quantity, fulfillmentMethod, deliveryAddress, redemptionCode }, onReady) => {
    const checkoutOrder = await orderService.createCheckoutOrder({
      productId: product.id,
      quantity,
      fulfillmentMethod,
      deliveryAddress,
      redemptionCode,
    });
    const Razorpay = await loadRazorpayCheckout();
    onReady?.();

    return new Promise((resolve, reject) => {
      const rzp = new Razorpay({
        key: checkoutOrder.keyId,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency,
        order_id: checkoutOrder.orderId,
        name: "EcoSetu",
        description: product.title,
        prefill: {
          name: user?.name || undefined,
          email: user?.email || undefined,
          contact: user?.phone || undefined,
        },
        theme: { color: "#16a34a" },
        handler: (response) => {
          resolve({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled — your order wasn't placed.")),
        },
      });
      rzp.on("payment.failed", (response) => {
        reject(new Error(response.error?.description || "Payment failed. Please try again."));
      });
      rzp.open();
    });
  };

  const handlePlaceOrder = async ({ quantity, fulfillmentMethod, deliveryAddress, redemptionCode }) => {
    setPlacing(true);

    // Close THIS dialog before opening Razorpay's, rather than after payment
    // succeeds. Radix locks pointer-events on the rest of the page while its
    // own Dialog is open, scoped to content inside its Portal — Razorpay's
    // checkout overlay is injected as a separate element outside that
    // Portal, so on some browsers (reported: Microsoft Edge) it renders but
    // doesn't respond to clicks/taps while our dialog is still mounted
    // underneath it. Closing first removes the lock before Razorpay's
    // overlay ever appears.
    setCheckoutOpen(false);
    // Bridges the gap between the dialog closing and Razorpay's overlay
    // appearing (it has to hit the server for a checkout order first) so
    // that gap doesn't read as nothing happening.
    const preparingToast = toast.loading("Preparing payment…");

    // A real, verified payment is required before an order can exist at all
    // — same discipline as the instant-pickup fee. If this fails or the
    // buyer backs out of Checkout, nothing has been ordered yet.
    let paymentProof;
    try {
      paymentProof = await collectOrderPayment(
        { quantity, fulfillmentMethod, deliveryAddress, redemptionCode },
        () => toast.dismiss(preparingToast)
      );
    } catch (err) {
      toast.dismiss(preparingToast);
      toast.error(err.message || "Couldn't complete payment. Please try again.");
      setPlacing(false);
      return;
    }

    try {
      await orderService.createOrder({
        productId: product.id,
        quantity,
        fulfillmentMethod,
        deliveryAddress,
        redemptionCode,
        ...paymentProof,
      });
      toast.success("Order placed — the seller has been notified.");
      // Back to Browse, not the order's own detail page — the buyer just
      // finished a purchase flow, the natural next step is more browsing,
      // not immediately re-reading what they just bought (My Purchases is
      // still one tab away whenever they want it).
      navigate("/marketplace");
    } catch (err) {
      // The payment already succeeded — the backend refunds it itself when
      // this happens (stock sold out in the race window, etc.), so this is
      // reporting a resolved situation, not an unresolved charge.
      toast.error(err.message || "Couldn't place this order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // "View customer details" needs to know FIRST whether this listing has
  // any orders at all — a bare navigate would just land the seller on an
  // empty Orders Received screen with no explanation. This checks, then
  // either navigates (there's something to see) or says so in place.
  const handleViewCustomers = async () => {
    setCheckingCustomers(true);
    try {
      const orders = await orderService.getReceivedOrders(null, product.id);
      if (orders.length === 0) {
        toast.error("No customers for this product yet.");
        return;
      }
      navigate(`/marketplace/orders?productId=${product.id}`);
    } catch (err) {
      toast.error(err.message || "Couldn't check this listing's orders.");
    } finally {
      setCheckingCustomers(false);
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Gallery ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <ProductGallery images={product.images} category={product.category} title={product.title} />
        </div>

        {/* ── Summary + actions ───────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  category.tint
                )}
              >
                <CategoryIcon className="h-3 w-3" />
                {category.label}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {condition.label}
              </span>
              {product.ecoVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  EcoSetu Verified
                </span>
              )}
            </div>

            <h1 className="mt-2.5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {product.title}
            </h1>

            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {formatCurrency(product.price, { decimals: 2 })}
              {product.unit === "kg" && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">per kg</span>
              )}
            </p>
          </div>

          {/* Provenance explainer — only rendered when genuinely earned. */}
          {product.ecoVerified && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  Collected &amp; verified by an EcoSetu Collector.
                </span>{" "}
                This material came through a completed EcoSetu pickup, weighed and categorised on site.
              </p>
            </div>
          )}

          <dl className="space-y-2.5 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Boxes className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <dd className="text-foreground">
                {isSoldOut ? (
                  <span className="text-destructive">Sold out</span>
                ) : (
                  <>
                    {product.quantity} {product.unit === "kg" ? "kg" : "available"}
                  </>
                )}
              </dd>
            </div>

            {product.material && (
              <div className="flex items-start gap-2.5">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd className="text-foreground">{product.material}</dd>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <dd className="text-foreground">
                {product.location?.area ? `${product.location.area}, ` : ""}
                {product.location?.city}
                {product.location?.pincode ? ` ${product.location.pincode}` : ""}
              </dd>
            </div>

            <div className="flex items-start gap-2.5">
              {product.fulfillment?.delivery ? (
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <dd className="text-foreground">
                {[product.fulfillment?.pickup && "Buyer pickup", product.fulfillment?.delivery && "Delivery"]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>

            {/* Eco impact — only when the seller actually recorded a weight,
                so this is a real figure rather than an invented one. */}
            {product.weightKg != null && (
              <div className="flex items-start gap-2.5">
                <Recycle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <dd className="text-foreground">
                  {formatWeight(product.weightKg, { decimals: 1 })} given a second life
                </dd>
              </div>
            )}
          </dl>

          {/* Actions — owner sees management, everyone else sees purchase. */}
          {product.isOwner ? (
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to={`/marketplace/listings/${product.id}/edit`}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit Listing
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/marketplace/listings">Manage Listings</Link>
              </Button>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                This is your own listing, so it can't be purchased from here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isSoldOut}
                  onClick={() => setCheckoutOpen(true)}
                >
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  {isSoldOut ? "Sold out" : "Buy Now"}
                </Button>
                <WishlistButton
                  productId={product.id}
                  isWishlisted={product.isWishlisted}
                  onToggled={(_, isWishlisted) => applyProduct((prev) => ({ ...prev, isWishlisted }))}
                />
              </div>
            </div>
          )}

          <SellerCard
            seller={product.seller}
            isOwner={product.isOwner}
            onViewCustomers={product.isOwner ? handleViewCustomers : undefined}
            viewingCustomers={checkingCustomers}
            onContact={
              product.isOwner
                ? undefined
                : () => navigate(`/marketplace/messages?userId=${product.seller.id}&contextId=${product.id}`)
            }
          />
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      <div>
        <Separator className="mb-5" />
        <h2 className="font-heading text-lg font-semibold text-foreground">Description</h2>
        <p className="mt-2 max-w-3xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {product.description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Listed {formatFriendlyDate(product.createdAt)}
          {product.views > 0 && ` · ${product.views} ${product.views === 1 ? "view" : "views"}`}
        </p>
      </div>

      <CheckoutSummary
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        product={product}
        addresses={addresses}
        onAddAddress={addAddress}
        onEditAddress={updateAddress}
        onConfirm={handlePlaceOrder}
        submitting={placing}
      />
    </PageContainer>
  );
};

export default ProductDetailsPage;

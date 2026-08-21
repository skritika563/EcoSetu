/**
 * OrderCard — one marketplace order, in either the buyer's "My Purchases"
 * list or the seller's "Orders Received" list.
 *
 * One component serves both sides: `perspective` only changes which party is
 * named and where the card links. The order data itself is identical — it's
 * the same document viewed from two ends, exactly like PickupCard/JobCard in
 * the pickups module.
 *
 * Everything shown comes from the order's own snapshot, so a listing edited
 * or deleted after purchase can never change what this card says was bought.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck } from "lucide-react";

import { getMarketplaceCategory, getOrderStatus, getPaymentStatusMeta } from "@/config/marketplace";
import { formatCurrency, formatFriendlyDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const OrderCard = ({ order, perspective = "buyer", className }) => {
  const category = getMarketplaceCategory(order.product?.category);
  const CategoryIcon = category.icon;
  const status = getOrderStatus(order.orderStatus);
  const payment = getPaymentStatusMeta(order.paymentStatus);

  const counterparty = perspective === "buyer" ? order.seller : order.buyer;
  const counterpartyLabel = perspective === "buyer" ? "Seller" : "Buyer";
  const href =
    perspective === "buyer" ? `/marketplace/purchases/${order.id}` : `/marketplace/orders/${order.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      <Link
        to={href}
        className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30 sm:p-4"
      >
        {/* Thumbnail — snapshot image, or the category tile fallback */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border sm:h-20 sm:w-20">
          {order.product?.imageUrl ? (
            <img src={order.product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className={cn("flex h-full w-full items-center justify-center", category.tint)}>
              <CategoryIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="line-clamp-2 min-w-0 text-sm font-medium text-foreground">
              {order.product?.title}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                status.className
              )}
            >
              {status.label}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-muted-foreground">
            {counterpartyLabel}: {counterparty?.name ?? "—"}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {order.fulfillmentMethod === "delivery" ? (
                <Truck className="h-3 w-3" />
              ) : (
                <Package className="h-3 w-3" />
              )}
              {order.fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}
            </span>
            <span>·</span>
            <span>{formatFriendlyDate(order.createdAt)}</span>
            <span>·</span>
            <span>
              {order.quantity} {order.product?.unit === "kg" ? "kg" : `item${order.quantity === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-heading text-sm font-semibold text-foreground">
              {formatCurrency(order.totalAmount, { decimals: 2 })}
            </p>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                payment.className
              )}
            >
              {payment.label}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default OrderCard;

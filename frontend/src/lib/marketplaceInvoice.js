/**
 * Invoice generation for marketplace orders.
 *
 * Mirrors lib/receipt.js exactly — same plain-text approach, same download
 * mechanism, same "swap the body for a real PDF later, call sites unchanged"
 * seam. A separate file because the two documents describe opposite
 * transactions (a pickup pays the customer; an order charges the buyer) with
 * different parties and line items; sharing one builder would mean branching
 * on which kind it is at every line.
 *
 * Payment is real (Razorpay, verified server-side — see
 * marketplaceOrderController.createOrder) for every order created now. The
 * `test_paid` branch below only ever fires on a historical order from
 * before real payments existed, and says so plainly rather than printing
 * "Paid" on an invoice for money that never moved.
 */

import { formatCurrency } from "@/lib/format";
import { getMarketplaceCategory, getOrderStatus, getPaymentStatusMeta } from "@/config/marketplace";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const buildInvoiceText = (order) => {
  const width = 46;
  const rule = "─".repeat(width);

  const row = (label, value) => {
    const gap = Math.max(1, width - label.length - String(value).length);
    return `${label}${" ".repeat(gap)}${value}`;
  };

  const unitLabel = order.product?.unit === "kg" ? "kg" : "×";

  const body = [
    "🌿 EcoSetu",
    "Marketplace Invoice",
    rule,
    row("Order ID", order.id),
    row("Date", formatDate(order.createdAt)),
    row("Status", getOrderStatus(order.orderStatus).label),
    rule,
    row("Seller", order.seller?.name ?? "—"),
    row("Buyer", order.buyer?.name ?? "—"),
    rule,
    order.product?.title ?? "Item",
    row(
      `  ${getMarketplaceCategory(order.product?.category).label} · ${order.quantity} ${unitLabel} ${formatCurrency(order.unitPrice, { decimals: 2 })}`,
      formatCurrency(order.totalAmount, { decimals: 2 })
    ),
    rule,
    row("Total", formatCurrency(order.totalAmount, { decimals: 2 })),
    row("Payment", getPaymentStatusMeta(order.paymentStatus).label),
    // Says so on the document itself, not just in the app.
    order.paymentStatus === "test_paid"
      ? "  (Historical order — never actually charged)"
      : null,
    rule,
    row("Fulfillment", order.fulfillmentMethod === "delivery" ? "Delivery" : "Buyer pickup"),
    ...(order.deliveryAddress
      ? [
          `  ${order.deliveryAddress.line}`,
          `  ${order.deliveryAddress.city}${order.deliveryAddress.pincode ? " " + order.deliveryAddress.pincode : ""}`,
        ]
      : []),
    rule,
    "Thank you for keeping materials in use.",
  ].filter(Boolean);

  return body.join("\n");
};

/** Triggers a browser download of the invoice as a .txt file. */
export const downloadOrderInvoice = (order) => {
  const content = buildInvoiceText(order);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `EcoSetu-Invoice-${order.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export default { buildInvoiceText, downloadOrderInvoice };

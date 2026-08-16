/**
 * Receipt generation for completed pickups.
 *
 * No PDF backend — this builds a clean, plain-text receipt and triggers a
 * client-side download. Swapping to a real generated PDF later only means
 * replacing `downloadReceipt`'s body; every call site stays the same.
 */

import { formatCurrency, formatWeight } from "@/lib/format";
import { getCategory } from "@/config/domain";
import { getPaymentStatus } from "@/config/pickups";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const buildReceiptText = (pickup) => {
  const lines = pickup.verifiedCategories ?? [];
  const width = 44;
  const rule = "─".repeat(width);

  const row = (label, value) => {
    const gap = Math.max(1, width - label.length - value.length);
    return `${label}${" ".repeat(gap)}${value}`;
  };

  const body = [
    "🌿 EcoSetu",
    "Pickup Receipt",
    rule,
    row("Pickup ID", pickup.id),
    row("Date", formatDate(pickup.pickupDate)),
    row("Customer", pickup.customer?.name ?? "—"),
    row("Collector", pickup.collector?.name ?? "—"),
    row("Address", pickup.pickupAddress?.line ?? "—"),
    `${pickup.pickupAddress?.city ?? ""}${pickup.pickupAddress?.pincode ? " " + pickup.pickupAddress.pincode : ""}`,
    rule,
    ...lines.map((line) =>
      row(
        `${getCategory(line.category).label} (${formatWeight(line.weightKg)})`,
        formatCurrency(line.amount, { decimals: 2 })
      )
    ),
    pickup.serviceCharge > 0 ? row("Instant pickup fee", formatCurrency(pickup.serviceCharge)) : null,
    rule,
    row("Total amount", formatCurrency(pickup.totalAmount + (pickup.serviceCharge || 0), { decimals: 2 })),
    row("Payment status", getPaymentStatus(pickup.paymentStatus).label),
    rule,
    "Thank you for recycling with EcoSetu.",
  ].filter(Boolean);

  return body.join("\n");
};

/** Triggers a browser download of the receipt as a .txt file. */
export const downloadReceipt = (pickup) => {
  const content = buildReceiptText(pickup);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `EcoSetu-Receipt-${pickup.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export default { buildReceiptText, downloadReceipt };

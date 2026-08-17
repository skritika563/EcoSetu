/**
 * pickupToActivityItem — turns a real Pickup record into the compact
 * "recent activity" row shape RecentActivity.jsx (Home) and Sustainability's
 * activity feed both render.
 *
 * Shared in one place on purpose: the Home dashboard used to show a fully
 * mock feed (data/activityData.js) that would say things like "Pickup
 * completed +₹268 by Ramesh Kumar" no matter what the signed-in user had
 * actually just done — including right after scheduling a brand-new pickup
 * that hadn't even been accepted yet. This maps whatever the pickup's REAL
 * current status is, so "pending" reads as "Pickup scheduled", not
 * "Pickup completed".
 */

import { formatCurrency } from "@/lib/format";

const STATUS_META = {
  pending: { type: "pickup_scheduled", title: "Pickup scheduled" },
  collector_assigned: { type: "pickup_scheduled", title: "Collector assigned" },
  on_the_way: { type: "pickup_scheduled", title: "Collector on the way" },
  in_progress: { type: "pickup_scheduled", title: "Pickup in progress" },
  completed: { type: "pickup_completed", title: "Pickup completed" },
  cancelled: { type: "pickup_cancelled", title: "Pickup cancelled" },
};

const describe = (pickup, { asCollector }) => {
  if (pickup.status === "completed") {
    const weightKg = (pickup.verifiedCategories ?? []).reduce((sum, c) => sum + c.weightKg, 0);
    const party = asCollector ? pickup.customer?.name : pickup.collector?.name;
    const who = party ? (asCollector ? ` from ${party}` : ` by ${party}`) : "";
    return `${weightKg.toFixed(1)} kg collected${who}`;
  }
  if (pickup.status === "cancelled") {
    return pickup.cancellation?.reason || "Cancelled";
  }
  return (pickup.estimatedCategories ?? []).length > 0
    ? pickup.estimatedCategories.join(", ")
    : "Category to be confirmed at pickup";
};

/**
 * @param {object} pickup - a serialized pickup (services/pickupService.js shape)
 * @param {object} [options]
 * @param {boolean} [options.asCollector] - true when the signed-in user is the collector, not the customer
 */
export const pickupToActivityItem = (pickup, { asCollector = false } = {}) => {
  const meta = STATUS_META[pickup.status] ?? { type: "pickup_scheduled", title: "Pickup update" };

  // The most recent statusHistory entry's timestamp reflects when THIS
  // status was actually reached — createdAt would make a just-completed
  // pickup that was booked days ago read as "days ago" instead of "just now".
  const timestamp = pickup.statusHistory?.at(-1)?.at ?? pickup.createdAt;

  let value = null;
  if (pickup.status === "completed") {
    value = pickup.isDonation ? "Donated" : `+${formatCurrency(pickup.totalAmount)}`;
  }

  return {
    id: pickup.id,
    type: meta.type,
    title: meta.title,
    description: describe(pickup, { asCollector }),
    timestamp,
    value,
    status: pickup.status,
  };
};

export default pickupToActivityItem;

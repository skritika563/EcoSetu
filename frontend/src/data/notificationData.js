/**
 * Mock notifications for the navbar bell.
 *
 * UI-only for now — there is no backend notification system yet (see
 * API_SPEC.md §Notifications for the eventual contract). `type` is a string key
 * the UI maps to an icon, so API responses can drop straight in.
 */

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

export const NOTIFICATIONS = [
  {
    id: "NTF-901",
    type: "pickup",
    title: "Pickup scheduled",
    description: "Your scrap pickup is scheduled for tomorrow, 10:00 AM – 12:00 PM.",
    createdAt: minutesAgo(25),
    read: false,
  },
  {
    id: "NTF-898",
    type: "points",
    title: "You earned 120 Eco Points",
    description: "Points credited for your last completed pickup.",
    createdAt: minutesAgo(180),
    read: false,
  },
  {
    id: "NTF-894",
    type: "marketplace",
    title: "Listing purchased",
    description: "Green Earth NGO bought 45 kg of your sorted PET bottles.",
    createdAt: minutesAgo(400),
    read: false,
  },
  {
    id: "NTF-889",
    type: "campaign",
    title: "New campaign near you",
    description: "Andheri Plastic-Free Weekend starts in 3 days. 148 people joined.",
    createdAt: minutesAgo(1500),
    read: true,
  },
  {
    id: "NTF-880",
    type: "pickup",
    title: "Pickup completed",
    description: "12.4 kg collected. ₹268 paid by Ramesh Kumar.",
    createdAt: minutesAgo(2900),
    read: true,
  },
];

/** Replace with `api.get("/notifications")` when the module lands. */
export const getNotifications = () => NOTIFICATIONS;

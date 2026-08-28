/**
 * AdminPickupDetails — comprehensive pickup inspection page.
 */
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Truck,
  AlertTriangle,
  DollarSign,
  Leaf,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import useAdminPickupDetails from "@/hooks/useAdminPickupDetails";
import StatusBadge from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const AdminPickupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: pickup, loading, error } = useAdminPickupDetails(id);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 rounded-xl md:col-span-2" />
          <Skeleton className="h-64 rounded-xl md:col-span-1" />
        </div>
      </div>
    );
  }

  if (error || !pickup) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/pickups")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pickups
        </Button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertTriangle className="mb-2 h-6 w-6" />
          <p className="font-semibold">{error || "Pickup not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/pickups")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-foreground">
                Pickup #{pickup.id.slice(-6).toUpperCase()}
              </h1>
              <StatusBadge status={pickup.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Created {pickup.createdAt ? format(new Date(pickup.createdAt), "PPP p") : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Pickup Data, Scrap Breakdown, Photos, Status History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pickup Overview Card */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-heading text-base font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Schedule & Location
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {pickup.pickupDate ? format(new Date(pickup.pickupDate), "PPP") : "Not scheduled"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Time Slot</p>
                  <p className="text-sm font-medium text-foreground">
                    {pickup.pickupTimeSlot || "Flexible"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup Address</p>
                  <p className="text-sm font-medium text-foreground">
                    {pickup.address?.street
                      ? `${pickup.address.street}, ${pickup.address.city || ""}, ${pickup.address.state || ""} ${pickup.address.pincode || ""}`
                      : "No address recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrap Categories & Financials */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-heading text-base font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Materials & Valuation
            </h3>

            {pickup.verifiedCategories && pickup.verifiedCategories.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verified by Collector
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium">Weight (kg)</th>
                        <th className="pb-2 font-medium">Rate (₹/kg)</th>
                        <th className="pb-2 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {pickup.verifiedCategories.map((cat, i) => (
                        <tr key={i}>
                          <td className="py-2.5 font-medium capitalize text-foreground">
                            {cat.category?.replace(/_/g, " ")}
                          </td>
                          <td className="py-2.5 text-muted-foreground">{cat.weightKg} kg</td>
                          <td className="py-2.5 text-muted-foreground">₹{cat.ratePerKg}</td>
                          <td className="py-2.5 text-right font-semibold text-foreground">
                            ₹{cat.subtotal || Math.round((cat.weightKg * cat.ratePerKg) * 100) / 100}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer Estimate
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pickup.estimatedCategories?.map((cat, i) => (
                    <Badge key={i} variant="secondary" className="capitalize">
                      {cat?.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
                {pickup.estimatedWeight && (
                  <p className="text-xs text-muted-foreground">
                    Estimated weight: {pickup.estimatedWeight} kg
                  </p>
                )}
              </div>
            )}

            {/* Totals Box */}
            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-border/40 pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <span className="font-semibold capitalize text-foreground">
                  {pickup.paymentStatus || "unpaid"} {pickup.isDonation ? "(Donation)" : ""}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Payout</p>
                <p className="font-heading text-xl font-bold text-foreground">
                  ₹{pickup.totalAmount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Images */}
          {pickup.images && pickup.images.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-heading text-base font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Scrap Photos
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pickup.images.map((img, i) => (
                  <a
                    key={i}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-border/40 transition hover:opacity-90"
                  >
                    <img
                      src={img.url}
                      alt={`Scrap photo ${i + 1}`}
                      className="h-32 w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          {pickup.statusHistory && pickup.statusHistory.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-heading text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Status History Timeline
              </h3>
              <div className="space-y-4">
                {pickup.statusHistory.map((sh, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium capitalize text-foreground">
                        {sh.status?.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sh.timestamp ? format(new Date(sh.timestamp), "PPP p") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Parties Involved & Eco Impact */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Card */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-3 font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Customer
            </h3>
            {pickup.customer ? (
              <div className="space-y-2">
                <p className="font-semibold text-foreground">{pickup.customer.name}</p>
                <p className="text-xs text-muted-foreground">{pickup.customer.email}</p>
                {pickup.customer.phone && (
                  <p className="text-xs text-muted-foreground">{pickup.customer.phone}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/admin/users/${pickup.customer.id}`)}
                >
                  View Customer Profile
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No customer information</p>
            )}
          </div>

          {/* Collector Card */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-3 font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Collector
            </h3>
            {pickup.collector ? (
              <div className="space-y-2">
                <p className="font-semibold text-foreground">{pickup.collector.name}</p>
                <p className="text-xs text-muted-foreground">{pickup.collector.email}</p>
                {pickup.collector.phone && (
                  <p className="text-xs text-muted-foreground">{pickup.collector.phone}</p>
                )}
                {pickup.collector.rating && (
                  <p className="text-xs text-amber-600 font-medium">★ {pickup.collector.rating} / 5</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/admin/users/${pickup.collector.id}`)}
                >
                  View Collector Profile
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No collector assigned yet</p>
            )}
          </div>

          {/* Environmental Points */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <h3 className="mb-3 font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-600" /> Eco Impact
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Eco Points Generated</p>
                <p className="font-heading text-lg font-bold text-foreground">
                  {pickup.ecoPointsEarned ?? 0} pts
                </p>
              </div>
              {pickup.contributionScore && (
                <div>
                  <p className="text-xs text-muted-foreground">Contribution Score</p>
                  <p className="text-sm font-medium text-foreground">{pickup.contributionScore}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPickupDetails;

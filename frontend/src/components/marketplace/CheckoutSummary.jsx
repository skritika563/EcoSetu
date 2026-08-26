/**
 * CheckoutSummary — the Buy Now review dialog.
 *
 * PRICING IS A PREVIEW, NOT AN AUTHORITY. The total shown here is computed
 * client-side purely so the buyer can see it before confirming. The order
 * that actually gets created is priced entirely server-side from the live
 * listing (backend/services/marketplacePricingService.js) — nothing this
 * component calculates is sent or trusted. If the seller changed the price
 * a second ago, the server's number wins and the created order reflects it.
 *
 * "Place order" here only opens the review — the actual Razorpay Checkout
 * flow, and the real charge, happens in the parent (see ProductDetailsPage's
 * collectOrderPayment) once this dialog's onConfirm fires. This component
 * doesn't touch payment itself, it just says plainly that one is coming.
 */

import { useState } from "react";
import { Loader2, Package, ShieldCheck, Truck } from "lucide-react";

import { FULFILLMENT_METHODS } from "@/config/marketplace";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Reused as-is from the pickups module — same saved-address model
// (User.savedAddresses via /api/addresses), same "pick a card, or add a
// new one" interaction, so a buyer sees one consistent address picker
// across the whole app rather than a second, differently-shaped one here.
import AddressPicker from "@/components/pickups/AddressPicker";
import { cn } from "@/lib/utils";

const CheckoutSummary = ({ open, onOpenChange, product, addresses = [], onAddAddress, onConfirm, submitting }) => {
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState(product?.fulfillment?.pickup ? "pickup" : "delivery");
  const [addressId, setAddressId] = useState("");

  if (!product) return null;

  const available = product.quantity;
  const qty = Math.max(1, Math.min(Number(quantity) || 1, available));
  const previewTotal = Math.round(product.price * qty * 100) / 100;

  const methods = Object.entries(FULFILLMENT_METHODS).filter(
    ([key]) => product.fulfillment?.[key]
  );

  // Derived, not stored: covers "nothing picked yet" (falls back to the
  // default, or the most recently added address) the same way as "the
  // previously-picked address just got invalidated" — e.g. right after
  // adding a new one via AddressPicker's own dialog — without needing an
  // effect to reconcile the two.
  const selectedAddress =
    addresses.find((a) => a.id === addressId) ??
    addresses.find((a) => a.isDefault) ??
    addresses[addresses.length - 1];
  const needsAddress = fulfillment === "delivery";
  const canConfirm = qty >= 1 && qty <= available && (!needsAddress || !!selectedAddress);

  const handleConfirm = () => {
    onConfirm({
      quantity: qty,
      fulfillmentMethod: fulfillment,
      deliveryAddress: needsAddress && selectedAddress
        ? {
            label: selectedAddress.label,
            line: selectedAddress.line,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            contactPhone: selectedAddress.contactPhone,
          }
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review your order</DialogTitle>
          <DialogDescription className="line-clamp-1">{product.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seller */}
          {/* min-w-0 on each value span is load-bearing, not decoration: a
              flex item's default min-width is "auto" (≈ its content's
              full width), which silently overrides `truncate`'s
              white-space:nowrap and lets a long seller name push the row
              wider than the dialog instead of ellipsing — the overflow
              then shoves the price row's "₹" off to the right too. Classic
              Windows scrollbars (Edge, and Chrome-on-Windows) take up real
              layout width where Mac's overlay ones don't, so the same bug
              bites harder there — but the fix is min-w-0, not a
              browser-specific patch. */}
          <div className="rounded-xl border border-border bg-muted/25 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Seller</span>
              <span className="min-w-0 truncate font-medium text-foreground">{product.seller?.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Unit price</span>
              <span className="min-w-0 truncate font-medium text-foreground">
                {formatCurrency(product.price, { decimals: 2 })}
                {product.unit === "kg" && <span className="text-muted-foreground">/kg</span>}
              </span>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-qty">
              Quantity {product.unit === "kg" ? "(kg)" : ""}
            </Label>
            <Input
              id="checkout-qty"
              type="number"
              min="1"
              max={available}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{available} available</p>
          </div>

          {/* Fulfillment */}
          <div className="space-y-1.5">
            <Label>Fulfillment</Label>
            <div className="grid gap-2">
              {methods.map(([key, meta]) => {
                const Icon = key === "delivery" ? Truck : Package;
                const active = fulfillment === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFulfillment(key)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{meta.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Address — reuses the SAME saved addresses as the pickups module
              (User.savedAddresses via /api/addresses), not a second system.
              Each card shows the full address, not just the label it was
              saved under, and "Add new address" is right there if none of
              the saved ones fit. */}
          {needsAddress && (
            <div className="space-y-1.5">
              <Label>Delivery address</Label>
              <AddressPicker
                addresses={addresses}
                selectedId={selectedAddress?.id ?? ""}
                onSelect={setAddressId}
                onAddAddress={onAddAddress}
              />
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="font-heading text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(previewTotal, { decimals: 2 })}
            </span>
          </div>

          {/* Payment notice */}
          <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/[0.04] p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Secure payment via Razorpay.</span>{" "}
              You'll be asked to pay the total above next — the order is only placed once payment
              actually goes through.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Processing payment…
              </>
            ) : (
              "Continue to payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutSummary;

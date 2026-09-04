/**
 * BookPickupPage — the 4-step pickup booking flow.
 *
 * Scrap Info → Address → Time Slot → Review, using the same wizard pattern as
 * SignupPage (StepIndicator + slideVariants + useShake for invalid steps).
 *
 * BUSINESS RULES enforced here:
 *   - Step 1 (scrap info) has NO required fields — category and weight are
 *     entirely optional; a user may continue having provided nothing at all.
 *   - Nothing on the review screen is a guaranteed price — see "Estimated
 *     value" wording, sourced from pricingService.estimatePickupValue.
 *   - Scheduled pickups are free; Instant requires a REAL Razorpay payment
 *     for the platform fee, completed and server-verified BEFORE the pickup
 *     is created at all (see handleConfirm + services/paymentService.js).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, CheckCircle2, Construction, Gift, MapPin, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useShake } from "@/hooks/useShake";
import { useAddresses } from "@/hooks/useAddresses";
import { TIME_SLOTS } from "@/data/pickupData";
import { createPickup, uploadPickupImages } from "@/services/pickupService";
import { createInstantFeeOrder } from "@/services/paymentService";
import { loadRazorpayCheckout } from "@/lib/razorpay";
import { estimatePickupValue, getServiceCharge } from "@/services/pricingService";
import { getCategory } from "@/config/domain";
import { formatCurrency, formatFriendlyDate, formatWeight } from "@/lib/format";
import { shakeAnimation, shakeTransition, slideVariants } from "@/lib/animations";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StepIndicator from "@/components/shared/StepIndicator";

import ScrapInfoStep from "@/components/pickups/ScrapInfoStep";
import AddressPicker from "@/components/pickups/AddressPicker";
import TimeSlotPicker from "@/components/pickups/TimeSlotPicker";
import PriceBreakdownTable from "@/components/pickups/PriceBreakdownTable";

const TOTAL_STEPS = 4;
const STEP_TITLES = ["What's the scrap?", "Pickup address", "Preferred time", "Review & confirm"];

const EMPTY_SCRAP_INFO = {
  images: [],
  categories: [],
  aiPrediction: null,
  classificationSource: "skipped",
  itemCount: "",
  estimatedWeightKg: "",
  notes: "",
};

const BookPickupPage = () => {
  const { user, role } = useAuth();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedPickup, setConfirmedPickup] = useState(null);
  // Separate from `submitting` on purpose: pickup creation and image upload
  // are two different requests that can fail independently (see
  // handleConfirm) — "idle" | "uploading" | "success" | "error".
  const [imageUploadState, setImageUploadState] = useState("idle");
  const [imageUploadError, setImageUploadError] = useState(null);
  const { shake, triggerShake } = useShake();

  const [scrapInfo, setScrapInfo] = useState(EMPTY_SCRAP_INFO);
  const { addresses, loading: addressesLoading, addAddress } = useAddresses();
  const [addressId, setAddressId] = useState(null);
  const [pickupType, setPickupType] = useState("scheduled");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  // Eco Points "Free Priority Pickup" reward code — only meaningful for
  // pickupType === "instant". A valid code replaces the Razorpay payment
  // step entirely rather than discounting it (see handleConfirm).
  const [redemptionCode, setRedemptionCode] = useState("");

  // Addresses load asynchronously now — pick the default (or first) one the
  // first time the list arrives, without stomping a choice the user already made.
  useEffect(() => {
    if (addressId == null && addresses.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, addressId]);

  // Once the pickup is confirmed, the wizard (and its local image previews)
  // is gone for good — release the blob: URLs so they don't leak. This runs
  // regardless of whether the real upload succeeds, since the object URLs
  // were only ever a local preview aid, not the upload payload itself (the
  // underlying File objects stay valid and re-usable for a retry either way).
  useEffect(() => {
    if (!confirmedPickup) return;
    scrapInfo.images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    // Only meant to fire once, right when we leave the wizard — scrapInfo
    // itself never changes again after that point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedPickup]);

  if (role === "admin") {
    return (
      <PageContainer className="py-10">
        <EmptyState
          icon={Construction}
          title="Pickup management for administrators is coming soon"
          description="This surface is being designed for admins separately from the household/organization experience."
        />
      </PageContainer>
    );
  }

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const validateStep = () => {
    if (step === 1 && !addressId) return "Please select or add a pickup address.";
    if (step === 2 && pickupType === "scheduled" && (!selectedDate || !selectedSlotId)) {
      return "Please choose a date and time slot.";
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      toast.error(error);
      triggerShake();
      return;
    }
    goNext();
  };

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const serviceCharge = getServiceCharge(pickupType);
  const estimate = estimatePickupValue(scrapInfo.categories, Number(scrapInfo.estimatedWeightKg) || 0);
  // TimeSlotPicker selects by slot ID ("afternoon-2") for its own matching
  // logic, but that raw ID isn't a real time to anyone reading it back later
  // — resolve it to its human label ("4:00 PM – 6:00 PM") before it's shown
  // or sent anywhere, so pickup details never displays "afternoon-2".
  const selectedSlotLabel = TIME_SLOTS.find((s) => s.id === selectedSlotId)?.label ?? null;

  // Uploads whatever's in scrapInfo.images to an already-created pickup.
  // Pulled out of handleConfirm so the "Retry upload" button can call this
  // directly without ever creating a second pickup.
  const uploadImages = async (pickupId) => {
    setImageUploadState("uploading");
    setImageUploadError(null);
    try {
      const { pickup: updated } = await uploadPickupImages(
        pickupId,
        scrapInfo.images.map((img) => img.file)
      );
      setConfirmedPickup(updated);
      setImageUploadState("success");
    } catch (err) {
      console.error("Image upload failed:", err);
      setImageUploadState("error");
      setImageUploadError(err.message || "Couldn't upload your photos.");
    }
  };

  const retryImageUpload = () => {
    if (confirmedPickup) uploadImages(confirmedPickup.id);
  };

  /**
   * Creates a real Razorpay order, opens real Checkout, and resolves with
   * the {razorpayOrderId, razorpayPaymentId, razorpaySignature} proof only
   * once a payment has genuinely gone through. Razorpay's SDK is
   * callback-based, not promise-based — this wraps it so handleConfirm can
   * just `await` it like everything else. Rejects (never silently resolves)
   * if the customer closes the modal or the payment fails, so a cancelled
   * payment can never be mistaken for a completed one.
   */
  const collectInstantFeePayment = async () => {
    const order = await createInstantFeeOrder();
    const Razorpay = await loadRazorpayCheckout();

    return new Promise((resolve, reject) => {
      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "EcoSetu",
        description: "Instant pickup platform fee",
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
          ondismiss: () => reject(new Error("Payment was cancelled — your pickup wasn't booked.")),
        },
      });
      rzp.on("payment.failed", (response) => {
        reject(new Error(response.error?.description || "Payment failed. Please try again."));
      });
      rzp.open();
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);

    // Instant pickups require real, verified payment BEFORE the pickup ever
    // exists — never the other way around, and never a pickup created on
    // the hope that payment will follow. If this fails or the customer
    // backs out of Checkout, nothing has been booked yet — same as any
    // other failed step in this form.
    // A valid reward code skips the whole Razorpay step — there is nothing
    // to charge ₹0 for. It's sent to createPickup below instead of any
    // payment proof; the server does the real validation and consumes it.
    const trimmedCode = redemptionCode.trim();
    let paymentProof = {};
    if (pickupType === "instant" && !trimmedCode) {
      try {
        paymentProof = await collectInstantFeePayment();
      } catch (err) {
        toast.error(err.message || "Couldn't complete payment. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    // The pickup id doesn't exist until creation succeeds — images can only
    // be attached afterward, as their own separate request. If creation
    // itself fails, there's no pickup to upload anything to, so that error
    // is handled and reported on its own, distinct from an image failure.
    let createdPickup;
    try {
      createdPickup = await createPickup({
        // No customer identity is sent — the server derives the owner from
        // the verified auth token, never from the request body.
        pickupType,
        pickupAddress: selectedAddress,
        pickupDate: pickupType === "instant" ? new Date().toISOString() : selectedDate,
        pickupTimeSlot: pickupType === "instant" ? "As soon as possible" : selectedSlotLabel,
        estimatedCategories: scrapInfo.categories,
        itemCount: scrapInfo.itemCount ? Number(scrapInfo.itemCount) : null,
        estimatedWeightKg: scrapInfo.estimatedWeightKg ? Number(scrapInfo.estimatedWeightKg) : null,
        classificationSource: scrapInfo.classificationSource,
        aiPrediction: scrapInfo.aiPrediction,
        imageCount: scrapInfo.images.length,
        notes: scrapInfo.notes.trim() || null,
        redemptionCode: pickupType === "instant" && trimmedCode ? trimmedCode : undefined,
        ...paymentProof,
      });
    } catch (err) {
      // The payment already succeeded at this point for an instant pickup —
      // don't pretend nothing happened. This is a genuinely rare case
      // (booking validation failing right after a successful charge), and
      // without a "resume booking with this payment" flow the honest thing
      // is to say so plainly and point at real support, not silently retry
      // a fresh charge. Doesn't apply when a reward code was used instead —
      // no payment ever happened, so there is nothing to "went through".
      if (pickupType === "instant" && paymentProof.razorpayPaymentId) {
        toast.error(
          `Your payment went through, but we couldn't finish booking the pickup: ${err.message || "please try again"}. Contact support with payment ID ${paymentProof.razorpayPaymentId} if this persists.`,
          { duration: 10000 }
        );
      } else {
        toast.error(err.message || "Couldn't schedule this pickup. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    setConfirmedPickup(createdPickup);
    toast.success("Pickup scheduled successfully");

    // A failure here must never look like a silent success — uploadImages
    // sets imageUploadState to "error" on failure, which the success screen
    // below surfaces with a retry action. It deliberately does NOT roll back
    // or hide the pickup that was already created.
    if (scrapInfo.images.length > 0) {
      await uploadImages(createdPickup.id);
    }

    setSubmitting(false);
  };

  /* ─── Success state ───────────────────────────────────────────────────── */
  if (confirmedPickup) {
    return (
      <PageContainer className="flex flex-1 items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/60 shadow-xl">
            <CardContent className="pb-6 pt-8 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
              >
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </motion.div>

              <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">
                Pickup scheduled successfully
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {confirmedPickup.pickupType === "instant"
                  ? "We're matching you with a nearby collector."
                  : "A collector will be assigned shortly."}
              </p>

              <div className="mt-6 space-y-2.5 rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Pickup ID</span>
                  <span className="font-medium text-foreground">{confirmedPickup.id}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">
                    {confirmedPickup.pickupType === "instant"
                      ? "Today"
                      : formatFriendlyDate(confirmedPickup.pickupDate)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">{confirmedPickup.pickupTimeSlot}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Address</span>
                  <span className="max-w-[60%] truncate text-right font-medium text-foreground">
                    {confirmedPickup.pickupAddress?.line}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize text-foreground">Pending — awaiting collector</span>
                </div>
              </div>

              {imageUploadState === "uploading" && (
                <p className="mt-3 text-xs text-muted-foreground">Uploading your photos…</p>
              )}
              {imageUploadState === "error" && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left">
                  <p className="text-xs font-medium text-destructive">
                    Your pickup was booked, but your photos didn't upload.
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{imageUploadError}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={retryImageUpload}>
                    Retry upload
                  </Button>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2.5">
                <Button asChild>
                  <Link to={`/pickups/${confirmedPickup.id}`}>View Pickup</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/pickups">All pickups</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </PageContainer>
    );
  }

  /* ─── Wizard ──────────────────────────────────────────────────────────── */
  const steps = [
    <ScrapInfoStep key="scrap" value={scrapInfo} onChange={setScrapInfo} />,
    addressesLoading && addresses.length === 0 ? (
      <ListSkeleton key="address" count={2} />
    ) : (
      <AddressPicker
        key="address"
        addresses={addresses}
        selectedId={addressId}
        onSelect={setAddressId}
        onAddAddress={async (address) => {
          // addAddress() posts to /api/addresses and returns the saved record
          // with its real server-assigned id — no client-side id to fabricate.
          const created = await addAddress(address);
          setAddressId(created.id);
        }}
      />
    ),
    <TimeSlotPicker
      key="slot"
      pickupType={pickupType}
      onPickupTypeChange={(type) => {
        setPickupType(type);
        setSelectedSlotId("");
      }}
      selectedDate={selectedDate}
      onSelectDate={(date) => {
        setSelectedDate(date);
        setSelectedSlotId("");
      }}
      selectedSlotId={selectedSlotId}
      onSelectSlot={setSelectedSlotId}
    />,
    <ReviewStep
      key="review"
      scrapInfo={scrapInfo}
      address={selectedAddress}
      pickupType={pickupType}
      selectedDate={selectedDate}
      selectedSlotLabel={selectedSlotLabel}
      serviceCharge={serviceCharge}
      estimate={estimate}
      redemptionCode={redemptionCode}
      onRedemptionCodeChange={setRedemptionCode}
    />,
  ];

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-8 sm:py-10">
      <div className="w-full max-w-xl">
        {/* Escape hatch for an accidental click into the flow — goes back to
            the list rather than losing progress via the browser's own back
            button, which would also unwind step state unpredictably. */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 mb-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Link to="/pickups">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            All pickups
          </Link>
        </Button>

        <div className="mb-6 text-center">
          <h1 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
            Schedule a Pickup
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{STEP_TITLES[step]}</p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardContent className="pb-6 pt-6">
            <StepIndicator current={step} total={TOTAL_STEPS} />

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <Button type="button" variant="outline" className="flex-1" onClick={goBack} disabled={submitting}>
                  Back
                </Button>
              )}
              <motion.div
                animate={shake ? shakeAnimation : {}}
                transition={shakeTransition}
                className="flex-1"
              >
                {step < TOTAL_STEPS - 1 ? (
                  <Button className="w-full font-semibold" onClick={handleNext}>
                    Continue
                  </Button>
                ) : (
                  <Button className="w-full font-semibold" onClick={handleConfirm} disabled={submitting}>
                    {submitting
                      ? pickupType === "instant" && !redemptionCode.trim()
                        ? "Processing payment…"
                        : "Confirming…"
                      : pickupType === "instant"
                        ? redemptionCode.trim()
                          ? "Confirm Pickup (fee waived)"
                          : `Pay ${formatCurrency(serviceCharge)} & Confirm`
                        : "Confirm Pickup"}
                  </Button>
                )}
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

/* ─── Review step ────────────────────────────────────────────────────────── */
const ReviewStep = ({
  scrapInfo,
  address,
  pickupType,
  selectedDate,
  selectedSlotLabel,
  serviceCharge,
  estimate,
  redemptionCode,
  onRedemptionCodeChange,
}) => (
  <div className="space-y-4">
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/25 p-3.5">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{address?.label}</p>
        <p className="text-xs text-muted-foreground">
          {address?.line}, {address?.city}, {address?.state} {address?.pincode}
        </p>
      </div>
    </div>

    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/25 p-3.5">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {pickupType === "instant" ? "Instant pickup" : formatFriendlyDate(selectedDate)}
        </p>
        <p className="text-xs text-muted-foreground">
          {pickupType === "instant" ? "Collector matched within a few hours" : selectedSlotLabel}
        </p>
      </div>
    </div>

    {scrapInfo.images.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {scrapInfo.images.map((img) => (
          <img key={img.id} src={img.previewUrl} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
        ))}
      </div>
    )}

    <div className="rounded-xl border border-border p-3.5">
      {scrapInfo.categories.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {scrapInfo.categories.map((key) => {
              const category = getCategory(key);
              const Icon = category.icon;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${category.tint}`}
                >
                  <Icon className="h-3 w-3" />
                  {category.label}
                </span>
              );
            })}
          </div>
          {scrapInfo.classificationSource === "ai" && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              AI classification — Estimated
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Category will be identified during pickup.</p>
      )}

      {(scrapInfo.itemCount || scrapInfo.estimatedWeightKg) && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {scrapInfo.itemCount && `${scrapInfo.itemCount} ${Number(scrapInfo.itemCount) === 1 ? "item" : "items"}`}
          {scrapInfo.itemCount && scrapInfo.estimatedWeightKg && " · "}
          {scrapInfo.estimatedWeightKg &&
            `~${formatWeight(Number(scrapInfo.estimatedWeightKg), { decimals: 1 })} estimated`}
        </p>
      )}
      {scrapInfo.notes && <p className="mt-1.5 text-xs text-muted-foreground">"{scrapInfo.notes}"</p>}
    </div>

    {estimate ? (
      <div className="rounded-xl border border-border bg-muted/25 p-3.5">
        <p className="text-sm font-medium text-foreground">
          {/* A single category (or none selected → "others") always prices to
              one exact figure — a "₹6–₹6" range reads like a bug, not a
              guess, so only show a dash-range when the category mix actually
              makes the low/high rate differ. */}
          Estimated value:{" "}
          {estimate.low === estimate.high
            ? formatCurrency(estimate.low)
            : `${formatCurrency(estimate.low)}–${formatCurrency(estimate.high)}`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Based on your estimate — the collector's on-site weigh-in determines the final amount.
        </p>
      </div>
    ) : (
      <p className="text-xs text-muted-foreground">
        No estimate available yet — the collector will determine the value during pickup.
      </p>
    )}

    {pickupType === "instant" && (
      <div className="space-y-1.5">
        <Label htmlFor="pickup-reward-code" className="flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-primary" />
          Have a "Free Priority Pickup" reward code?
        </Label>
        <Input
          id="pickup-reward-code"
          placeholder="ECO-XXXX-XXXX (optional)"
          value={redemptionCode}
          onChange={(e) => onRedemptionCodeChange(e.target.value.toUpperCase())}
          className="font-mono uppercase"
        />
      </div>
    )}

    {serviceCharge > 0 &&
      (redemptionCode.trim() ? (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3.5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Gift className="h-4 w-4" />
            Platform fee waived
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your reward code covers the {formatCurrency(serviceCharge)} instant-pickup fee — no payment needed.
          </p>
        </div>
      ) : (
        <>
          <PriceBreakdownTable lines={[]} totalAmount={0} serviceCharge={serviceCharge} mode="estimate" />
          <p className="text-xs text-muted-foreground">
            You'll be asked to pay this now, via Razorpay, to confirm the instant pickup.
          </p>
        </>
      ))}
  </div>
);

export default BookPickupPage;

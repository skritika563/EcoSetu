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
 *   - Scheduled pickups are free; Instant adds the platform fee from
 *     pricingService.getServiceCharge.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, CheckCircle2, Construction, MapPin, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useShake } from "@/hooks/useShake";
import { getSavedAddresses } from "@/data/pickupData";
import { createPickup } from "@/services/pickupService";
import { estimatePickupValue, getServiceCharge } from "@/services/pricingService";
import { getCategory } from "@/config/domain";
import { formatCurrency, formatFriendlyDate, formatWeight } from "@/lib/format";
import { shakeAnimation, shakeTransition, slideVariants } from "@/lib/animations";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const { shake, triggerShake } = useShake();

  const [scrapInfo, setScrapInfo] = useState(EMPTY_SCRAP_INFO);
  const [addresses, setAddresses] = useState(() => getSavedAddresses(role));
  const [addressId, setAddressId] = useState(() => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id);
  const [pickupType, setPickupType] = useState("scheduled");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

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

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const pickup = await createPickup({
        ownerRole: role,
        customer: { id: user?._id || user?.id, name: user?.name, phone: user?.phone, type: role },
        pickupType,
        pickupAddress: selectedAddress,
        pickupDate: pickupType === "instant" ? new Date().toISOString() : selectedDate,
        pickupTimeSlot: pickupType === "instant" ? "As soon as possible" : selectedSlotId,
        estimatedCategories: scrapInfo.categories,
        itemCount: scrapInfo.itemCount ? Number(scrapInfo.itemCount) : null,
        estimatedWeightKg: scrapInfo.estimatedWeightKg ? Number(scrapInfo.estimatedWeightKg) : null,
        classificationSource: scrapInfo.classificationSource,
        aiPrediction: scrapInfo.aiPrediction,
        imageCount: scrapInfo.images.length,
        notes: scrapInfo.notes.trim() || null,
      });
      setConfirmedPickup(pickup);
      toast.success("Pickup scheduled successfully");
    } catch (err) {
      toast.error(err.message || "Couldn't schedule this pickup. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
    <AddressPicker
      key="address"
      addresses={addresses}
      selectedId={addressId}
      onSelect={setAddressId}
      onAddAddress={(address) => {
        setAddresses((prev) => [...prev, address]);
        setAddressId(address.id);
      }}
    />,
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
      selectedSlotId={selectedSlotId}
      serviceCharge={serviceCharge}
      estimate={estimate}
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
                    {submitting ? "Confirming…" : "Confirm Pickup"}
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
const ReviewStep = ({ scrapInfo, address, pickupType, selectedDate, selectedSlotId, serviceCharge, estimate }) => (
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
          {pickupType === "instant" ? "Collector matched within a few hours" : selectedSlotId}
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
          Estimated value: {formatCurrency(estimate.low)}–{formatCurrency(estimate.high)}
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

    {serviceCharge > 0 && (
      <PriceBreakdownTable lines={[]} totalAmount={0} serviceCharge={serviceCharge} mode="estimate" />
    )}
  </div>
);

export default BookPickupPage;

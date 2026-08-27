/**
 * ScrapVerificationForm — the collector's on-site classification + weighing.
 *
 * BUSINESS RULE (do not weaken): the collector must record every category
 * actually present. The customer's estimate is shown only as read-only
 * context, never pre-filled into the editable rows — confirming it without
 * looking isn't an option. AI classification is an assist that can suggest
 * categories, never weights or a final answer; the collector always enters
 * the real weight themselves.
 *
 * Two modes: entry (add/edit/remove freely) and confirmed (locked, requires
 * an explicit "Edit" tap to change anything) — mirrors the spec's "prevent
 * accidental changes unless an explicit edit action is used."
 *
 * Verification photos: the collector can attach real, on-site proof photos
 * (camera or gallery) via POST /api/pickups/:id/images — tagged
 * `uploadedBy: "collector"` server-side, kept separate from the customer's
 * own booking-time photos (see PickupImageGallery). Uploaded immediately on
 * selection, since the pickup already exists by the time this form renders
 * — unlike the booking flow, there's no "create pickup first" ordering
 * constraint here.
 */

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { VERIFIABLE_CATEGORIES } from "@/data/pricingData";
import { calculatePickupTotal } from "@/services/pricingService";
import { classifyImage } from "@/services/aiService";
import { uploadPickupImages } from "@/services/pickupService";
import { getCategory } from "@/config/domain";
import { formatWeight } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PriceBreakdownTable from "@/components/pickups/PriceBreakdownTable";
import { cn } from "@/lib/utils";

let rowSeq = 0;
const newRow = (category = "", weight = "") => ({ key: `row-${++rowSeq}`, category, weight });

const ScrapVerificationForm = ({
  pickupId,
  images = [],
  onImagesUploaded,
  estimatedCategories = [],
  estimatedWeightKg,
  serviceCharge = 0,
  onConfirm,
  submitting,
}) => {
  const [rows, setRows] = useState([]);
  const [draftCategory, setDraftCategory] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [locked, setLocked] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef(null);

  const verificationImages = images.filter((img) => img.uploadedBy === "collector");

  const handleImageFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const { pickup: updated } = await uploadPickupImages(pickupId, files);
      onImagesUploaded?.(updated);
      toast.success(files.length === 1 ? "Photo added" : `${files.length} photos added`);
    } catch (err) {
      toast.error(err.message || "Couldn't upload the photo. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const usedCategories = rows.map((r) => r.category);
  const availableToAdd = VERIFIABLE_CATEGORIES.filter((c) => !usedCategories.includes(c));

  const { lines, totalAmount } = useMemo(
    () =>
      calculatePickupTotal(
        rows.filter((r) => r.category && Number(r.weight) > 0).map((r) => ({ category: r.category, weight: r.weight }))
      ),
    [rows]
  );

  const addRow = () => {
    if (!draftCategory) {
      toast.error("Select a category to add.");
      return;
    }
    if (!draftWeight || Number(draftWeight) <= 0) {
      toast.error("Enter a weight greater than zero.");
      return;
    }
    setRows((prev) => [...prev, newRow(draftCategory, draftWeight)]);
    setDraftCategory("");
    setDraftWeight("");
  };

  const updateWeight = (key, weight) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, weight } : r)));
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  /**
   * Real Gemini classification (POST /api/ai/classify) against ALL
   * uploaded verification photos, sent together in one call so Gemini
   * reasons across every angle/pile rather than just the most recent shot.
   * Unlike the booking flow, these photos are already real Cloudinary URLs
   * by the time this runs (uploaded immediately on selection — see this
   * file's header comment), so each is re-fetched as a blob and re-sent as
   * a file, rather than the raw File object (which no longer exists
   * client-side once uploaded). Capped to the classify endpoint's own
   * per-request limit (MAX_IMAGES_PER_REQUEST, currently 4) — a pickup can
   * collect up to 8 verification photos total, more than one classify call
   * accepts, so only the most recent ones are sent.
   */
  const runAiAssist = async () => {
    if (verificationImages.length === 0) {
      toast.error("Add a verification photo first — AI needs something to look at.");
      return;
    }
    setClassifying(true);
    try {
      const MAX_CLASSIFY_IMAGES = 4;
      const recentPhotos = verificationImages.slice(-MAX_CLASSIFY_IMAGES);
      const files = await Promise.all(
        recentPhotos.map(async (photo, i) => {
          const imageRes = await fetch(photo.url);
          const blob = await imageRes.blob();
          return new File([blob], `verification-photo-${i}.jpg`, { type: blob.type || "image/jpeg" });
        })
      );

      const result = await classifyImage(files);
      if (!result.classification_possible || result.categories.length === 0) {
        toast.info(result.summary || "AI couldn't confidently identify a category from this photo.");
        return;
      }

      const additions = result.categories
        .filter((c) => !usedCategories.includes(c.category))
        .map((c) => newRow(c.category, ""));

      if (additions.length === 0) {
        toast.info("AI didn't find any new categories to suggest.");
        return;
      }
      setRows((prev) => [...prev, ...additions]);
      toast.info("AI suggested categories added — enter the actual weight for each.");
    } catch (err) {
      toast.error(err.message || "AI classification failed. Please add categories manually.");
    } finally {
      setClassifying(false);
    }
  };

  const handleConfirmWeights = () => {
    if (rows.length === 0) {
      toast.error("Add at least one category before continuing.");
      return;
    }
    if (rows.some((r) => !r.weight || Number(r.weight) <= 0)) {
      toast.error("Every category needs a weight greater than zero.");
      return;
    }
    setLocked(true);
  };

  const handleComplete = () => onConfirm(rows.map((r) => ({ category: r.category, weight: Number(r.weight) })));

  return (
    <div className="space-y-5">
      {/* Customer's estimate — read-only context, never auto-filled */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3.5">
        <p className="text-xs font-medium text-muted-foreground">Customer estimated</p>
        <p className="mt-1 text-sm text-foreground">
          {estimatedCategories.length > 0
            ? estimatedCategories.map((c) => getCategory(c).label).join(", ")
            : "No category provided"}
          {estimatedWeightKg ? ` · ~${formatWeight(estimatedWeightKg, { decimals: 0 })}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          This is only a starting point — record what's actually there.
        </p>
      </div>

      {locked ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Final categories &amp; weights</p>
            <Button size="sm" variant="ghost" onClick={() => setLocked(false)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          <PriceBreakdownTable lines={lines} totalAmount={totalAmount} serviceCharge={serviceCharge} mode="final" />
          <Button className="w-full" onClick={handleComplete} disabled={submitting}>
            {submitting ? "Completing pickup…" : "Complete Pickup"}
          </Button>
        </>
      ) : (
        <>
          {/* Entered rows */}
          {rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((row) => {
                const category = getCategory(row.category);
                const Icon = category.icon;
                return (
                  <li key={row.key} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", category.tint)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {category.label}
                    </span>
                    <div className="relative w-24 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        inputMode="decimal"
                        aria-label={`${category.label} weight in kilograms`}
                        value={row.weight}
                        onChange={(e) => updateWeight(row.key, e.target.value)}
                        className="pr-7"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                        kg
                      </span>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${category.label}`}
                      onClick={() => removeRow(row.key)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add category */}
          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={draftCategory} onValueChange={setDraftCategory}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((key) => (
                    <SelectItem key={key} value={key}>
                      {getCategory(key).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-24 shrink-0">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Weight in kilograms"
                  value={draftWeight}
                  onChange={(e) => setDraftWeight(e.target.value)}
                  className="h-9 pr-7"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  kg
                </span>
              </div>
              <Button size="icon" variant="outline" aria-label="Add category" onClick={addRow} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImages}
            >
              {uploadingImages ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                  Add photo
                </>
              )}
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleImageFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <Button type="button" variant="outline" size="sm" onClick={runAiAssist} disabled={classifying}>
              {classifying ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI-assist classification
                </>
              )}
            </Button>
          </div>

          {verificationImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {verificationImages.map((img) => (
                <a
                  key={img.publicId ?? img.url}
                  href={img.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  <img src={img.url} alt="Verification photo" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <PriceBreakdownTable lines={lines} totalAmount={totalAmount} serviceCharge={serviceCharge} mode="final" />
              <Button className="w-full" onClick={handleConfirmWeights}>
                Confirm Final Weight &amp; Price
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ScrapVerificationForm;

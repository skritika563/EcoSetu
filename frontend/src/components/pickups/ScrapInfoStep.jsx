/**
 * ScrapInfoStep — step 1 of booking: images, category, weight, notes.
 *
 * BUSINESS RULE (do not weaken): scrap category is entirely optional here.
 * The user may upload images, run AI classification, pick categories
 * manually, or skip classification altogether and just say "I have scrap to
 * sell." The collector performs the final, authoritative classification
 * during the actual pickup — nothing chosen on this screen is binding.
 *
 * Layout: one "Category" section with the AI-classify action inline at its
 * top-right, and the category chips directly below — AI results land as
 * selected chips (with a confidence badge) rather than a separate results
 * panel, so there's one place to review and edit, not two.
 *
 * Images are previewed client-side via object URLs while the form is being
 * filled in — the real upload to Cloudinary only happens after the pickup
 * itself is created (there's no pickup id to attach photos to before that),
 * so each entry here keeps the raw File alongside its preview URL; see
 * BookPickupPage.jsx's confirm flow and services/pickupService.js's
 * uploadPickupImages.
 */

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, Sparkles, X } from "lucide-react";

import { VERIFIABLE_CATEGORIES } from "@/data/pricingData";
import { classifyScrapImages } from "@/lib/scrapClassification";
import { getCategory } from "@/config/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 4;

/**
 * Display-only label override for this step: "mixed" reads better as
 * "Others" when it's sitting alongside concrete material chips. Every other
 * screen (breakdown charts, receipts, sustainability) keeps the shared
 * "Mixed Waste" label from config/domain.js — this override is local.
 */
const stepLabel = (key) => (key === "mixed" ? "Others" : getCategory(key).label);

const ScrapInfoStep = ({ value, onChange }) => {
  const { images, categories, aiPrediction, itemCount, estimatedWeightKg, notes } = value;
  const fileInputRef = useRef(null);
  const [classifying, setClassifying] = useState(false);

  const patch = (fields) => onChange({ ...value, ...fields });

  const confidenceFor = (key) =>
    value.classificationSource === "ai" ? aiPrediction?.find((p) => p.category === key)?.confidence : null;

  const handleFiles = (fileList) => {
    const remaining = MAX_IMAGES - images.length;
    const files = Array.from(fileList).slice(0, remaining);
    const added = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file, // kept for the real upload after the pickup is created — not just the preview
      previewUrl: URL.createObjectURL(file),
    }));
    patch({ images: [...images, ...added] });
  };

  const removeImage = (id) => {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    patch({ images: images.filter((img) => img.id !== id) });
  };

  const toggleCategory = (key) => {
    const next = categories.includes(key) ? categories.filter((c) => c !== key) : [...categories, key];
    // A manual edit after an AI run still counts as manual — the confidence
    // badges are for the AI's original picks, not for hand-picked ones.
    patch({ categories: next, classificationSource: "manual", aiPrediction: null });
  };

  const runAiClassification = async () => {
    setClassifying(true);
    try {
      const result = await classifyScrapImages({ imageCount: images.length });
      patch({
        aiPrediction: result,
        categories: result.map((r) => r.category),
        classificationSource: "ai",
      });
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Images */}
      <div>
        <Label className="text-sm font-medium">Photos (optional)</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add a photo or two — it helps AI suggest a category, but it's not required.
        </p>

        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <AnimatePresence initial={false}>
            {images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className="relative h-20 w-20 overflow-hidden rounded-xl border border-border"
              >
                <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <Camera className="h-4.5 w-4.5" />
              <span className="text-[11px]">Add photo</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Category — heading + AI action inline, chips directly below */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm font-medium">Category (optional)</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select what you know, or leave this blank — you can simply say "I have scrap to sell."
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={runAiClassification}
            disabled={classifying}
            className="shrink-0"
          >
            {classifying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Classify
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {VERIFIABLE_CATEGORIES.map((key) => {
            const category = getCategory(key);
            const Icon = category.icon;
            const isSelected = categories.includes(key);
            const confidence = confidenceFor(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {stepLabel(key)}
                {confidence != null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      isSelected ? "bg-primary-foreground/20" : "bg-muted"
                    )}
                  >
                    {confidence}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {value.classificationSource === "ai" ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            AI classification — Estimated. Review and edit before continuing.
          </p>
        ) : categories.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground/80">
            No category selected — the collector will identify everything during pickup.
          </p>
        ) : null}
      </div>

      {/* Number of items + estimated weight */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="item-count" className="text-sm font-medium">
            Number of items
          </Label>
          <Input
            id="item-count"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 5"
            value={itemCount}
            onChange={(e) => patch({ itemCount: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Optional — roughly how many pieces</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estimated-weight" className="text-sm font-medium">
            Estimated weight
          </Label>
          <div className="relative">
            <Input
              id="estimated-weight"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              placeholder="e.g. 10"
              value={estimatedWeightKg}
              onChange={(e) => patch({ estimatedWeightKg: e.target.value })}
              className="pr-9"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              kg
            </span>
          </div>
          <p className="text-xs text-muted-foreground">The collector determines the final weight.</p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="pickup-notes" className="text-sm font-medium">
          Notes (optional)
        </Label>
        <Textarea
          id="pickup-notes"
          placeholder="Gate code, floor number, best time to ring the bell…"
          value={notes}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
};

export default ScrapInfoStep;

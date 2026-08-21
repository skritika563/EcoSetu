/**
 * ListingForm — create / edit a marketplace listing.
 *
 * IMAGE ORDERING (same constraint the pickup booking flow has): a listing
 * must exist before photos can be attached, because the upload endpoint is
 * scoped to a product id. So on CREATE, images selected here are held
 * locally with object-URL previews, the listing is created first, and the
 * files are uploaded immediately after against the new id. On EDIT the
 * listing already exists, so each selection uploads straight away.
 *
 * NO AI ASSIST HERE — there is a real Gemini-backed endpoint on the backend
 * (POST /api/marketplace/ai/listing), but it is deliberately not exposed in
 * this form right now. Reintroducing it is a one-line change
 * (productService.generateListingWithAi already exists) if it's wanted back.
 *
 * PROVENANCE ("collected through an EcoSetu pickup?") is available in BOTH
 * create and edit — a collector should be able to add or correct this link
 * after the fact, not just at creation. Picking a pickup here also
 * auto-fills the category from that pickup's actual verified material (see
 * applySourcePickup below) — still fully editable afterward, the same way
 * an AI suggestion would be, since a pickup's material vocabulary does not
 * map 1:1 onto every marketplace category (see backend
 * productController.PICKUP_TO_PRODUCT_CATEGORY for the exact mapping).
 */

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { CATEGORY_KEYS, CONDITION_KEYS, getCondition, getMarketplaceCategory } from "@/config/marketplace";
import * as productService from "@/services/productService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 8;

/** A small red asterisk next to a Label, marking a field the backend actually requires. */
const Required = () => (
  <span className="ml-0.5 text-destructive" aria-hidden="true">
    *
  </span>
);

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  condition: "",
  material: "",
  price: "",
  quantity: "1",
  unit: "piece",
  weightKg: "",
  city: "",
  area: "",
  state: "",
  pincode: "",
  fulfillmentPickup: true,
  fulfillmentDelivery: false,
  sourcePickupId: "",
};

/** Map a loaded product into the flat shape this form edits. */
const toFormState = (product) => ({
  title: product.title ?? "",
  description: product.description ?? "",
  category: product.category ?? "",
  condition: product.condition ?? "",
  material: product.material ?? "",
  price: String(product.price ?? ""),
  quantity: String(product.quantity ?? "1"),
  unit: product.unit ?? "piece",
  weightKg: product.weightKg != null ? String(product.weightKg) : "",
  city: product.location?.city ?? "",
  area: product.location?.area ?? "",
  state: product.location?.state ?? "",
  pincode: product.location?.pincode ?? "",
  fulfillmentPickup: product.fulfillment?.pickup !== false,
  fulfillmentDelivery: !!product.fulfillment?.delivery,
  // Only ever populated for the owner's own view (see productController's
  // includeSourcePickupId option) — carries the CURRENT linked pickup, if
  // any, into edit mode so the picker below shows what's actually set.
  sourcePickupId: product.sourcePickupId ?? "",
});

const ListingForm = ({ product, onSubmit, submitting, submitLabel = "Publish listing" }) => {
  const isEdit = !!product;

  const [form, setForm] = useState(() => (product ? toFormState(product) : EMPTY_FORM));
  const [localImages, setLocalImages] = useState([]); // create-mode only
  const [savedImages, setSavedImages] = useState(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [eligiblePickups, setEligiblePickups] = useState([]);
  const fileInputRef = useRef(null);

  const patch = (fields) => setForm((prev) => ({ ...prev, ...fields }));

  // Provenance sources: this user's own completed pickups. Empty for anyone
  // who has never collected, which is the correct outcome, not an error —
  // the whole section simply doesn't render.
  useEffect(() => {
    let cancelled = false;
    productService
      .getEligiblePickups()
      .then((pickups) => {
        if (!cancelled) setEligiblePickups(pickups);
      })
      .catch(() => {
        // Non-critical: the form is fully usable without provenance.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Release object URLs when local previews are dropped, so a long editing
  // session doesn't leak blobs.
  useEffect(
    () => () => localImages.forEach((img) => URL.revokeObjectURL(img.previewUrl)),
    [localImages]
  );

  const totalImages = savedImages.length + localImages.length;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, MAX_IMAGES - totalImages);
    if (files.length === 0) return;

    if (isEdit) {
      // The listing exists — upload straight away.
      setUploading(true);
      try {
        const { product: updated } = await productService.uploadProductImages(product.id, files);
        setSavedImages(updated.images);
        toast.success(files.length === 1 ? "Photo added" : `${files.length} photos added`);
      } catch (err) {
        toast.error(err.message || "Couldn't upload the photo.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // Create mode — hold locally until the listing has an id.
    setLocalImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeLocalImage = (id) => {
    setLocalImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const removeSavedImage = async (publicId) => {
    try {
      const updated = await productService.deleteProductImage(product.id, publicId);
      setSavedImages(updated.images);
    } catch (err) {
      toast.error(err.message || "Couldn't remove that image.");
    }
  };

  // Selecting a source pickup auto-fills the category from what that
  // pickup actually contained — still just a starting point, not a lock;
  // the category Select right below stays fully editable afterward.
  const applySourcePickup = (pickupId) => {
    const pickup = eligiblePickups.find((p) => p.id === pickupId);
    patch({
      sourcePickupId: pickupId,
      ...(pickup?.suggestedCategory ? { category: pickup.suggestedCategory } : {}),
    });
  };

  const handleSubmit = (event, status) => {
    event.preventDefault();

    if (!form.title.trim() || form.title.trim().length < 3) return toast.error("Add a title of at least 3 characters.");
    if (!form.description.trim() || form.description.trim().length < 10)
      return toast.error("Add a description of at least 10 characters.");
    if (!form.category) return toast.error("Choose a category.");
    if (!form.condition) return toast.error("Choose a condition.");
    if (form.price === "" || Number(form.price) < 0) return toast.error("Enter a valid price.");
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1)
      return toast.error("Quantity must be a whole number of at least 1.");
    if (!form.city.trim()) return toast.error("Enter the city this item is in.");
    if (!form.fulfillmentPickup && !form.fulfillmentDelivery)
      return toast.error("Offer at least one fulfillment option.");

    onSubmit(
      {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        material: form.material.trim() || null,
        price: Number(form.price),
        quantity: Number(form.quantity),
        unit: form.unit,
        weightKg: form.weightKg === "" ? null : Number(form.weightKg),
        location: {
          city: form.city.trim(),
          area: form.area.trim() || null,
          state: form.state.trim() || null,
          pincode: form.pincode.trim() || null,
        },
        fulfillment: { pickup: form.fulfillmentPickup, delivery: form.fulfillmentDelivery },
        status,
        sourcePickupId: form.sourcePickupId || undefined,
      },
      // Only create mode has files waiting to be uploaded after the fact.
      localImages.map((img) => img.file)
    );
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, "active")} className="space-y-6">
      {/* ── Photos ─────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div>
          <Label className="text-sm font-medium">Photos</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional, but listings with photos sell far more often. Up to {MAX_IMAGES}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {savedImages.map((img) => (
            <div key={img.publicId} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeSavedImage(img.publicId)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {localImages.map((img) => (
            <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeLocalImage(img.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {totalImages < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span className="text-[11px]">Add photo</span>
                </>
              )}
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
      </section>

      {/* ── Details ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <Label htmlFor="listing-title" className="text-sm font-medium">
          Title
          <Required />
        </Label>
        <Input
          id="listing-title"
          placeholder="e.g. Reclaimed teak coffee table"
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
          maxLength={120}
        />

        <div className="space-y-1.5">
          <Label htmlFor="listing-description">
            Description
            <Required />
          </Label>
          <Textarea
            id="listing-description"
            placeholder="Describe the item honestly — condition, size, any damage, where it came from."
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={5}
            maxLength={2000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="listing-category">
              Category
              <Required />
            </Label>
            <Select value={form.category} onValueChange={(v) => patch({ category: v })}>
              <SelectTrigger id="listing-category" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {getMarketplaceCategory(key).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="listing-condition">
              Condition
              <Required />
            </Label>
            <Select value={form.condition} onValueChange={(v) => patch({ condition: v })}>
              <SelectTrigger id="listing-condition" className="w-full">
                <SelectValue placeholder="Choose a condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {getCondition(key).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="listing-material">Material (optional)</Label>
          <Input
            id="listing-material"
            placeholder="e.g. Reclaimed teak, HDPE, Aluminium 6063"
            value={form.material}
            onChange={(e) => patch({ material: e.target.value })}
          />
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="listing-price">
            Price (₹)
            <Required />
          </Label>
          <Input
            id="listing-price"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder="0"
            value={form.price}
            onChange={(e) => patch({ price: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="listing-unit">Sold by</Label>
          <Select value={form.unit} onValueChange={(v) => patch({ unit: v })}>
            <SelectTrigger id="listing-unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="piece">Per piece</SelectItem>
              <SelectItem value="kg">Per kg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="listing-quantity">
            {form.unit === "kg" ? "Available (kg)" : "Quantity"}
            <Required />
          </Label>
          <Input
            id="listing-quantity"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.quantity}
            onChange={(e) => patch({ quantity: e.target.value })}
          />
        </div>
      </section>

      {/* ── Location ───────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="listing-city">
            City
            <Required />
          </Label>
          <Input
            id="listing-city"
            placeholder="e.g. Bengaluru"
            value={form.city}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-area">Area (optional)</Label>
          <Input
            id="listing-area"
            placeholder="e.g. Indiranagar"
            value={form.area}
            onChange={(e) => patch({ area: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-state">State (optional)</Label>
          <Input
            id="listing-state"
            value={form.state}
            onChange={(e) => patch({ state: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-pincode">PIN code (optional)</Label>
          <Input
            id="listing-pincode"
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(e) => patch({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          />
        </div>
      </section>

      {/* ── Fulfillment + impact ───────────────────────────────────────── */}
      <section className="space-y-3">
        <Label className="text-sm font-medium">How can buyers get this?</Label>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Buyer pickup</p>
            <p className="mt-0.5 text-xs text-muted-foreground">They collect from your location</p>
          </div>
          <Switch
            checked={form.fulfillmentPickup}
            onCheckedChange={(v) => patch({ fulfillmentPickup: v })}
            aria-label="Offer buyer pickup"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Delivery</p>
            <p className="mt-0.5 text-xs text-muted-foreground">You arrange delivery to the buyer</p>
          </div>
          <Switch
            checked={form.fulfillmentDelivery}
            onCheckedChange={(v) => patch({ fulfillmentDelivery: v })}
            aria-label="Offer delivery"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="listing-weight">Approximate weight in kg (optional)</Label>
          <Input
            id="listing-weight"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            placeholder="e.g. 18"
            value={form.weightKg}
            onChange={(e) => patch({ weightKg: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Counts toward the material you've given a second life once this sells.
          </p>
        </div>
      </section>

      {/* ── Provenance — only for users who actually have completed pickups.
          Shown in BOTH create and edit, so a collector can add or correct
          this link after the fact, not just at creation. */}
      {eligiblePickups.length > 0 && (
        <section className="space-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.04] p-3.5">
          <Label htmlFor="listing-source">Collected through an EcoSetu pickup? (optional)</Label>
          <Select value={form.sourcePickupId} onValueChange={applySourcePickup}>
            <SelectTrigger id="listing-source" className="w-full">
              <SelectValue placeholder="Not from a pickup" />
            </SelectTrigger>
            <SelectContent>
              {eligiblePickups.map((pickup) => (
                <SelectItem key={pickup.id} value={pickup.id}>
                  {pickup.categories.join(", ") || "Pickup"} · {pickup.totalWeightKg} kg
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Linking a completed pickup earns this listing the "EcoSetu Verified" badge and fills in a
            matching category for you — still fully editable above. Buyers can see the material came
            through our own collection chain.
          </p>
        </section>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" className="flex-1 font-semibold" disabled={submitting || uploading}>
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
        {!isEdit && (
          <Button
            type="button"
            variant="outline"
            className={cn("flex-1")}
            disabled={submitting || uploading}
            onClick={(e) => handleSubmit(e, "draft")}
          >
            Save as draft
          </Button>
        )}
      </div>
    </form>
  );
};

export default ListingForm;

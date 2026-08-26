/**
 * CampaignForm — create / edit a campaign. Organization role only (route
 * and backend both enforce this; the form itself doesn't re-check).
 *
 * TYPE FIRST, LIKE BookPickupPage's OWN STEPS: the campaign type is chosen
 * before anything else, in its own section of big selectable cards — the
 * same pattern config/roles.js's SIGNUP_ROLE_OPTIONS cards already use for
 * "pick one of these, everything below adapts." Everything past that
 * section stays hidden until a type is picked, and which fields show
 * afterward genuinely changes with the choice: a Waste Collection or
 * Cleaning Drive asks for material categories and a weight target; a
 * Plantation Drive asks for a sapling target instead; an Awareness
 * Campaign or Exhibition asks for an expected stall count instead — never
 * all of them at once for every type, which is what "categories/weight
 * required for a plantation drive" would otherwise force.
 *
 * BANNER UPLOAD mirrors ListingForm.jsx's image-upload discipline: on
 * CREATE, a selected banner is held as a local object-URL preview and
 * uploaded to Cloudinary immediately after the campaign is created (there's
 * no campaign id to attach it to beforehand). On EDIT, selecting a new
 * banner uploads straight away and replaces the old one.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { CAMPAIGN_CATEGORY_KEYS, CAMPAIGN_TYPE_KEYS, getCampaignCategory, getCampaignType, isCollectionCampaignType } from "@/config/campaigns";
import {
  WasteCollectionArt,
  CleaningDriveArt,
  PlantationDriveArt,
  AwarenessCampaignArt,
  ExhibitionArt,
  OtherArt,
} from "@/components/campaigns/CampaignTypeArt";
import * as campaignService from "@/services/campaignService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const Required = () => (
  <span className="ml-0.5 text-destructive" aria-hidden="true">
    *
  </span>
);

const toDateInputValue = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "");

const EMPTY_FORM = {
  campaignType: "",
  customTypeLabel: "",
  categories: [],
  name: "",
  description: "",
  city: "",
  area: "",
  line: "",
  state: "",
  pincode: "",
  startDate: "",
  endDate: "",
  targetWeightKg: "",
  targetParticipants: "",
  targetSaplings: "",
  expectedStalls: "",
  requiresApproval: false,
};

const toFormState = (campaign) => ({
  campaignType: campaign.campaignType ?? "",
  customTypeLabel: campaign.customTypeLabel ?? "",
  categories: campaign.categories ?? [],
  name: campaign.name ?? "",
  description: campaign.description ?? "",
  city: campaign.location?.city ?? "",
  area: campaign.location?.area ?? "",
  line: campaign.location?.line ?? "",
  state: campaign.location?.state ?? "",
  pincode: campaign.location?.pincode ?? "",
  startDate: toDateInputValue(campaign.startDate),
  endDate: toDateInputValue(campaign.endDate),
  targetWeightKg: campaign.targetWeightKg ? String(campaign.targetWeightKg) : "",
  targetParticipants: campaign.targetParticipants != null ? String(campaign.targetParticipants) : "",
  targetSaplings: campaign.targetSaplings != null ? String(campaign.targetSaplings) : "",
  expectedStalls: campaign.expectedStalls != null ? String(campaign.expectedStalls) : "",
  requiresApproval: !!campaign.requiresApproval,
});

/** Campaign type key → its illustration (see CampaignTypeArt.jsx). */
const TYPE_ART = {
  waste_collection: WasteCollectionArt,
  cleaning_drive: CleaningDriveArt,
  plantation_drive: PlantationDriveArt,
  awareness_campaign: AwarenessCampaignArt,
  exhibition: ExhibitionArt,
  other: OtherArt,
};

/**
 * The type-picker cards — mirrors config/roles.js's SIGNUP_ROLE_OPTIONS
 * "pick one, big and visual" pattern, but with a bigger hand-drawn
 * illustration per type (CampaignTypeArt.jsx) instead of a small tinted
 * icon chip. Each card also carries its own soft background wash
 * (config/campaigns.js's per-type `cardBg`, built from the brand tokens),
 * resting subtly and deepening a touch on hover, so six cards in a row are
 * distinguishable at a glance without any one of them shouting — and each
 * card lifts gently too.
 */
const TypeSelector = ({ value, onChange, disabled }) => (
  <div className="grid gap-3 sm:grid-cols-3">
    {CAMPAIGN_TYPE_KEYS.map((key) => {
      const type = getCampaignType(key);
      const Art = TYPE_ART[key] ?? WasteCollectionArt;
      const active = value === key;
      return (
        <motion.button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          aria-pressed={active}
          whileHover={disabled ? undefined : { y: -4 }}
          whileTap={disabled ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "group flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
            type.cardBg,
            active ? "border-primary shadow-sm ring-2 ring-primary/20" : "border-border hover:border-primary/30 hover:shadow-sm"
          )}
        >
          <span className="h-16 w-16 shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Art />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{type.label}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{type.description}</span>
          </span>
        </motion.button>
      );
    })}
  </div>
);

/** Multi-select material chips — toggles keys in/out of the categories array. */
const CategoryToggles = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {CAMPAIGN_CATEGORY_KEYS.map((key) => {
      const cat = getCampaignCategory(key);
      const Icon = cat.icon;
      const active = value.includes(key);
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(active ? value.filter((k) => k !== key) : [...value, key])}
          aria-pressed={active}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {cat.label}
        </button>
      );
    })}
  </div>
);

const CampaignForm = ({ campaign, onSubmit, submitting, submitLabel = "Publish campaign" }) => {
  const isEdit = !!campaign;

  const [form, setForm] = useState(() => (campaign ? toFormState(campaign) : EMPTY_FORM));
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(campaign?.bannerImage?.url ?? null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState(null);

  const patch = (fields) => setForm((prev) => ({ ...prev, ...fields }));
  const isCollectionType = isCollectionCampaignType(form.campaignType);

  useEffect(() => () => {
    if (bannerPreview && bannerFile) URL.revokeObjectURL(bannerPreview);
  }, [bannerPreview, bannerFile]);

  const handleBannerSelect = async (file) => {
    if (!file) return;
    setBannerError(null);

    if (isEdit) {
      setUploadingBanner(true);
      try {
        const updated = await campaignService.uploadCampaignBanner(campaign.id, file);
        setBannerPreview(updated.bannerImage?.url ?? null);
        setBannerFile(null);
        toast.success("Banner uploaded");
      } catch (err) {
        setBannerError(err.message || "Couldn't upload the banner.");
        toast.error(err.message || "Couldn't upload the banner.");
      } finally {
        setUploadingBanner(false);
      }
      return;
    }

    // Create mode — held locally until the campaign has an id.
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (event, status) => {
    event.preventDefault();

    if (!form.campaignType) return toast.error("Choose what kind of campaign this is.");
    if (form.campaignType === "other" && !form.customTypeLabel.trim()) {
      return toast.error("Give this custom campaign type a short name.");
    }
    if (!form.name.trim() || form.name.trim().length < 3) return toast.error("Campaign name must be at least 3 characters.");
    if (!form.description.trim() || form.description.trim().length < 10)
      return toast.error("Description must be at least 10 characters.");
    if (isCollectionType && form.categories.length === 0) return toast.error("Choose at least one material category.");
    if (!form.city.trim()) return toast.error("Enter the city this campaign is in.");
    if (!form.startDate || !form.endDate) return toast.error("Start and end dates are required.");
    if (new Date(form.endDate) < new Date(form.startDate)) return toast.error("End date must be on or after the start date.");
    if (isCollectionType && (form.targetWeightKg === "" || Number(form.targetWeightKg) < 0)) {
      return toast.error("Enter a valid target weight (0 or more).");
    }

    onSubmit(
      {
        campaignType: form.campaignType,
        customTypeLabel: form.campaignType === "other" ? form.customTypeLabel.trim() : null,
        categories: isCollectionType ? form.categories : [],
        name: form.name.trim(),
        description: form.description.trim(),
        location: {
          line: form.line.trim() || null,
          area: form.area.trim() || null,
          city: form.city.trim(),
          state: form.state.trim() || null,
          pincode: form.pincode.trim() || null,
        },
        startDate: form.startDate,
        endDate: form.endDate,
        targetWeightKg: isCollectionType ? Number(form.targetWeightKg) : 0,
        targetParticipants: form.targetParticipants === "" ? null : Number(form.targetParticipants),
        targetSaplings: form.campaignType === "plantation_drive" && form.targetSaplings !== "" ? Number(form.targetSaplings) : null,
        expectedStalls:
          ["awareness_campaign", "exhibition"].includes(form.campaignType) && form.expectedStalls !== ""
            ? Number(form.expectedStalls)
            : null,
        requiresApproval: form.requiresApproval,
        status,
      },
      // Only create mode has a banner file waiting to be uploaded after the fact.
      bannerFile
    );
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, "active")} className="space-y-6">
      {/* ── Type — chosen first, everything below adapts to it ──────────── */}
      <section className="space-y-2">
        <Label className="text-sm font-medium">
          What kind of campaign is this?
          <Required />
        </Label>
        {/* Locked once created — switching a published drive's type after
            the fact would strand whatever participants/collection already
            exist against fields that no longer apply to it. */}
        <TypeSelector value={form.campaignType} onChange={(v) => patch({ campaignType: v })} disabled={isEdit} />
        {isEdit && <p className="text-xs text-muted-foreground">Campaign type can't be changed after creation.</p>}
      </section>

      {!form.campaignType ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Choose a campaign type above to continue.
        </p>
      ) : (
        <>
          {/* ── Banner ─────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <Label className="text-sm font-medium">Banner image</Label>
            <p className="-mt-1 text-xs text-muted-foreground">Optional, but campaigns with a banner get far more attention.</p>

            <div className="relative flex aspect-[21/9] w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
              {bannerPreview ? (
                <>
                  <img src={bannerPreview} alt="" className="h-full w-full object-cover" />
                  {uploadingBanner && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBannerPreview(null);
                      setBannerFile(null);
                    }}
                    aria-label="Remove banner"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1.5 text-muted-foreground">
                  {uploadingBanner ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <span className="text-xs font-medium">{uploadingBanner ? "Uploading…" : "Add a banner image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBanner}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleBannerSelect(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {bannerError && <p className="text-xs text-destructive">{bannerError}</p>}
          </section>

          {/* ── Basic info ─────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">
                Campaign name
                <Required />
              </Label>
              <Input
                id="campaign-name"
                placeholder="e.g. Campus E-Waste Collection Drive"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                maxLength={140}
              />
            </div>

            {form.campaignType === "other" && (
              <div className="space-y-1.5">
                <Label htmlFor="campaign-custom-type">
                  What kind of campaign is this, in a few words?
                  <Required />
                </Label>
                <Input
                  id="campaign-custom-type"
                  placeholder="e.g. Bake Sale Fundraiser"
                  value={form.customTypeLabel}
                  onChange={(e) => patch({ customTypeLabel: e.target.value })}
                  maxLength={80}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="campaign-description">
                Description
                <Required />
              </Label>
              <Textarea
                id="campaign-description"
                placeholder="What is this campaign about, and what should participants expect?"
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={5}
                maxLength={3000}
              />
            </div>
          </section>

          {/* ── Materials — collection-type drives only ───────────────── */}
          {isCollectionType && (
            <section className="space-y-1.5">
              <Label>
                Material categories
                <Required />
              </Label>
              <p className="-mt-1 text-xs text-muted-foreground">Select every material this drive collects — you can pick more than one.</p>
              <CategoryToggles value={form.categories} onChange={(v) => patch({ categories: v })} />
            </section>
          )}

          {/* ── Schedule ───────────────────────────────────────────────── */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-start">
                Start date
                <Required />
              </Label>
              <Input id="campaign-start" type="date" value={form.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-end">
                End date
                <Required />
              </Label>
              <Input id="campaign-end" type="date" value={form.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
            </div>
          </section>

          {/* ── Location ───────────────────────────────────────────────── */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="campaign-line">Address line (optional)</Label>
              <Input
                id="campaign-line"
                placeholder="e.g. Main Gate Collection Point"
                value={form.line}
                onChange={(e) => patch({ line: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-city">
                City
                <Required />
              </Label>
              <Input id="campaign-city" placeholder="e.g. Bengaluru" value={form.city} onChange={(e) => patch({ city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-area">Area (optional)</Label>
              <Input id="campaign-area" placeholder="e.g. Indiranagar" value={form.area} onChange={(e) => patch({ area: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-state">State (optional)</Label>
              <Input id="campaign-state" value={form.state} onChange={(e) => patch({ state: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-pincode">PIN code (optional)</Label>
              <Input
                id="campaign-pincode"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => patch({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              />
            </div>
          </section>

          {/* ── Targets — shape depends entirely on the chosen type ─────── */}
          <section className="grid gap-4 sm:grid-cols-2">
            {isCollectionType && (
              <div className="space-y-1.5">
                <Label htmlFor="campaign-target-weight">
                  Target weight (kg)
                  <Required />
                </Label>
                <Input
                  id="campaign-target-weight"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={form.targetWeightKg}
                  onChange={(e) => patch({ targetWeightKg: e.target.value })}
                />
              </div>
            )}
            {form.campaignType === "plantation_drive" && (
              <div className="space-y-1.5">
                <Label htmlFor="campaign-target-saplings">Target saplings (optional)</Label>
                <Input
                  id="campaign-target-saplings"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  value={form.targetSaplings}
                  onChange={(e) => patch({ targetSaplings: e.target.value })}
                />
              </div>
            )}
            {["awareness_campaign", "exhibition"].includes(form.campaignType) && (
              <div className="space-y-1.5">
                <Label htmlFor="campaign-expected-stalls">Expected stalls (optional)</Label>
                <Input
                  id="campaign-expected-stalls"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 15"
                  value={form.expectedStalls}
                  onChange={(e) => patch({ expectedStalls: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="campaign-target-participants">Target participants (optional)</Label>
              <Input
                id="campaign-target-participants"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.targetParticipants}
                onChange={(e) => patch({ targetParticipants: e.target.value })}
              />
            </div>
          </section>

          {/* ── Approval ───────────────────────────────────────────────── */}
          <section className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Require approval to join</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                When on, people who join are held as "registered" until you approve them. Volunteers always need approval either way.
              </p>
            </div>
            <Switch checked={form.requiresApproval} onCheckedChange={(v) => patch({ requiresApproval: v })} aria-label="Require approval to join" />
          </section>

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" className="flex-1 font-semibold" disabled={submitting || uploadingBanner}>
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
                className="flex-1"
                disabled={submitting || uploadingBanner}
                onClick={(e) => handleSubmit(e, "draft")}
              >
                Save as draft
              </Button>
            )}
          </div>
        </>
      )}
    </form>
  );
};

export default CampaignForm;

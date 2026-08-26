/**
 * CollectionPanel — Collection Statistics + a way to log material collected
 * on-site during the drive.
 *
 * Every number here is server-derived: recordCollection sends only
 * {category, weightKg} — the running total, the log itself, and the
 * category breakdown are all maintained by the backend, never computed or
 * trusted from anything client-side.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import * as campaignService from "@/services/campaignService";
import { formatFriendlyDate, formatWeight } from "@/lib/format";
import { getCategory } from "@/config/domain";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProgressBar from "@/components/common/ProgressBar";
import EmptyState from "@/components/common/EmptyState";

// Pickup.CATEGORIES on the backend — the same recycling-material vocabulary
// used for scrap pickups, reused here rather than inventing a third list.
const MATERIAL_CATEGORIES = ["plastic", "metal", "paper", "cardboard", "glass", "e-waste", "mixed"];

const CollectionPanel = ({ campaign, onRecorded }) => {
  const [category, setCategory] = useState("plastic");
  const [weightKg, setWeightKg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const weight = Number(weightKg);
    if (!weightKg || Number.isNaN(weight) || weight <= 0) {
      toast.error("Enter a weight greater than zero.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await campaignService.recordCollection(campaign.id, { category, weightKg: weight });
      onRecorded(updated);
      setWeightKg("");
      toast.success("Collection recorded");
    } catch (err) {
      toast.error(err.message || "Couldn't record this collection.");
    } finally {
      setSubmitting(false);
    }
  };

  const percent = campaign.targetWeightKg > 0 ? Math.min(100, Math.round((campaign.collectedWeightKg / campaign.targetWeightKg) * 100)) : 0;
  const log = campaign.collectionLog ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Total collected</span>
          <span className="tabular-nums text-muted-foreground">{percent}%</span>
        </div>
        <p className="mt-1 font-heading text-xl font-semibold text-foreground">
          {formatWeight(campaign.collectedWeightKg)}
          {campaign.targetWeightKg > 0 && <span className="text-sm font-normal text-muted-foreground"> / {formatWeight(campaign.targetWeightKg)} target</span>}
        </p>
        {campaign.targetWeightKg > 0 && <ProgressBar value={campaign.collectedWeightKg} max={campaign.targetWeightKg} className="mt-3" label="Collection progress" />}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[140px] flex-1 space-y-1.5">
          <Label htmlFor="collection-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="collection-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_CATEGORIES.map((key) => (
                <SelectItem key={key} value={key}>
                  {getCategory(key).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[120px] flex-1 space-y-1.5">
          <Label htmlFor="collection-weight">Weight (kg)</Label>
          <Input id="collection-weight" type="number" min="0" step="0.1" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          {submitting ? "Recording…" : "Record collection"}
        </Button>
      </form>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Collection log</h3>
        {log.length === 0 ? (
          <EmptyState title="Nothing logged yet" description="Entries you record above will appear here." className="py-8" />
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-foreground">{getCategory(entry.category).label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatWeight(entry.weightKg)} · {formatFriendlyDate(entry.recordedAt)}
                  {entry.source === "pickup" && <span className="ml-1.5 text-[11px] text-primary">(from a linked pickup)</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPanel;

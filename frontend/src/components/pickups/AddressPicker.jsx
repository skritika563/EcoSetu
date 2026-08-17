/**
 * AddressPicker — step 2 of booking: select a saved address or add a new one.
 *
 * No real Google Maps integration yet (per spec) — a polished static map
 * placeholder stands in for it, clearly labelled as a preview.
 */

import { useState } from "react";
import { Check, MapPin, Plus } from "lucide-react";

import { PHONE_PATTERN, digitsOnly } from "@/lib/profile";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMPTY_ADDRESS = {
  label: "",
  line: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  contactPhone: "",
};

const AddAddressDialog = ({ open, onOpenChange, onSave }) => {
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.label.trim() || !form.line.trim() || !form.city.trim()) {
      toast.error("Please fill in the label, address line and city.");
      return;
    }
    if (!form.pincode.trim() || form.pincode.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit PIN code.");
      return;
    }
    if (!PHONE_PATTERN.test(form.contactPhone)) {
      toast.error("Please enter a valid 10-digit contact number.");
      return;
    }

    // The real id comes back from the server (POST /api/addresses) — this
    // dialog no longer invents one.
    setSaving(true);
    try {
      await onSave(form);
      setForm(EMPTY_ADDRESS);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new address</DialogTitle>
          <DialogDescription>Where should the collector come?</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addr-label">Label</Label>
              <Input
                id="addr-label"
                placeholder="Home, Office…"
                value={form.label}
                onChange={(e) => update("label", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-phone">Contact number</Label>
              <Input
                id="addr-phone"
                inputMode="numeric"
                placeholder="9876543210"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", digitsOnly(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addr-line">Address line</Label>
            <Input
              id="addr-line"
              placeholder="Flat / House no., street"
              value={form.line}
              onChange={(e) => update("line", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addr-city">City</Label>
              <Input id="addr-city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-state">State</Label>
              <Input id="addr-state" value={form.state} onChange={(e) => update("state", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addr-pincode">PIN code</Label>
              <Input
                id="addr-pincode"
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => update("pincode", digitsOnly(e.target.value, 6))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-landmark">Landmark (optional)</Label>
              <Input id="addr-landmark" value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddressPicker = ({ addresses, selectedId, onSelect, onAddAddress }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const selected = addresses.find((a) => a.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {addresses.map((address) => {
          const isSelected = address.id === selectedId;
          return (
            <button
              key={address.id}
              type="button"
              onClick={() => onSelect(address.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{address.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {address.line}, {address.city}, {address.state} {address.pincode}
                </p>
                {address.landmark && (
                  <p className="text-xs text-muted-foreground/80">{address.landmark}</p>
                )}
              </div>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}

        <Button variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add new address
        </Button>
      </div>

      {/* Mock map preview — no live Google Maps integration yet */}
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <MapPin className="mx-auto h-6 w-6 text-muted-foreground/60" />
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {selected ? `Map preview — ${selected.city}` : "Select an address to preview it here"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          Live map view is coming soon
        </p>
      </div>

      <AddAddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={async (address) => {
          await onAddAddress(address);
          toast.success("Address saved");
        }}
      />
    </div>
  );
};

export default AddressPicker;

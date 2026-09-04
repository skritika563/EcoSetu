/**
 * AddressPicker — step 2 of booking: select a saved address or add a new one.
 *
 * Real map integration (LocationIQ geocoding/reverse-geocoding + Leaflet via
 * MapView — see components/map/MapView.jsx): typing a 6-digit PIN code
 * auto-fills city/state, and "Pick on map" lets the user drop a pin whose
 * coordinates get reverse-geocoded into the same fields. Either path — or
 * neither, if the user just types everything by hand — produces a valid
 * address; coordinates are optional polish, not a requirement.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { PHONE_PATTERN, digitsOnly } from "@/lib/profile";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import * as locationService from "@/services/locationService";
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
import MapView from "@/components/map/MapView";

const EMPTY_ADDRESS = {
  label: "",
  line: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  contactPhone: "",
  coordinates: null,
};

/**
 * Add AND edit share this one dialog/form — `editingAddress` (null when
 * adding) seeds the form with the existing values, including any saved
 * coordinates, so "Pick on map" starts centered on the pin already there
 * instead of the world view. This is also the ONLY way an address that
 * predates coordinates (or was typed by hand without ever touching the map)
 * can pick one up afterward — there's no separate "add a pin" flow.
 */
const AddressFormDialog = ({ open, onOpenChange, editingAddress, onSave }) => {
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  // Re-seed the form every time the dialog opens — for "edit", from the
  // address being edited (its exact fields, not a stale previous session's
  // leftovers); for "add", back to blank. Keyed on `open` (not mounted
  // fresh each time) since this one dialog instance is reused for every
  // address row's edit button.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(
      editingAddress
        ? {
            label: editingAddress.label || "",
            line: editingAddress.line || "",
            city: editingAddress.city || "",
            state: editingAddress.state || "",
            pincode: editingAddress.pincode || "",
            landmark: editingAddress.landmark || "",
            contactPhone: editingAddress.contactPhone || "",
            coordinates: editingAddress.coordinates || null,
          }
        : EMPTY_ADDRESS
    );
    setMapOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingAddress?.id]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Set right after a map pin (or "use my location") fills the form, so the
  // pincode-driven lookup effect below doesn't immediately re-fire and
  // overwrite the map's more precise coordinates with a pincode's rougher
  // centroid the moment its own debounce catches up.
  const skipNextPincodeLookup = useRef(false);

  const applyResolvedLocation = (result) => {
    if (!result) {
      toast.error("Couldn't find an address at that location.");
      return;
    }
    skipNextPincodeLookup.current = true;
    setForm((prev) => ({
      ...prev,
      city: result.city || prev.city,
      state: result.state || prev.state,
      pincode: result.pincode || prev.pincode,
      coordinates: { lat: result.lat, lng: result.lng },
    }));
  };

  // PIN code → city/state autofill. Only fills fields the user hasn't
  // already typed something into — never overwrites a manual entry.
  const debouncedPincode = useDebouncedValue(form.pincode, 500);
  useEffect(() => {
    if (debouncedPincode.trim().length !== 6) return;
    if (skipNextPincodeLookup.current) {
      skipNextPincodeLookup.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await locationService.geocode(debouncedPincode);
        if (cancelled || !result) return;
        setForm((prev) => ({
          ...prev,
          city: prev.city.trim() ? prev.city : result.city || prev.city,
          state: prev.state.trim() ? prev.state : result.state || prev.state,
          coordinates: prev.coordinates || { lat: result.lat, lng: result.lng },
        }));
      } catch {
        // Silent — PIN autofill is a convenience, not a required step; the
        // user can still fill city/state by hand.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedPincode]);

  const handleMapClick = async ({ lat, lng }) => {
    try {
      const result = await locationService.reverseGeocode(lat, lng);
      applyResolvedLocation(result || { lat, lng, city: null, state: null, pincode: null });
    } catch (err) {
      toast.error(err.message || "Couldn't look up that location.");
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const result = await locationService.reverseGeocode(lat, lng);
          applyResolvedLocation(result || { lat, lng, city: null, state: null, pincode: null });
          setMapOpen(true);
        } catch (err) {
          toast.error(err.message || "Couldn't look up your location.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.error("Couldn't access your location. Check your browser's location permission.");
        setLocating(false);
      }
    );
  };

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
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingAddress ? "Edit address" : "Add a new address"}</DialogTitle>
          <DialogDescription>
            {editingAddress ? "Update the details, or pin it on the map." : "Where should the collector come?"}
          </DialogDescription>
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
                placeholder="Auto-fills city & state"
                value={form.pincode}
                onChange={(e) => update("pincode", digitsOnly(e.target.value, 6))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-landmark">Landmark (optional)</Label>
              <Input id="addr-landmark" value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setMapOpen((v) => !v)}>
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                {mapOpen ? "Hide map" : form.coordinates ? "Adjust pin on map" : "Pick on map"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleUseMyLocation} disabled={locating}>
                <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                {locating ? "Locating…" : "Use my location"}
              </Button>
            </div>

            {mapOpen && (
              <div className="space-y-1.5">
                {/* Keyed on which address is being edited (or "new") so
                    switching between "Add new address" and editing a
                    different saved one always mounts a fresh Leaflet
                    instance — this one dialog is reused across both, and
                    Leaflet's own DOM/measurements are never something React
                    should try to reuse across a different target address. */}
                <MapView
                  key={editingAddress?.id ?? "new"}
                  className="h-56"
                  center={form.coordinates ? [form.coordinates.lat, form.coordinates.lng] : undefined}
                  markers={form.coordinates ? [{ position: [form.coordinates.lat, form.coordinates.lng], type: "picker" }] : []}
                  onLocationSelect={handleMapClick}
                  fitToMarkers={false}
                  zoom={form.coordinates ? 15 : 5}
                />
                <p className="text-[11px] text-muted-foreground">Tap anywhere on the map to drop a pin there.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editingAddress ? "Save changes" : "Save address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddressPicker = ({ addresses, selectedId, onSelect, onAddAddress, onEditAddress }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  // null while adding; the address object being edited otherwise. Also
  // doubles as which mode the shared dialog is in.
  const [editingAddress, setEditingAddress] = useState(null);
  const selected = addresses.find((a) => a.id === selectedId);

  const openAddDialog = () => {
    setEditingAddress(null);
    setDialogOpen(true);
  };
  const openEditDialog = (address) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {addresses.map((address) => {
          const isSelected = address.id === selectedId;
          return (
            <div
              key={address.id}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/40"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(address.id)}
                aria-pressed={isSelected}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
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
              </button>
              {isSelected && <Check className="mt-2.5 h-4 w-4 shrink-0 text-primary" />}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${address.label}`}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => openEditDialog(address)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        <Button variant="outline" className="w-full" onClick={openAddDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add new address
        </Button>
      </div>

      {selected?.coordinates ? (
        <MapView
          className="h-40"
          center={[selected.coordinates.lat, selected.coordinates.lng]}
          markers={[{ position: [selected.coordinates.lat, selected.coordinates.lng], type: "destination" }]}
          fitToMarkers={false}
          zoom={15}
        />
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {selected ? `No pinned location for ${selected.label}` : "Select an address to preview it here"}
          </p>
          {selected && (
            <Button variant="link" size="sm" className="mt-0.5 h-auto p-0 text-xs" onClick={() => openEditDialog(selected)}>
              Pin it on the map
            </Button>
          )}
        </div>
      )}

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingAddress={editingAddress}
        onSave={async (address) => {
          if (editingAddress) {
            await onEditAddress(editingAddress.id, address);
            toast.success("Address updated");
          } else {
            await onAddAddress(address);
            toast.success("Address saved");
          }
        }}
      />
    </div>
  );
};

export default AddressPicker;

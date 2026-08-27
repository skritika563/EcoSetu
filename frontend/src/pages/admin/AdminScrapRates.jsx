/**
 * AdminScrapRates — manage base scrap prices per kg across all 13 canonical categories.
 */
import { useState, useEffect, useCallback } from "react";
import { Scale, Edit2, Check, X, AlertCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import * as adminService from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/admin/EmptyState";

const AdminScrapRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.listScrapRates();
      setRates(data || []);
    } catch (err) {
      setError(err.message || "Failed to load scrap rates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleStartEdit = (rate) => {
    setEditingId(rate.id);
    setEditPrice(String(rate.pricePerKg));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice("");
  };

  const handleSaveRate = async (id) => {
    const num = parseFloat(editPrice);
    if (isNaN(num) || num < 0) {
      alert("Please enter a valid non-negative price per kg.");
      return;
    }

    try {
      setSaving(true);
      const res = await adminService.updateScrapRate(id, num);
      setRates((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, pricePerKg: res.pricePerKg, lastUpdated: res.lastUpdated } : r
        )
      );
      setEditingId(null);
      setEditPrice("");
    } catch (err) {
      alert(err.message || "Failed to update scrap rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Scrap Rate Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure platform base payout rates (₹/kg) across all scrap categories
        </p>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <Scale className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Price Source of Truth</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These rates determine the default estimated and verified scrap payout values. Changes
            take effect immediately for future pickup valuations while preserving historical
            pricing for completed pickups.
          </p>
        </div>
      </div>

      {/* Rates Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : rates.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No rates found"
          description="Initialize or seed the ScrapRate collection in your database."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="hidden border-b border-border/40 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[1.5fr_1fr_1fr_1.2fr_120px]">
            <span>Material Category</span>
            <span>Current Rate (₹/kg)</span>
            <span>Unit</span>
            <span>Last Updated</span>
            <span className="text-right">Action</span>
          </div>

          {rates.map((rate) => {
            const isEditing = editingId === rate.id;

            return (
              <div
                key={rate.id}
                className="grid items-center gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition hover:bg-muted/20 last:border-b-0 md:grid-cols-[1.5fr_1fr_1fr_1.2fr_120px]"
              >
                {/* Category Name */}
                <div>
                  <p className="font-semibold text-foreground">{rate.displayName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{rate.category}</p>
                </div>

                {/* Price / Edit Input */}
                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="h-8 w-24 text-sm"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className="font-heading font-bold text-foreground">
                      ₹{rate.pricePerKg} / kg
                    </span>
                  )}
                </div>

                {/* Unit */}
                <p className="text-muted-foreground">{rate.unit || "kg"}</p>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground">
                  <p>{rate.lastUpdated ? format(new Date(rate.lastUpdated), "MMM d, yyyy") : "—"}</p>
                  {rate.updatedBy && <p className="text-[11px]">by {rate.updatedBy}</p>}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-1.5">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleSaveRate(rate.id)}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => handleStartEdit(rate)}
                    >
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminScrapRates;

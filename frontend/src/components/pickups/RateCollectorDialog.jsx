/**
 * RateCollectorDialog — star rating + optional review after a completed pickup.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const RateCollectorDialog = ({ open, onOpenChange, collectorName, onSubmit, submitting }) => {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = async () => {
    if (stars === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    await onSubmit(stars, review.trim());
    toast.success("Thanks for your feedback!");
    onOpenChange(false);
    setStars(0);
    setReview("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate your collector</DialogTitle>
          <DialogDescription>How was your pickup experience with {collectorName}?</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 py-2" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={stars === value}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStars(value)}
              className="p-1"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hovered || stars) >= value ? "fill-current text-amber-500" : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder="How was your pickup experience? (optional)"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={3}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateCollectorDialog;

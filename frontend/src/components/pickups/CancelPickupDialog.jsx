/**
 * CancelPickupDialog — confirm + reason, shared by the pickup list and the
 * Pickup Details page so cancellation only has one implementation.
 */

import { useState } from "react";

import { formatFriendlyDate } from "@/lib/format";
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

const CancelPickupDialog = ({ pickup, onOpenChange, onConfirm, submitting }) => {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={!!pickup} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel this pickup?</DialogTitle>
          <DialogDescription>
            {pickup?.id} · {pickup && formatFriendlyDate(pickup.pickupDate)}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason for cancelling (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep pickup
          </Button>
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={() => {
              onConfirm(reason.trim() || "Cancelled by user");
              setReason("");
            }}
          >
            {submitting ? "Cancelling…" : "Cancel pickup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelPickupDialog;

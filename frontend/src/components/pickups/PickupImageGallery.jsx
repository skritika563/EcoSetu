/**
 * PickupImageGallery — the pickup's real, uploaded photos (Cloudinary URLs
 * — see services/imageUploadService.js on the backend), shown on both the
 * household/organization's Pickup Details page and the collector's Job
 * Details page. Read-only here.
 *
 * Two sources can both be present: the customer's photos from booking time,
 * and the collector's on-site verification photos (see ScrapVerificationForm
 * for where those get uploaded). Grouped into two labelled rows when both
 * exist, so it's always clear whose photo is whose — one unlabelled row
 * would blur "what the customer thinks they have" with "what's actually
 * there," which is exactly the distinction the rest of this app is careful
 * to keep visible (see ScrapVerificationForm's own header comment).
 *
 * Thumbnails are deliberately small — a quick visual reference alongside the
 * rest of the pickup's details, not the page's main content — with a
 * tap-to-enlarge dialog for a closer look when needed.
 *
 * Renders nothing at all for pickups with no photos (most pickups, and every
 * pickup booked before this feature existed) rather than adding a "no
 * photos" empty state where none existed before.
 */

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const ImageRow = ({ label, images, onOpen }) => (
  <div>
    <p className="mb-2 text-xs font-medium text-muted-foreground">
      {label} ({images.length})
    </p>
    <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        <button
          key={img.publicId ?? img.url}
          type="button"
          onClick={() => onOpen(img.url)}
          aria-label="View photo enlarged"
          className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-90 sm:h-24 sm:w-24"
        >
          <img src={img.url} alt="Scrap photo" className="h-full w-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  </div>
);

const PickupImageGallery = ({ images = [], className }) => {
  const [openUrl, setOpenUrl] = useState(null);

  if (images.length === 0) return null;

  const customerImages = images.filter((img) => img.uploadedBy !== "collector");
  const collectorImages = images.filter((img) => img.uploadedBy === "collector");
  const showBothLabels = customerImages.length > 0 && collectorImages.length > 0;

  return (
    <div className={className}>
      <div className="space-y-3">
        {customerImages.length > 0 && (
          <ImageRow
            label={showBothLabels ? "Customer photos" : "Photos"}
            images={customerImages}
            onOpen={setOpenUrl}
          />
        )}
        {collectorImages.length > 0 && (
          <ImageRow label="Collector verification photos" images={collectorImages} onOpen={setOpenUrl} />
        )}
      </div>

      <Dialog open={!!openUrl} onOpenChange={(open) => !open && setOpenUrl(null)}>
        <DialogContent className="max-w-lg p-2 sm:max-w-xl">
          <DialogTitle className="sr-only">Scrap photo, enlarged</DialogTitle>
          {openUrl && (
            <img src={openUrl} alt="Scrap photo, enlarged" className="max-h-[70vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PickupImageGallery;

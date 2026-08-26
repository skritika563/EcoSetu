/**
 * GalleryPanel — owner-only upload/preview/delete for a campaign's photo
 * gallery. Real Cloudinary uploads throughout (services/campaignService.js),
 * same discipline as the marketplace listing image manager.
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, X } from "lucide-react";

import * as campaignService from "@/services/campaignService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MAX_IMAGES = 20;

const GalleryPanel = ({ campaign, onChanged }) => {
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const gallery = campaign.gallery ?? [];

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, MAX_IMAGES - gallery.length);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const updated = await campaignService.uploadCampaignGalleryImages(campaign.id, files);
      onChanged(updated);
      toast.success(files.length === 1 ? "Photo added" : `${files.length} photos added`);
    } catch (err) {
      toast.error(err.message || "Couldn't upload the photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const updated = await campaignService.deleteCampaignGalleryImage(campaign.id, deleteTarget.id);
      onChanged(updated);
      toast.success("Photo removed");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Couldn't remove this photo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Participants can see this gallery on the campaign page. Up to {MAX_IMAGES} photos.</p>

      <div className="flex flex-wrap gap-2.5">
        {gallery.map((img) => (
          <div key={img.id} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-border">
            <img src={img.url} alt={img.caption ?? ""} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setDeleteTarget(img)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {gallery.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Camera className="h-4 w-4" />
                <span className="text-[11px]">Add photos</span>
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this photo?</DialogTitle>
            <DialogDescription>It will no longer appear in the campaign gallery.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryPanel;

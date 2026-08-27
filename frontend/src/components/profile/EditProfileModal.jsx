import { useState, useEffect, useRef } from "react";
import { Camera, Loader2, User, Phone, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadProfileImage } from "@/services/userService";
import { getInitials } from "@/lib/format";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EditProfileModal = ({ open, onOpenChange, initialProfile, onSuccess }) => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  // Tracks the currently-live blob URL (if any) so it can be revoked the
  // moment it's replaced or no longer needed — URL.createObjectURL() leaks
  // memory until explicitly revoked; nothing else does this automatically.
  const objectUrlRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const revokeTrackedObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  // Populate form when modal opens or initialProfile changes
  useEffect(() => {
    if (open) {
      // A previous open may have left a picked-but-unsaved blob preview
      // around — drop it before loading the real source image.
      revokeTrackedObjectUrl();
      const source = initialProfile || user || {};
      setFormData({
        name: source.name || "",
        phone: source.phone || "",
        bio: source.bio || "",
        street: source.address?.street || "",
        city: source.address?.city || "",
        state: source.address?.state || "",
        pincode: source.address?.pincode || "",
      });
      setPreviewUrl(source.profileImage || null);
      setSelectedFile(null);
    }
    // Revoke on unmount too, in case the component goes away with a
    // picked-but-unsaved file still selected.
    return revokeTrackedObjectUrl;
  }, [open, initialProfile, user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be 5MB or smaller.");
      return;
    }

    // Replacing a previous local pick — revoke its blob URL before creating
    // the next one so repeated selections don't leak.
    revokeTrackedObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      toast.error("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (formData.bio && formData.bio.trim().length > 300) {
      toast.error("Bio cannot exceed 300 characters.");
      return;
    }

    setSaving(true);
    let uploadedImageUrl = null;

    try {
      // 1. Upload avatar image if a new file was chosen. This is its own
      // request against its own endpoint (POST /users/upload-avatar) — once
      // it succeeds, the new avatar is already persisted server-side,
      // independent of whether step 2 below goes on to succeed or fail.
      if (selectedFile) {
        const uploadRes = await uploadProfileImage(selectedFile);
        uploadedImageUrl = uploadRes.profileImage;
        // Reflect it immediately: if the text-field update below fails, the
        // avatar change must not be lost from view or silently misreported
        // as "nothing happened" — it really did happen.
        if (updateUser) updateUser({ profileImage: uploadedImageUrl });
        // The real (Cloudinary) URL is now available — swap the preview
        // over to it and release the local blob immediately rather than
        // leaving it dangling (un-revoked) until this modal next opens.
        revokeTrackedObjectUrl();
        setPreviewUrl(uploadedImageUrl);
        // It's already saved server-side — clear the pending local file so
        // a retry (after a text-field-only failure below) doesn't upload
        // the same image a second time.
        setSelectedFile(null);
      }

      // 2. Update text fields
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        bio: formData.bio.trim() || null,
        address: {
          street: formData.street.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          pincode: formData.pincode.trim() || null,
        },
      };

      const profileRes = await updateProfile(payload);
      const updatedUser = profileRes.user;

      // 3. Sync AuthContext state with the rest of the saved fields.
      if (updateUser) {
        updateUser({
          ...updatedUser,
          ...(uploadedImageUrl ? { profileImage: uploadedImageUrl } : {}),
        });
      }

      toast.success("Profile updated successfully!");
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Profile update error:", err);
      // The avatar (if one was picked) may have already saved successfully
      // above even though this catch fired for the text-field update — say
      // so explicitly rather than implying the whole save failed.
      toast.error(
        uploadedImageUrl
          ? "Your new photo was saved, but the rest of your profile couldn't be updated. Please try again."
          : err.message || "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const bioLength = formData.bio ? formData.bio.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your public avatar, bio, contact phone, and location details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-border shadow-sm">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} alt="Avatar preview" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {getInitials(formData.name || "User")}
                </AvatarFallback>
              </Avatar>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 focus:outline-none"
                aria-label="Upload photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Click the camera icon to upload a profile picture (max 5MB)
            </p>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="flex items-center gap-1.5 text-xs font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Your full name"
              maxLength={100}
              required
            />
          </div>

          {/* Bio Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-bio" className="flex items-center gap-1.5 text-xs font-medium">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Bio
              </Label>
              <span className={`text-[11px] ${bioLength > 300 ? "text-destructive" : "text-muted-foreground"}`}>
                {bioLength}/300
              </span>
            </div>
            <Textarea
              id="edit-bio"
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Tell others a little about yourself or your recycling goals..."
              rows={3}
              maxLength={300}
              className="resize-none text-sm"
            />
          </div>

          {/* Phone Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="flex items-center gap-1.5 text-xs font-medium">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Mobile Phone
            </Label>
            <Input
              id="edit-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="10-digit mobile number (e.g. 9876543210)"
              maxLength={10}
            />
          </div>

          {/* Address Fields */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Location & Address
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-street" className="text-[11px] text-muted-foreground">Street / Area</Label>
                <Input
                  id="edit-street"
                  value={formData.street}
                  onChange={(e) => handleChange("street", e.target.value)}
                  placeholder="Street or house number"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-city" className="text-[11px] text-muted-foreground">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="City"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-state" className="text-[11px] text-muted-foreground">State</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="State"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-pincode" className="text-[11px] text-muted-foreground">Pincode</Label>
                <Input
                  id="edit-pincode"
                  value={formData.pincode}
                  onChange={(e) => handleChange("pincode", e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;

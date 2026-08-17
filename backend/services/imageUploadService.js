const { cloudinary } = require("../config/cloudinary");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Image Upload Service — Cloudinary
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The only place that talks to Cloudinary directly. Credentials
 * (config/cloudinary.js) never leave the backend — this service is the sole
 * caller of the SDK; nothing here is ever sent to the frontend except the
 * resulting secure URL.
 *
 * Pickup images live under a predictable folder per pickup
 * (ecosetu/pickups/{pickupId}), so a pickup's photos can always be found or
 * cleaned up from its id alone, without scanning a flat root folder — and
 * without anything in the path identifying the uploading user.
 */

const uploadImageBuffer = (buffer, { folder, publicId }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        // publicId is kept (not just the URL) — it's the only way to delete
        // or replace this exact asset later. See models/Pickup.js.
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

/**
 * Best-effort delete. Used to roll back a Cloudinary upload when the
 * MongoDB save that was supposed to persist it fails right after (see
 * pickupController.uploadPickupImages), and available for future "remove
 * image" / "delete pickup" flows. Never throws — a failed cleanup here must
 * never mask the original error that triggered it.
 */
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
};

module.exports = { uploadImageBuffer, deleteImage };

const multer = require("multer");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Upload Middleware — multipart image uploads
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Memory storage only — files are never written to disk. Each buffer is
 * streamed straight to Cloudinary by whichever controller uses this (see
 * pickupController.uploadPickupImages + services/imageUploadService.js).
 *
 * Validation (type, size, count) happens here, before anything reaches
 * Cloudinary or the database, and errors come back in the app's standard
 * {success:false, message, error:{code}} shape rather than falling through
 * to the generic 500 handler with a raw multer error code.
 */

const MAX_IMAGES_PER_REQUEST = 4;
// A pickup can now collect photos from TWO sources — the customer's at
// booking time and the collector's during on-site verification — so the
// per-pickup ceiling is deliberately higher than what any single request
// can send at once.
const MAX_IMAGES_PER_PICKUP = 8;
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WEBP and GIF images are allowed.`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_IMAGES_PER_REQUEST,
  },
});

/**
 * Wraps multer's `.array(fieldName, N)` so its errors (oversized file, too
 * many files, rejected type) come back as a normal 400 VALIDATION_ERROR
 * instead of an uncaught error bubbling to the generic 500 handler.
 */
const uploadImages = (fieldName = "images") => (req, res, next) => {
  upload.array(fieldName, MAX_IMAGES_PER_REQUEST)(req, res, (err) => {
    if (!err) return next();

    let message = "Invalid image upload.";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = `Each image must be ${MAX_FILE_SIZE_MB}MB or smaller.`;
    } else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `You can upload up to ${MAX_IMAGES_PER_REQUEST} images at a time.`;
    } else if (err.message) {
      message = err.message;
    }

    return res.status(400).json({ success: false, message, error: { code: "VALIDATION_ERROR" } });
  });
};

module.exports = {
  uploadImages,
  MAX_IMAGES_PER_REQUEST,
  MAX_IMAGES_PER_PICKUP,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
};

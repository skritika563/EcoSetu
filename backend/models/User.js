const mongoose = require("mongoose");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * User Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Stores all platform users: household, organization, collector, admin.
 * Linked to Firebase Auth via firebaseUid.
 *
 * Source: DATABASE_SCHEMA.md §3.1
 */

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    pincode: { type: String, default: null },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // ── Firebase Link ─────────────────────────────────────────────────────
    firebaseUid: {
      type: String,
      required: [true, "Firebase UID is required"],
      unique: true,
    },

    // ── Profile ───────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: function (value) {
          if (value == null || value === "") return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "Phone must be a valid 10-digit Indian mobile number",
      },
    },
    profileImage: {
      type: String,
      default: null, // Cloudinary URL
    },

    // ── Role ──────────────────────────────────────────────────────────────
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: ["household", "organization", "collector", "admin"],
        message: "Role must be household, organization, collector, or admin",
      },
    },
    organizationType: {
      type: String,
      enum: {
        values: ["ngo", "school", "university"],
        message: "Organization type must be ngo, school, or university",
      },
      default: null,
      // Required only when role is "organization"
      validate: {
        validator: function (value) {
          if (this.role === "organization" && !value) return false;
          if (this.role !== "organization" && value) return false;
          return true;
        },
        message:
          "organizationType is required for organization role and must not be set for other roles",
      },
    },

    // ── Address ───────────────────────────────────────────────────────────
    address: {
      type: addressSchema,
      default: () => ({}),
    },

    // ── Status ────────────────────────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false, // Admin-verified (primarily for collectors)
    },
    isActive: {
      type: Boolean,
      default: true, // Soft-delete / suspension flag
    },

    // ── Aggregated Stats ──────────────────────────────────────────────────
    totalPickups: { type: Number, default: 0 },
    totalWeightRecycled: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }, // Collector: pickup earnings
    totalMarketplaceRevenue: { type: Number, default: 0 }, // Collector: marketplace sales

    // ── Payment ───────────────────────────────────────────────────────────
    razorpayContactId: { type: String, default: null },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ role: 1, organizationType: 1 });
userSchema.index({ isVerified: 1, role: 1 });
userSchema.index({ "address.city": 1 });
userSchema.index({ isActive: 1 });

// ── Instance Method: Return safe public profile ───────────────────────────────
userSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);

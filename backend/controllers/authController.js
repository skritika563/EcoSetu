const User = require("../models/User");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Handles user registration, login sync, profile retrieval, and logout.
 * All endpoints require a verified Firebase ID token (via verifyFirebaseToken).
 *
 * Source: API_SPEC.md §3.1
 */

/** Public roles allowed via POST /api/auth/register */
const PUBLIC_ROLES = ["household", "organization", "collector"];

/**
 * Parse ADMIN_EMAILS env var into a lowercase Set for allowlist checks.
 * Never exposed to the frontend.
 */
const getAdminEmailAllowlist = () => {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
};

const isAdminEmail = (email) => {
  if (!email) return false;
  return getAdminEmailAllowlist().has(email.trim().toLowerCase());
};

/**
 * POST /api/auth/register
 *
 * Creates a MongoDB user document for a newly registered Firebase user.
 * The Firebase user must already exist (created by the client SDK).
 *
 * Request body: { name, role, organizationType?, phone?, address? }
 * Response: 201 with the created user profile
 */
const register = async (req, res) => {
  try {
    const { uid, email } = req.firebaseUser;
    const { name, role, organizationType, phone, address } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: "Name and role are required.",
        error: {
          code: "VALIDATION_ERROR",
          details: [
            ...(!name ? ["name is required"] : []),
            ...(!role ? ["role is required"] : []),
          ],
        },
      });
    }

    if (role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be created through public registration.",
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${PUBLIC_ROLES.join(", ")}`,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    if (role === "organization") {
      const validOrgTypes = ["ngo", "school", "university"];
      if (!organizationType || !validOrgTypes.includes(organizationType)) {
        return res.status(400).json({
          success: false,
          message: `organizationType is required for organization role. Must be one of: ${validOrgTypes.join(", ")}`,
          error: { code: "VALIDATION_ERROR" },
        });
      }
    }

    // ── Check if user already exists ────────────────────────────────────
    const existingUser = await User.findOne({
      $or: [{ firebaseUid: uid }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        error: { code: "CONFLICT" },
      });
    }

    // ── Create user document ────────────────────────────────────────────
    const user = await User.create({
      firebaseUid: uid,
      email,
      name,
      role,
      organizationType: role === "organization" ? organizationType : undefined,
      phone: phone || undefined,
      address: address || undefined,
    });

    console.log(`✅ User registered: ${email} (${role})`);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user.toPublicProfile(),
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        error: { code: "CONFLICT" },
      });
    }

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during registration.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/auth/login
 *
 * Syncs a Firebase authentication session with the MongoDB user profile.
 * Finds the user by Firebase UID and returns their full profile.
 *
 * No request body needed — the Firebase token provides the identity.
 * Response: 200 with the user profile
 */
const login = async (req, res) => {
  try {
    const { uid, email } = req.firebaseUser;

    // ── Find the user ───────────────────────────────────────────────────
    const user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found. Please register first.",
        error: { code: "NOT_FOUND" },
      });
    }

    // ── Check if account is active ──────────────────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support.",
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: user.toPublicProfile(),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/auth/bootstrap-admin
 *
 * Creates the MongoDB admin profile for a Firebase user whose verified email
 * is listed in the server-side ADMIN_EMAILS allowlist.
 *
 * Identity (firebaseUid, email) comes from the verified token — not the body.
 * Request body: { name? } — optional display name override
 */
const bootstrapAdmin = async (req, res) => {
  try {
    const { uid, email, name: tokenName } = req.firebaseUser;
    const { name: bodyName } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Verified email is required to bootstrap an admin account.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    if (!isAdminEmail(email)) {
      return res.status(403).json({
        success: false,
        message: "This email is not authorized for admin bootstrap.",
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    const existingUser = await User.findOne({
      $or: [{ firebaseUid: uid }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        error: { code: "CONFLICT" },
      });
    }

    const name =
      (bodyName && bodyName.trim()) ||
      (tokenName && tokenName.trim()) ||
      email.split("@")[0];

    const user = await User.create({
      firebaseUid: uid,
      email,
      name,
      role: "admin",
    });

    console.log(`✅ Admin bootstrapped: ${email}`);

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: user.toPublicProfile(),
    });
  } catch (error) {
    console.error("Admin bootstrap error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        error: { code: "CONFLICT" },
      });
    }

    if (error.name === "ValidationError") {
      const details = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during admin bootstrap.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/auth/me
 *
 * Returns the profile of the currently authenticated user.
 * Uses the attachUser middleware to load the user document.
 *
 * Response: 200 with the user profile
 */
const getMe = async (req, res) => {
  try {
    // req.user is set by the attachUser middleware
    return res.status(200).json({
      success: true,
      message: "User profile retrieved",
      data: req.user.toPublicProfile(),
    });
  } catch (error) {
    console.error("GetMe error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/auth/logout
 *
 * Clears any server-side session artifacts.
 * The actual Firebase session is managed client-side by signOut().
 *
 * Response: 200 with success message
 */
const logout = async (req, res) => {
  try {
    // Clear any cookies if they were set
    res.clearCookie("token", { httpOnly: true });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during logout.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  register,
  login,
  bootstrapAdmin,
  getMe,
  logout,
};

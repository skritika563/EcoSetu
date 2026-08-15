const { admin } = require("../config/firebase");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth Middleware — Firebase Token Verification
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Verifies the Firebase ID token from the Authorization header.
 * On success, attaches the decoded token to req.firebaseUser.
 *
 * Expected header:  Authorization: Bearer <firebase_id_token>
 *
 * The decoded token contains:
 *   - uid:   Firebase user ID
 *   - email: User's email
 *   - ...other Firebase claims
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No authentication token provided.",
        error: { code: "UNAUTHORIZED" },
      });
    }

    // Extract the token after "Bearer "
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Malformed authentication token.",
        error: { code: "UNAUTHORIZED" },
      });
    }

    // Verify the token using Firebase Admin SDK
    // This checks the token's signature, expiration, and issuer
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach the decoded token to the request object
    // Controllers can access req.firebaseUser.uid, req.firebaseUser.email, etc.
    req.firebaseUser = decodedToken;

    next();
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);

    // Handle specific Firebase auth errors
    if (
      error.code === "auth/id-token-expired" ||
      error.code === "auth/argument-error"
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired. Please log in again.",
        error: { code: "UNAUTHORIZED" },
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
      error: { code: "UNAUTHORIZED" },
    });
  }
};

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Role Authorization Middleware
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Checks if the authenticated user's role is in the list of allowed roles.
 * Must be used AFTER verifyFirebaseToken and a middleware that attaches req.user.
 *
 * Usage:
 *   router.get("/admin/users", verifyFirebaseToken, attachUser, authorizeRoles("admin"), handler)
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
        error: { code: "UNAUTHORIZED" },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}.`,
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    next();
  };
};

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Attach User Middleware
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Finds the MongoDB user document by Firebase UID and attaches it to req.user.
 * Must be used AFTER verifyFirebaseToken.
 *
 * This is separated from verifyFirebaseToken so that auth routes
 * (register, login) can handle user lookup differently.
 */
const User = require("../models/User");

const attachUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found. Please register first.",
        error: { code: "NOT_FOUND" },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support.",
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Attach user failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading user profile.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  verifyFirebaseToken,
  authorizeRoles,
  attachUser,
};

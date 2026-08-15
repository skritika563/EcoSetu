/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Axios API Instance
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS FILE DOES:
 * --------------------
 * Creates a pre-configured Axios instance that ALL API calls go through.
 * Instead of writing `axios.get("http://localhost:5000/api/pickups")` everywhere,
 * you just write `api.get("/pickups")`.
 *
 * THREE KEY THINGS IT DOES:
 *
 * 1. BASE URL
 *    Every request automatically starts with "http://localhost:5000/api"
 *    so you only write the endpoint path (e.g., "/pickups", "/auth/register")
 *
 * 2. REQUEST INTERCEPTOR (runs BEFORE every request is sent)
 *    - Gets the currently logged-in user from Firebase Auth
 *    - Calls user.getIdToken() to get a fresh JWT token
 *    - Attaches it as: Authorization: Bearer <token>
 *    - Your backend's verifyFirebaseToken() middleware reads this token
 *      and verifies it with Firebase Admin SDK
 *
 *    WHY getIdToken()?
 *    Firebase tokens expire after 1 hour. getIdToken() is smart —
 *    it returns the cached token if it's still valid, or automatically
 *    refreshes it if expired. So you never have to worry about token
 *    refresh logic yourself.
 *
 * 3. RESPONSE INTERCEPTOR (runs AFTER every response comes back)
 *    - If the response is successful (2xx), it passes through unchanged
 *    - If there's an error (4xx/5xx), it extracts the error message
 *      from your backend's standard error format:
 *      { success: false, message: "Human readable error", error: { code: "..." } }
 *    - Creates a clean, consistent error object for your components to use
 *
 * THE FULL FLOW:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ Component calls: api.get("/pickups")                        │
 * │     ↓                                                       │
 * │ REQUEST INTERCEPTOR runs:                                   │
 * │   - Gets Firebase user                                      │
 * │   - Gets fresh token                                        │
 * │   - Adds header: Authorization: Bearer eyJhbGci...          │
 * │     ↓                                                       │
 * │ Axios sends: GET http://localhost:5000/api/pickups           │
 * │   with Authorization header                                 │
 * │     ↓                                                       │
 * │ Backend receives request:                                   │
 * │   - verifyFirebaseToken() middleware reads the token         │
 * │   - Calls Firebase Admin SDK to verify it                   │
 * │   - Extracts user info (uid, email)                         │
 * │   - Finds user in MongoDB                                   │
 * │   - Attaches user to req.user                               │
 * │   - Passes to controller                                    │
 * │     ↓                                                       │
 * │ RESPONSE INTERCEPTOR runs:                                  │
 * │   - Success? → returns data                                 │
 * │   - Error? → extracts message, creates clean error          │
 * └──────────────────────────────────────────────────────────────┘
 */

import axios from "axios";
import { auth } from "@/config/firebase";

// ─── Create Axios Instance ──────────────────────────────────────────────────
// This creates a custom Axios instance with our base settings.
// All API calls in the app will use this instance (not raw `axios`).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 15000, // 15 seconds — if the server doesn't respond, abort
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor ────────────────────────────────────────────────────
// This function runs BEFORE every outgoing request.
// Its job: attach the Firebase auth token so the backend knows who you are.
api.interceptors.request.use(
  async (config) => {
    try {
      // auth.currentUser is the Firebase user object if someone is logged in,
      // or null if no one is logged in.
      const user = auth.currentUser;

      if (user) {
        // getIdToken() returns a JWT string like "eyJhbGciOi..."
        // The `true` parameter would force a refresh, but we don't need that —
        // Firebase automatically refreshes expired tokens.
        const token = await user.getIdToken();

        // Set the Authorization header in the format your backend expects:
        // Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // If token fetch fails (e.g., user signed out mid-request), 
      // we still send the request — the backend will return 401
      console.error("Failed to get auth token:", error);
    }

    return config;
  },
  (error) => {
    // This catches errors in the interceptor itself (rare)
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ───────────────────────────────────────────────────
// This function runs AFTER every response comes back.
// Its job: normalize errors into a consistent format for components.
api.interceptors.response.use(
  // Success handler — just pass the response through
  (response) => response,

  // Error handler — extract meaningful error info
  (error) => {
    // Build a clean error object that components can easily use
    const customError = {
      // The error message from your backend, or a fallback
      message:
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred",

      // HTTP status code (401, 403, 404, 500, etc.)
      status: error.response?.status || 500,

      // The error code string from your backend (e.g., "FORBIDDEN_ROLE")
      code: error.response?.data?.error?.code || "UNKNOWN_ERROR",

      // Any validation details
      details: error.response?.data?.error?.details || [],
    };

    // Special case: if token is expired or invalid, Firebase returned 401
    // You might want to sign the user out and redirect to login
    if (customError.status === 401) {
      console.warn("Authentication failed — token may be expired");
      // We'll handle this in AuthContext later (e.g., force logout)
    }

    return Promise.reject(customError);
  }
);

export default api;

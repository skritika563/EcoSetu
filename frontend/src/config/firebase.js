/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Firebase Client SDK Initialization
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THIS FILE DOES:
 * --------------------
 * This initializes the Firebase CLIENT SDK in your React app.
 *
 * IMPORTANT DISTINCTION:
 * - Your BACKEND uses Firebase ADMIN SDK (firebase-admin) → can verify tokens,
 *   manage users, bypass security rules. Uses a service account JSON file.
 * - Your FRONTEND uses Firebase CLIENT SDK (firebase) → can sign up users,
 *   log them in, get ID tokens. Uses the public config below.
 *
 * The config values (apiKey, authDomain, etc.) are PUBLIC — they are safe
 * to include in frontend code. They identify your Firebase project but
 * cannot be used to access your data without proper auth.
 *
 * HOW IT WORKS:
 * 1. initializeApp() creates a Firebase app instance using your project config
 * 2. getAuth() returns the Auth service tied to that app instance
 * 3. We export `auth` so other files (AuthContext, services) can use it
 *    to call signInWithEmailAndPassword(), createUserWithEmailAndPassword(), etc.
 *
 * ENV VARS (from frontend/.env):
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 *
 * In Vite, environment variables must be prefixed with VITE_ to be
 * accessible in client-side code via import.meta.env.VITE_*
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// ─── Firebase Configuration ─────────────────────────────────────────────────
// These values come from your Firebase Console → Project Settings → Web App
// They are read from the .env file at build time by Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ─── Initialize Firebase ────────────────────────────────────────────────────
// This creates a Firebase App instance. Think of it as "connecting" your
// React app to your Firebase project. You only do this once.
const app = initializeApp(firebaseConfig);

// ─── Get Auth Instance ──────────────────────────────────────────────────────
// getAuth() returns the Firebase Authentication service for this app.
// This is the object you'll use to:
//   - auth.createUserWithEmailAndPassword(email, password)  → Sign up
//   - auth.signInWithEmailAndPassword(email, password)      → Log in
//   - auth.signOut()                                        → Log out
//   - auth.onAuthStateChanged(callback)                     → Listen for auth changes
//   - auth.currentUser.getIdToken()                         → Get JWT token for API calls
const auth = getAuth(app);

export { app, auth };

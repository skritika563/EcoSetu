/**
 * Auth Context Provider — central auth state for the React app.
 *
 * Firebase handles authentication; MongoDB (via backend) holds profiles/roles.
 * onAuthStateChanged is the single path for restoring backend profiles on refresh.
 */

import { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "@/config/firebase";
import api from "@/services/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const toFirebaseSummary = (firebaseUser) =>
  firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      }
    : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prevents onAuthStateChanged from duplicating backend calls during register/bootstrap
  const suppressProfileSync = useRef(false);

  const isAuthenticated = !!user;
  const isFirebaseAuthenticated = !!firebaseUser;
  const role = user?.role || null;

  const loadUserProfile = async (firebaseUser) => {
    setFirebaseUser(toFirebaseSummary(firebaseUser));

    try {
      const response = await api.post("/auth/login");
      setUser(response.data.data);
      setNeedsProfile(false);
      setError(null);
    } catch (err) {
      if (err.status === 404 && err.code === "NOT_FOUND") {
        setUser(null);
        setNeedsProfile(true);
        setError(null);
        return;
      }

      console.error("Failed to fetch user profile:", err);
      setUser(null);
      setNeedsProfile(false);
      setError(err.message || "Failed to load user profile");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (suppressProfileSync.current) {
        return;
      }

      if (firebaseUser) {
        await loadUserProfile(firebaseUser);
      } else {
        setUser(null);
        setFirebaseUser(null);
        setNeedsProfile(false);
        setError(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password, profileData) => {
    suppressProfileSync.current = true;
    setLoading(true);
    setError(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      const response = await api.post("/auth/register", {
        name: profileData.name,
        role: profileData.role,
        organizationType: profileData.organizationType || undefined,
        phone: profileData.phone || undefined,
        address: profileData.address || undefined,
      });

      setUser(response.data.data);
      setFirebaseUser(toFirebaseSummary(auth.currentUser));
      setNeedsProfile(false);
      return response.data.data;
    } catch (err) {
      let errorMessage = err.message || "Registration failed";

      if (err.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password must be at least 6 characters";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      suppressProfileSync.current = false;
      setLoading(false);
    }
  };

  /** Complete MongoDB profile for an existing Firebase user (no new Firebase account). */
  const completeProfile = async (profileData) => {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to complete your profile");
    }

    suppressProfileSync.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/register", {
        name: profileData.name,
        role: profileData.role,
        organizationType: profileData.organizationType || undefined,
        phone: profileData.phone || undefined,
        address: profileData.address || undefined,
      });

      setUser(response.data.data);
      setFirebaseUser(toFirebaseSummary(auth.currentUser));
      setNeedsProfile(false);
      return response.data.data;
    } catch (err) {
      const errorMessage = err.message || "Profile completion failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      suppressProfileSync.current = false;
      setLoading(false);
    }
  };

  /** Bootstrap MongoDB admin profile for allowlisted Firebase admin (server-side ADMIN_EMAILS). */
  const bootstrapAdmin = async (name) => {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to bootstrap an admin account");
    }

    suppressProfileSync.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/bootstrap-admin", {
        name: name || undefined,
      });

      setUser(response.data.data);
      setFirebaseUser(toFirebaseSummary(auth.currentUser));
      setNeedsProfile(false);
      return response.data.data;
    } catch (err) {
      const errorMessage = err.message || "Admin bootstrap failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      suppressProfileSync.current = false;
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Profile load is handled once by onAuthStateChanged
    } catch (err) {
      setLoading(false);

      let errorMessage = err.message || "Login failed";

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        errorMessage = "Invalid email or password";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);

    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      // Profile load is handled once by onAuthStateChanged
    } catch (err) {
      setLoading(false);

      let errorMessage = err.message || "Google sign-in failed";

      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled";
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setNeedsProfile(false);
      setError(null);
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to log out");
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    firebaseUser,
    role,
    isAuthenticated,
    isFirebaseAuthenticated,
    needsProfile,
    loading,
    error,
    login,
    loginWithGoogle,
    register,
    completeProfile,
    bootstrapAdmin,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;

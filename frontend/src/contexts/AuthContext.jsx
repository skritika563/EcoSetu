/**
 * Auth Context Provider — central auth state for the React app.
 *
 * Firebase handles authentication; MongoDB (via backend) holds profiles/roles.
 * onAuthStateChanged is the single path for restoring backend profiles on refresh.
 *
 * Two distinct loading flags — they mean different things and must not be merged:
 *   initializing — the one-time session restore on page load. Route guards wait
 *                  on this so a refresh never flashes the login page.
 *   pending      — an auth action is in flight (login, register, logout…).
 *                  Forms disable their inputs on this.
 *
 * Every exported function is stable (useCallback) and the context value is
 * memoised, so consumers only re-render when auth state actually changes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  const [initializing, setInitializing] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Set when a Firebase session exists but its MongoDB profile could not be
   * loaded — e.g. the backend is down, or the account was suspended.
   *
   * Without this the app would show a signed-out UI while Firebase still holds
   * a live session ("ghost session"): the user appears logged out, but logging
   * in again may not re-trigger anything. Route guards render a recovery
   * screen on this instead of silently bouncing to the login page.
   *
   * Shape: { message: string, recoverable: boolean }
   */
  const [sessionError, setSessionError] = useState(null);

  // Prevents onAuthStateChanged from duplicating backend calls during
  // register / login / bootstrap, which load the profile themselves.
  const suppressProfileSync = useRef(false);

  const isAuthenticated = !!user;
  const isFirebaseAuthenticated = !!firebaseUser;
  const role = user?.role || null;

  /** Sync the Firebase session with the MongoDB profile. */
  const loadUserProfile = useCallback(async (activeFirebaseUser) => {
    setFirebaseUser(toFirebaseSummary(activeFirebaseUser));

    try {
      const response = await api.post("/auth/login");
      setUser(response.data.data);
      setNeedsProfile(false);
      setSessionError(null);
      setError(null);
    } catch (err) {
      // 404 is not a failure — it means this Firebase user has no profile yet.
      if (err.status === 404 && err.code === "NOT_FOUND") {
        setUser(null);
        setNeedsProfile(true);
        setSessionError(null);
        setError(null);
        return;
      }

      console.error("Failed to fetch user profile:", err);
      setUser(null);
      setNeedsProfile(false);
      setSessionError({
        message: err.message || "We couldn't load your profile.",
        // 5xx / network errors may succeed on retry. 401 (bad token) and
        // 403 (suspended account) will not — those need a fresh sign-in.
        recoverable: err.status >= 500,
      });
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setFirebaseUser(null);
    setNeedsProfile(false);
    setSessionError(null);
    setError(null);
  }, []);

  /** Re-attempt the profile load after a transient failure (backend down, etc.). */
  const retryProfileLoad = useCallback(async () => {
    if (!auth.currentUser) {
      clearSession();
      return;
    }

    setPending(true);
    try {
      await loadUserProfile(auth.currentUser);
    } finally {
      setPending(false);
    }
  }, [loadUserProfile, clearSession]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (activeFirebaseUser) => {
      // Suppressed only for the profile *fetch* — `initializing` is always
      // resolved below so the app can never hang on a permanent loader.
      if (!suppressProfileSync.current) {
        if (activeFirebaseUser) {
          await loadUserProfile(activeFirebaseUser);
        } else {
          clearSession();
        }
      }

      setInitializing(false);
    });

    return () => unsubscribe();
  }, [loadUserProfile, clearSession]);

  const register = useCallback(
    async (email, password, profileData) => {
      suppressProfileSync.current = true;
      setPending(true);
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
        // Rollback Firebase user creation if MongoDB fails
        if (auth.currentUser && !err.code?.startsWith("auth/")) {
          try {
            await auth.currentUser.delete();
          } catch (rollbackErr) {
            console.error("Failed to rollback Firebase user:", rollbackErr);
          }
        }

        let errorMessage = err.message || "Registration failed";

        if (err.details && err.details.length > 0) {
          errorMessage = err.details.join(", ");
        } else if (err.code === "auth/email-already-in-use") {
          errorMessage = "An account with this email already exists";
        } else if (err.code === "auth/weak-password") {
          errorMessage = "Password must be at least 6 characters";
        } else if (err.code === "auth/invalid-email") {
          errorMessage = "Invalid email address";
        }

        setError(errorMessage);
        throw new Error(errorMessage, { cause: err });
      } finally {
        suppressProfileSync.current = false;
        setPending(false);
      }
    },
    []
  );

  /** Complete MongoDB profile for an existing Firebase user (no new Firebase account). */
  const completeProfile = useCallback(async (profileData) => {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to complete your profile");
    }

    suppressProfileSync.current = true;
    setPending(true);
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
      let errorMessage = err.message || "Profile completion failed";
      if (err.details && err.details.length > 0) {
        errorMessage = err.details.join(", ");
      }
      setError(errorMessage);
      throw new Error(errorMessage, { cause: err });
    } finally {
      suppressProfileSync.current = false;
      setPending(false);
    }
  }, []);

  /** Bootstrap MongoDB admin profile for allowlisted Firebase admin (server-side ADMIN_EMAILS). */
  const bootstrapAdmin = useCallback(async (name) => {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to bootstrap an admin account");
    }

    suppressProfileSync.current = true;
    setPending(true);
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
      throw new Error(errorMessage, { cause: err });
    } finally {
      suppressProfileSync.current = false;
      setPending(false);
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      suppressProfileSync.current = true;
      setPending(true);
      setError(null);

      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        // Load the profile here rather than waiting on the listener, so that by
        // the time this resolves `user` / `needsProfile` are already settled and
        // the caller can navigate without racing the route guards.
        await loadUserProfile(credential.user);
      } catch (err) {
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
        throw new Error(errorMessage, { cause: err });
      } finally {
        suppressProfileSync.current = false;
        setPending(false);
      }
    },
    [loadUserProfile]
  );

  const loginWithGoogle = useCallback(async () => {
    suppressProfileSync.current = true;
    setPending(true);
    setError(null);

    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      // Manually sync profile so we know needsProfile state before returning
      await loadUserProfile(result.user);
    } catch (err) {
      let errorMessage = err.message || "Google sign-in failed";

      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled";
      }

      setError(errorMessage);
      throw new Error(errorMessage, { cause: err });
    } finally {
      suppressProfileSync.current = false;
      setPending(false);
    }
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    setPending(true);
    try {
      await signOut(auth);
      clearSession();
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to log out");
    } finally {
      setPending(false);
    }
  }, [clearSession]);

  const clearError = useCallback(() => setError(null), []);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  }, []);

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      role,
      isAuthenticated,
      isFirebaseAuthenticated,
      needsProfile,
      initializing,
      pending,
      error,
      sessionError,
      login,
      loginWithGoogle,
      register,
      completeProfile,
      bootstrapAdmin,
      retryProfileLoad,
      logout,
      clearError,
      updateUser,
    }),
    [
      user,
      firebaseUser,
      role,
      isAuthenticated,
      isFirebaseAuthenticated,
      needsProfile,
      initializing,
      pending,
      error,
      sessionError,
      login,
      loginWithGoogle,
      register,
      completeProfile,
      bootstrapAdmin,
      retryProfileLoad,
      logout,
      clearError,
      updateUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

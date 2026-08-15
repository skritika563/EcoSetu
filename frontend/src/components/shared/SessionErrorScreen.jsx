/**
 * SessionErrorScreen — shown when a Firebase session is live but its MongoDB
 * profile could not be loaded.
 *
 * Without this the app silently bounced the user to the login page while
 * Firebase still held a session — a "ghost session" where the UI says signed
 * out but the underlying auth state disagrees. This gives the user an
 * explanation and two ways out: retry (transient failures) or sign out (always).
 *
 * Reads everything from AuthContext, so call sites are a single line:
 *   if (isFirebaseAuthenticated && sessionError) return <SessionErrorScreen />;
 */

import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, ServerCrash, ShieldAlert } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const SessionErrorScreen = () => {
  const { firebaseUser, sessionError, retryProfileLoad, logout, pending } = useAuth();
  const navigate = useNavigate();

  if (!sessionError) return null;

  const { message, recoverable } = sessionError;
  const Icon = recoverable ? ServerCrash : ShieldAlert;

  const handleSignOut = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div
      role="alert"
      className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-5 bg-background px-6 py-12 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <Icon className="h-6 w-6 text-destructive" strokeWidth={2.2} />
      </div>

      <div className="space-y-2">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          {recoverable ? "We can't reach Eco Setu right now" : "We couldn't verify your account"}
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
        {recoverable && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            You are still signed in — this is usually a temporary connection problem.
          </p>
        )}
      </div>

      {firebaseUser?.email && (
        <p className="text-xs text-muted-foreground/70">
          Signed in as <span className="font-medium text-muted-foreground">{firebaseUser.email}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {recoverable && (
          <Button onClick={retryProfileLoad} disabled={pending}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {pending ? "Retrying…" : "Try again"}
          </Button>
        )}
        <Button variant={recoverable ? "outline" : "default"} onClick={handleSignOut} disabled={pending}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default SessionErrorScreen;

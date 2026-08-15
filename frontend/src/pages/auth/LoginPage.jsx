/**
 * LoginPage — Email/password + Google sign-in.
 *
 * Auth flows:
 *   Email/password → login() → onAuthStateChanged → profile sync
 *   Google → loginWithGoogle() → onAuthStateChanged → profile sync or needsProfile
 *
 * Redirects:
 *   Already authenticated → return to `from` or `/`
 *   Firebase auth but no MongoDB profile → `/complete-profile`
 */

import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useShake } from "@/hooks/useShake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// Hidden for now — the Navbar already shows the EcoSetu lockup on this page.
// import BrandLogo from "@/components/shared/BrandLogo";
import GoogleLogo from "@/components/shared/GoogleLogo";
import SessionErrorScreen from "@/components/shared/SessionErrorScreen";
import { cardEntrance, shakeAnimation, shakeTransition } from "@/lib/animations";

const LoginPage = () => {
  const {
    login,
    loginWithGoogle,
    pending,
    isAuthenticated,
    needsProfile,
    isFirebaseAuthenticated,
    sessionError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { shake, triggerShake } = useShake();

  // ── Already authenticated → redirect ──────────────────────────────────
  if (isAuthenticated) return <Navigate to={from} replace />;
  if (needsProfile) return <Navigate to="/complete-profile" replace />;
  // A live Firebase session whose profile failed to load: showing an empty
  // login form here would be the ghost-session trap. Explain it instead.
  if (isFirebaseAuthenticated && sessionError) return <SessionErrorScreen />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    if (!email.trim() || password.length < 6) {
      toast.error("Please enter a valid email and a password of at least 6 characters.");
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to log in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
      // Declarative <Navigate> at the top handles redirect based on auth state
    } catch (err) {
      toast.error(err.message || "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <motion.div className="w-full max-w-[420px]" {...cardEntrance}>
        {/* Hidden for now — duplicates the EcoSetu logo in the Navbar.
            Re-enable by uncommenting this line and the BrandLogo import above. */}
        {/* <BrandLogo size="md" className="mb-8 justify-center" /> */}

        <Card className="shadow-xl border-border/60">
          <CardHeader className="pb-2 text-center space-y-1">
            <h1 className="text-2xl font-heading font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to Eco Setu
            </p>
          </CardHeader>

          <CardContent className="pt-4 space-y-5">
            {/* Google sign-in */}
            <Button
              id="login-google"
              type="button"
              variant="outline"
              className="w-full h-11 gap-2.5 font-medium text-sm border-border/80 hover:bg-muted/50"
              onClick={handleGoogle}
              disabled={submitting || pending}
            >
              <GoogleLogo />
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground select-none">or sign in with email</span>
              <Separator className="flex-1" />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="pl-9 h-10"
                    disabled={submitting || pending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-sm font-medium">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10 h-10"
                    disabled={submitting || pending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.div animate={shake ? shakeAnimation : {}} transition={shakeTransition}>
                <Button
                  id="login-submit"
                  type="submit"
                  className="w-full h-10 font-semibold"
                  disabled={submitting || pending}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </motion.div>
            </form>

            {/* Signup redirect */}
            <p className="text-center text-sm text-muted-foreground pt-1">
              Don&apos;t have an account?{" "}
              <Link to="/auth/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Bottom subtle note */}
        <p className="text-center text-xs text-muted-foreground/70 mt-6">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2 hover:text-muted-foreground">Terms</Link>
          {" "}and{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
};


export default LoginPage;

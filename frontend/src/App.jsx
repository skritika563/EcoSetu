/**
 * App.jsx — React Router configuration and top-level route structure.
 *
 * Route structure:
 *   /                   → Landing (public, redirects authenticated users to their dashboard)
 *   /login              → Login page
 *   /signup             → Signup page
 *   /complete-profile   → Profile completion (Firebase-authed users with no MongoDB profile)
 *
 *   Protected (AppShell + role routes):
 *   /household/*        → Household dashboard
 *   /organization/*     → Organization dashboard
 *   /collector/*        → Collector dashboard
 *   /admin/*            → Admin dashboard
 *
 * Security: roles are read from MongoDB (via backend), never from frontend state.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AppShell from "@/components/shared/AppShell";
import PageLoader from "@/components/shared/PageLoader";
import "./App.css";

/* ─── Lazy page placeholders (will be replaced module by module) ─────────── */

/** Authenticated home redirect */
function AuthHome() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (isAuthenticated && role) {
    const home = { household: "/household", organization: "/organization", collector: "/collector", admin: "/admin" }[role] || "/";
    return <Navigate to={home} replace />;
  }

  // Redirect to landing (to be built next)
  return <Navigate to="/landing" replace />;
}

/** Temporary placeholder for pages not yet built */
function PlaceholderPage({ title }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 page-enter">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <span className="text-2xl">🌿</span>
      </div>
      <h1 className="text-2xl font-heading font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">Welcome, {user?.name} — this page is coming soon.</p>
      <button
        type="button"
        onClick={logout}
        className="mt-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        Log out
      </button>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth redirect root */}
        <Route path="/" element={<AuthHome />} />

        {/* Public auth pages — no AppShell (full bleed) */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/signup"           element={<SignupPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />

        {/* Marketing landing — AppShell with Navbar + Footer */}
        <Route element={<AppShell />}>
          <Route path="/landing" element={<LandingPage />} />
        </Route>

        {/* Protected role dashboards — AppShell */}
        <Route element={<AppShell />}>
          <Route element={<ProtectedRoute allowedRoles={["household"]} />}>
            <Route path="/household/*" element={<PlaceholderPage title="Household Dashboard" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["organization"]} />}>
            <Route path="/organization/*" element={<PlaceholderPage title="Organization Dashboard" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["collector"]} />}>
            <Route path="/collector/*" element={<PlaceholderPage title="Collector Dashboard" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/*" element={<PlaceholderPage title="Admin Dashboard" />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

/* ─── Inline page stubs (will be extracted to pages/ in next module) ─────── */

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Mail, Lock, Eye, EyeOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/* ─────────────────────────────────────────────────────────── LoginPage ──── */
function LoginPage() {
  const { login, loginWithGoogle, loading, error, isAuthenticated, needsProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  if (isAuthenticated) return <Navigate to={from} replace />;
  if (needsProfile) return <Navigate to="/complete-profile" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const form = e.target;
    try {
      await login(form.email.value, form.password.value);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Logo */}
        <Link to="/landing" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight">
            Eco<span className="text-primary">Setu</span>
          </span>
        </Link>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4 text-center">
            <h1 className="text-2xl font-heading font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google */}
            <Button
              id="login-google"
              type="button"
              variant="outline"
              className="w-full gap-2 font-medium"
              onClick={handleGoogle}
              disabled={loading}
            >
              <Globe className="h-4 w-4" />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {(error || formError) && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                  {formError || error}
                </p>
              )}

              <Button
                id="login-submit"
                type="submit"
                className="w-full font-semibold"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── SignupPage ──────── */
function SignupPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Link to="/landing" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm group-hover:scale-105 transition-transform">
            <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight">
            Eco<span className="text-primary">Setu</span>
          </span>
        </Link>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-2 text-center">
            <h1 className="text-2xl font-heading font-semibold text-foreground">Create an account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Full signup form — coming in the next UI module.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground text-center rounded-lg bg-muted px-4 py-6">
              The complete role-selection signup form (household / collector / organization) will be built in the Signup module.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────── CompleteProfilePage ──────── */
function CompleteProfilePage() {
  const { needsProfile, isFirebaseAuthenticated, firebaseUser, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/" replace />;
  if (!isFirebaseAuthenticated || !needsProfile) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Link to="/landing" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm group-hover:scale-105 transition-transform">
            <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight">
            Eco<span className="text-primary">Setu</span>
          </span>
        </Link>

        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-2">
            <h1 className="text-2xl font-heading font-semibold text-foreground">Complete your profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;re signed in as <strong>{firebaseUser?.email}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground text-center rounded-lg bg-muted px-4 py-4">
              A Firebase account was found but no Eco Setu profile. The full role-selection form will be built in the next module.
            </p>
            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{error}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────── LandingPage ──────────── */
function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 ecosetu-gradient-subtle -z-10" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Leaf className="h-3.5 w-3.5" />
              India&apos;s Circular Economy Platform
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold tracking-tight text-foreground">
              Connecting Communities
              <br />
              for a{" "}
              <span className="gradient-text">Greener Tomorrow</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              EcoSetu makes it effortless to schedule scrap pickups, sell recyclables, and participate in collection drives — turning waste into value for everyone.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isAuthenticated ? (
                <Button id="hero-go-dashboard" size="lg" className="shadow-md px-8" asChild>
                  <Link to="/">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button id="hero-get-started" size="lg" className="shadow-md px-8" asChild>
                    <Link to="/signup">Get Started Free</Link>
                  </Button>
                  <Button id="hero-login" size="lg" variant="outline" asChild>
                    <Link to="/login">Log in</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature highlights placeholder */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Full feature sections will be built in the Landing Page module.
          </p>
        </div>
      </section>
    </div>
  );
}

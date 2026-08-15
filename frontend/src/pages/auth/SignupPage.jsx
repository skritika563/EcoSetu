/**
 * SignupPage — Multi-step account creation.
 *
 * Step 1: Choose user type (Household / Organization / Collector)
 *         If Organization → show sub-type (NGO / School / University)
 * Step 2: Profile details (name, phone, address)
 * Step 3: Email + password (or Google auth)
 *
 * Google auth path:
 *   Google Sign-in → if no MongoDB profile → redirect to /complete-profile
 *   (handled by AuthContext's onAuthStateChanged → needsProfile)
 *
 * Email/password path:
 *   Firebase createUser → AuthContext.register() → POST /api/auth/register
 *
 * The role cards, profile fields, validation and payload builder are shared
 * with CompleteProfilePage — see components/auth/ and lib/profile.js.
 */

import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useShake } from "@/hooks/useShake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// Hidden for now — the Navbar already shows the EcoSetu lockup on this page.
// import BrandLogo from "@/components/shared/BrandLogo";
import GoogleLogo from "@/components/shared/GoogleLogo";
import StepIndicator from "@/components/shared/StepIndicator";
import RoleSelector from "@/components/auth/RoleSelector";
import ProfileDetailsFields from "@/components/auth/ProfileDetailsFields";
import {
  EMPTY_PROFILE_FORM,
  buildRegistrationPayload,
  isOrganization,
  validateProfileDetails,
  validateRoleSelection,
} from "@/lib/profile";
import { cardEntrance, shakeAnimation, shakeTransition, slideVariants } from "@/lib/animations";

const TOTAL_STEPS = 3;

/* ─── Step 1: Role selection ─────────────────────────────────────────────── */
const StepRoleSelection = ({ formData, setFormData, onNext, shake, triggerShake }) => {
  const handleNext = () => {
    const error = validateRoleSelection(formData);
    if (error) {
      toast.error(error);
      triggerShake();
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          How will you use Eco Setu?
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose the option that best describes you
        </p>
      </div>

      <RoleSelector
        role={formData.role}
        organizationType={formData.organizationType}
        onRoleChange={(id) =>
          setFormData((prev) => ({
            ...prev,
            role: id,
            // Clear org type when switching away from organization
            organizationType: isOrganization(id) ? prev.organizationType : "",
          }))
        }
        onOrgTypeChange={(id) => setFormData((prev) => ({ ...prev, organizationType: id }))}
      />

      <motion.div animate={shake ? shakeAnimation : {}} transition={shakeTransition}>
        <Button id="signup-step1-next" className="h-10 w-full font-semibold" onClick={handleNext}>
          Continue
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
};

/* ─── Step 2: Profile details ────────────────────────────────────────────── */
const StepProfileDetails = ({ formData, setFormData, onNext, onBack, shake, triggerShake }) => {
  const isOrg = isOrganization(formData.role);

  const handleNext = () => {
    const error = validateProfileDetails(formData);
    if (error) {
      toast.error(error);
      triggerShake();
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {isOrg ? "Organization Details" : "Tell us about yourself"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isOrg
            ? "Enter your organization's primary contact info"
            : "We'll use this to personalize your experience"}
        </p>
      </div>

      <ProfileDetailsFields
        idPrefix="signup"
        formData={formData}
        onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
      />

      <div className="flex gap-3">
        <Button
          id="signup-step2-back"
          type="button"
          variant="outline"
          className="h-10 flex-1"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <motion.div
          animate={shake ? shakeAnimation : {}}
          transition={shakeTransition}
          className="flex-1"
        >
          <Button id="signup-step2-next" className="h-10 w-full font-semibold" onClick={handleNext}>
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Step 3: Credentials ────────────────────────────────────────────────── */
const StepCredentials = ({ formData, setFormData, onBack, onSubmit, submitting, shake, triggerShake }) => {
  const [showPassword, setShowPassword] = useState(false);
  const { email, password } = formData;

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Please enter a valid email and a password of at least 6 characters.");
      triggerShake();
      return;
    }
    onSubmit();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="font-heading text-lg font-semibold text-foreground">Create your account</h2>
        <p className="text-sm text-muted-foreground">Set up your login credentials</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className="text-sm font-medium">
            Email address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              autoComplete="email"
              className="h-10 pl-9"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-sm font-medium">
            Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => updateField("password", e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-10 pl-9 pr-10"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">At least 6 characters</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            id="signup-step3-back"
            type="button"
            variant="outline"
            className="h-10 flex-1"
            onClick={onBack}
            disabled={submitting}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <motion.div
            animate={shake ? shakeAnimation : {}}
            transition={shakeTransition}
            className="flex-1"
          >
            <Button
              id="signup-submit"
              type="submit"
              className="h-10 w-full font-semibold"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
};

/* ─── SignupPage ─────────────────────────────────────────────────────────── */
const SignupPage = () => {
  const { register, loginWithGoogle, isAuthenticated, needsProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { shake, triggerShake } = useShake();
  const [formData, setFormData] = useState({
    ...EMPTY_PROFILE_FORM,
    email: "",
    password: "",
  });

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleRegister = useCallback(async () => {
    setSubmitting(true);
    try {
      await register(formData.email.trim(), formData.password, buildRegistrationPayload(formData));
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, register, navigate]);

  const handleGoogle = useCallback(async () => {
    const error = validateRoleSelection(formData);
    if (error) {
      toast.error(error);
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      // Carry the chosen role/details across the popup so CompleteProfilePage
      // can pre-fill them if this Google account has no MongoDB profile yet.
      sessionStorage.setItem(
        "pendingGoogleProfile",
        JSON.stringify({
          role: formData.role,
          organizationType: formData.organizationType,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        })
      );

      await loginWithGoogle();
      // The declarative <Navigate> guards below handle the redirect once
      // isAuthenticated / needsProfile settle.
    } catch (err) {
      toast.error(err.message || "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, loginWithGoogle, triggerShake]);

  // ── Redirects (all hooks must be declared above this line) ───────────────
  if (isAuthenticated) return <Navigate to="/" replace />;
  if (needsProfile) return <Navigate to="/complete-profile" replace />;

  const steps = [
    <StepRoleSelection
      key="role"
      formData={formData}
      setFormData={setFormData}
      onNext={goNext}
      shake={shake}
      triggerShake={triggerShake}
    />,
    <StepProfileDetails
      key="details"
      formData={formData}
      setFormData={setFormData}
      onNext={goNext}
      onBack={goBack}
      shake={shake}
      triggerShake={triggerShake}
    />,
    <StepCredentials
      key="credentials"
      formData={formData}
      setFormData={setFormData}
      onBack={goBack}
      onSubmit={handleRegister}
      submitting={submitting}
      shake={shake}
      triggerShake={triggerShake}
    />,
  ];

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <motion.div className="w-full max-w-[440px]" {...cardEntrance}>
        {/* Hidden for now — duplicates the EcoSetu logo in the Navbar.
            Re-enable by uncommenting this line and the BrandLogo import above. */}
        {/* <BrandLogo size="md" className="mb-6 justify-center" /> */}

        <Card className="border-border/60 shadow-xl">
          <CardContent className="pb-6 pt-6">
            <StepIndicator current={step} total={TOTAL_STEPS} />

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>

            {/* Google auth — available on every step */}
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="select-none text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <Button
                id="signup-google"
                type="button"
                variant="outline"
                className="mt-4 h-10 w-full gap-2.5 border-border/80 text-sm font-medium hover:bg-muted/50 disabled:pointer-events-auto disabled:cursor-not-allowed"
                onClick={handleGoogle}
                disabled={submitting || (step === 0 && !formData.role)}
              >
                <GoogleLogo />
                Continue with Google
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2 hover:text-muted-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
};

export default SignupPage;

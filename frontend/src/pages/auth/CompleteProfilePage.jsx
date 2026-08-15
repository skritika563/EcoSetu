/**
 * CompleteProfilePage — For users who signed in with Google but have no
 * MongoDB profile yet (needsProfile === true).
 *
 * Collects: role, organizationType (if org), name, phone, address
 * Then calls: completeProfile(payload) → POST /api/auth/register
 *
 * The Firebase email comes from the verified token — the user only supplies
 * their role and profile info.
 *
 * Steps, fields and validation are shared with SignupPage
 * (components/auth/ + lib/profile.js) so both onboarding paths stay identical.
 */

import { useCallback, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useShake } from "@/hooks/useShake";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/shared/BrandLogo";
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

const TOTAL_STEPS = 2;
const PENDING_PROFILE_KEY = "pendingGoogleProfile";

/* ─── Step 1: Role selection ─────────────────────────────────────────────── */
const RoleStep = ({ formData, setFormData, onNext, shake, triggerShake }) => {
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
            organizationType: isOrganization(id) ? prev.organizationType : "",
          }))
        }
        onOrgTypeChange={(id) => setFormData((prev) => ({ ...prev, organizationType: id }))}
      />

      <motion.div animate={shake ? shakeAnimation : {}} transition={shakeTransition}>
        <Button id="complete-step0-next" className="h-10 w-full font-semibold" onClick={handleNext}>
          Continue
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
};

/* ─── Step 2: Details + submit ───────────────────────────────────────────── */
const DetailsStep = ({ formData, setFormData, onBack, onSubmit, submitting, shake, triggerShake }) => {
  const isOrg = isOrganization(formData.role);

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateProfileDetails(formData);
    if (error) {
      toast.error(error);
      triggerShake();
      return;
    }
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-6 space-y-1 text-center">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {isOrg ? "Organization Details" : "Tell us about yourself"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isOrg
            ? "Enter your organization's primary contact info"
            : "We'll use this to personalize your experience"}
        </p>
      </div>

      <ProfileDetailsFields
        idPrefix="complete"
        formData={formData}
        onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
        disabled={submitting}
      />

      <div className="flex gap-3">
        <Button
          id="complete-step1-back"
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
            id="complete-submit"
            type="submit"
            className="h-10 w-full font-semibold"
            disabled={submitting}
          >
            {submitting ? "Creating profile…" : "Get started"}
            {!submitting && <Sparkles className="ml-1.5 h-4 w-4" />}
          </Button>
        </motion.div>
      </div>
    </form>
  );
};

/* ─── Read the role/details captured before the Google popup ─────────────── */
const readPendingProfile = () => {
  try {
    const pending = sessionStorage.getItem(PENDING_PROFILE_KEY);
    return pending ? JSON.parse(pending) : {};
  } catch {
    return {};
  }
};

/* ─── CompleteProfilePage ────────────────────────────────────────────────── */
const CompleteProfilePage = () => {
  const {
    firebaseUser,
    isAuthenticated,
    isFirebaseAuthenticated,
    needsProfile,
    completeProfile,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { shake, triggerShake } = useShake();

  const [formData, setFormData] = useState(() => {
    const pending = readPendingProfile();
    return {
      ...EMPTY_PROFILE_FORM,
      ...pending,
      name: firebaseUser?.displayName || "",
    };
  });

  // Skip role selection when it was already chosen on the signup page.
  const [step, setStep] = useState(() => (formData.role ? 1 : 0));

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await completeProfile(buildRegistrationPayload(formData));
      sessionStorage.removeItem(PENDING_PROFILE_KEY);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Profile creation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, completeProfile, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      // Drop the stashed role so a future sign-in starts clean.
      sessionStorage.removeItem(PENDING_PROFILE_KEY);
      await logout();
      navigate("/");
    } catch {
      toast.error("Failed to sign out.");
    }
  }, [logout, navigate]);

  // ── Guards (all hooks must be declared above this line) ──────────────────
  if (isAuthenticated) return <Navigate to="/" replace />;
  if (!isFirebaseAuthenticated || !needsProfile) return <Navigate to="/auth/login" replace />;

  const steps = [
    <RoleStep
      key="role"
      formData={formData}
      setFormData={setFormData}
      onNext={goNext}
      shake={shake}
      triggerShake={triggerShake}
    />,
    <DetailsStep
      key="details"
      formData={formData}
      setFormData={setFormData}
      onBack={goBack}
      onSubmit={handleSubmit}
      submitting={submitting}
      shake={shake}
      triggerShake={triggerShake}
    />,
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <motion.div className="w-full max-w-[440px]" {...cardEntrance}>
        <BrandLogo size="md" className="mb-6 justify-center" />

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
          </CardContent>
        </Card>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-xs text-muted-foreground/70">
            Your email{" "}
            <span className="font-medium text-muted-foreground">{firebaseUser?.email}</span> will be
            used for your account.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
          >
            Cancel and Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CompleteProfilePage;

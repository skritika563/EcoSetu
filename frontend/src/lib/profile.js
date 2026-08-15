/**
 * Profile form helpers — shared by SignupPage and CompleteProfilePage.
 *
 * Both pages collect the same profile fields and post the same payload to
 * POST /api/auth/register, so the shape, the validation rules and the payload
 * builder live here rather than being duplicated per page.
 *
 * Validation mirrors backend/models/User.js — keep the two in sync.
 */

/** Blank state for the profile form. */
export const EMPTY_PROFILE_FORM = {
  role: "",
  organizationType: "",
  name: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
};

/** Backend: /^[6-9]\d{9}$/ (10-digit Indian mobile). */
export const PHONE_PATTERN = /^[6-9]\d{9}$/;

export const isOrganization = (role) => role === "organization";

/**
 * Validate the role-selection step.
 * @returns {string|null} error message, or null when valid
 */
export const validateRoleSelection = ({ role, organizationType }) => {
  if (!role) return "Please select a user type.";
  if (isOrganization(role) && !organizationType) {
    return "Please select an organization type.";
  }
  return null;
};

/**
 * Validate the profile-details step.
 * Organizations must supply a full address; everyone else only needs a city.
 * @returns {string|null} error message, or null when valid
 */
export const validateProfileDetails = ({ role, name, phone, city, street, state, pincode }) => {
  const isOrg = isOrganization(role);

  if (!name || name.trim().length < 2) {
    return isOrg
      ? "Please enter a valid organization name."
      : "Please enter a valid full name.";
  }
  if (!PHONE_PATTERN.test(phone || "")) {
    return "Phone number must be a valid 10-digit Indian mobile number.";
  }
  if (!city || !city.trim()) {
    return "Please enter your city.";
  }

  if (isOrg) {
    if (!street || !street.trim()) return "Street address is required for organizations.";
    if (!state || !state.trim()) return "State is required for organizations.";
    if (!pincode || pincode.trim().length !== 6) return "Please enter a valid 6-digit PIN code.";
  }

  return null;
};

/**
 * Build the POST /api/auth/register body from the profile form.
 * organizationType is included only for the organization role — the backend
 * rejects it on any other role.
 */
export const buildRegistrationPayload = (formData) => {
  const payload = {
    name: formData.name.trim(),
    role: formData.role,
    phone: formData.phone || undefined,
    address: {
      street: formData.street?.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state?.trim() || undefined,
      pincode: formData.pincode?.trim() || undefined,
    },
  };

  if (isOrganization(formData.role) && formData.organizationType) {
    payload.organizationType = formData.organizationType;
  }

  return payload;
};

/** Digits-only input sanitiser (phone, PIN code). */
export const digitsOnly = (value, maxLength) =>
  value.replace(/\D/g, "").slice(0, maxLength);

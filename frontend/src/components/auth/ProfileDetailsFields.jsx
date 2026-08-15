/**
 * ProfileDetailsFields — name / phone / address inputs for onboarding.
 *
 * Shared by SignupPage (step 2) and CompleteProfilePage (step 2). Organizations
 * get a full address block; households and collectors only need a city.
 *
 * Controlled component: the parent owns `formData` and receives field updates
 * through `onChange(field, value)`.
 *
 * @param {string} idPrefix - namespaces input ids so two instances can coexist
 */

import { Building2, MapPin, Phone, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { digitsOnly, isOrganization } from "@/lib/profile";

const RequiredMark = () => <span className="text-destructive">*</span>;

const ProfileDetailsFields = ({ idPrefix, formData, onChange, disabled = false }) => {
  const { name, phone, street, city, state, pincode, role } = formData;
  const isOrg = isOrganization(role);

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
          {isOrg ? "Organization name" : "Full name"} <RequiredMark />
        </Label>
        <div className="relative">
          {isOrg ? (
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            id={`${idPrefix}-name`}
            type="text"
            placeholder={isOrg ? "Green Earth NGO" : "Rahul Sharma"}
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            className="h-10 pl-9"
            required
            minLength={2}
            maxLength={100}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-phone`} className="text-sm font-medium">
          Phone number <RequiredMark />
        </Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => onChange("phone", digitsOnly(e.target.value, 10))}
            className="h-10 pl-9"
            required
            minLength={10}
            maxLength={10}
            pattern="[0-9]{10}"
            disabled={disabled}
          />
        </div>
        <p className="text-xs text-muted-foreground">10-digit Indian mobile number</p>
      </div>

      {/* Address */}
      {isOrg ? (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Primary Address <span className="text-xs text-destructive">*</span>
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-street`} className="text-xs font-medium text-muted-foreground">
              Street Address <RequiredMark />
            </Label>
            <Input
              id={`${idPrefix}-street`}
              type="text"
              placeholder="123 Eco Park Road"
              value={street}
              onChange={(e) => onChange("street", e.target.value)}
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-city`} className="text-xs font-medium text-muted-foreground">
                City <RequiredMark />
              </Label>
              <Input
                id={`${idPrefix}-city`}
                type="text"
                placeholder="Mumbai"
                value={city}
                onChange={(e) => onChange("city", e.target.value)}
                className="h-9 text-sm"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-state`} className="text-xs font-medium text-muted-foreground">
                State <RequiredMark />
              </Label>
              <Input
                id={`${idPrefix}-state`}
                type="text"
                placeholder="Maharashtra"
                value={state}
                onChange={(e) => onChange("state", e.target.value)}
                className="h-9 text-sm"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-pincode`} className="text-xs font-medium text-muted-foreground">
              PIN Code <RequiredMark />
            </Label>
            <Input
              id={`${idPrefix}-pincode`}
              type="text"
              inputMode="numeric"
              placeholder="400001"
              value={pincode}
              onChange={(e) => onChange("pincode", digitsOnly(e.target.value, 6))}
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-city`} className="text-sm font-medium">
            City <RequiredMark />
          </Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${idPrefix}-city`}
              type="text"
              placeholder="Mumbai"
              value={city}
              onChange={(e) => onChange("city", e.target.value)}
              className="h-10 pl-9"
              disabled={disabled}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You can add your full address later when scheduling pickups
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileDetailsFields;

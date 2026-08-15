/**
 * RoleSelector — role cards + organization sub-type picker.
 *
 * Shared by SignupPage (step 1) and CompleteProfilePage (step 1) so the two
 * onboarding paths always offer the same roles with the same styling.
 *
 * Controlled component: the parent owns `role` / `organizationType`.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

import { ACTIVE_ROLE_CARD_CLASS, ORG_TYPES, SIGNUP_ROLE_OPTIONS } from "@/config/roles";
import { isOrganization } from "@/lib/profile";
import { cn } from "@/lib/utils";

const RoleSelector = ({ role, organizationType, onRoleChange, onOrgTypeChange, disabled = false }) => (
  <div className="space-y-5">
    {/* Role cards */}
    <div className="space-y-3">
      {SIGNUP_ROLE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = role === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onRoleChange(option.id)}
            disabled={disabled}
            className={cn(
              "flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-sm disabled:opacity-60",
              isSelected ? ACTIVE_ROLE_CARD_CLASS : option.cardClass
            )}
            aria-pressed={isSelected}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : `bg-white dark:bg-white/10 ${option.iconColor}`
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>

    {/* Organization sub-types — only for the organization role */}
    <AnimatePresence>
      {isOrganization(role) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="space-y-2.5 pt-1">
            <p className="text-sm font-medium text-foreground">What type of organization?</p>
            <div className="grid grid-cols-3 gap-2">
              {ORG_TYPES.map((org) => {
                const OrgIcon = org.icon;
                const isOrgSelected = organizationType === org.id;

                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => onOrgTypeChange(org.id)}
                    disabled={disabled}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all duration-200 disabled:opacity-60",
                      isOrgSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}
                    aria-pressed={isOrgSelected}
                  >
                    <OrgIcon
                      className={cn("h-5 w-5", isOrgSelected ? "text-primary" : "text-muted-foreground")}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isOrgSelected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {org.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default RoleSelector;

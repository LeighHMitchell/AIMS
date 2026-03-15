"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Onboarding, ChoiceGroup, useOnboarding } from "@/components/ui/onboarding";
import { OrganizationSearchableSelect } from "@/components/ui/organization-searchable-select";
import { useOrganizations } from "@/hooks/use-organizations";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { User } from "@/types/user";
import { apiFetch } from "@/lib/api-fetch";

const TITLE_OPTIONS = [
  { value: "Mr.", label: "Mr." },
  { value: "Ms.", label: "Ms." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
  { value: "Daw", label: "Daw" },
  { value: "U", label: "U" },
] as const;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
  { code: "sw", name: "Swahili" },
  { code: "de", name: "German" },
  { code: "my", name: "Myanmar" },
];

interface OnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

interface FormData {
  title: string;
  firstName: string;
  lastName: string;
  gender: string;
  organizationId: string;
  department: string;
  position: string;
  phone: string;
  preferredLanguage: string;
  profilePicture: string;
}

export default function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const [form, setForm] = useState<FormData>({
    title: user.title || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    gender: user.gender || "",
    organizationId: user.organizationId || "",
    department: user.department || "",
    position: user.jobTitle || "",
    phone: user.telephone || user.phone || "",
    preferredLanguage: user.preferredLanguage || "en",
    profilePicture: user.profilePicture || "",
  });
  const { organizations } = useOrganizations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch("/api/users", {
        method: "PUT",
        body: JSON.stringify({
          id: user.id,
          title: form.title || undefined,
          first_name: form.firstName,
          last_name: form.lastName,
          gender: form.gender || undefined,
          organization_id: form.organizationId || undefined,
          department: form.department || undefined,
          job_title: form.position || undefined,
          telephone: form.phone || undefined,
          preferred_language: form.preferredLanguage || undefined,
          avatar_url: form.profilePicture || undefined,
          onboarding_completed: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save profile");
      }

      const updatedUser = await res.json();
      onComplete(updatedUser);
    } catch (err: any) {
      console.error("[Onboarding] Error completing onboarding:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to AIMS</DialogTitle>
          <DialogDescription>
            Let&apos;s set up your profile. This only takes a moment.
          </DialogDescription>
        </DialogHeader>

        <Onboarding totalSteps={3} className="px-1">
          <Onboarding.StepIndicator
            labels={["Name", "Organization", "Contact"]}
            className="py-4"
          />

          {/* Step 1: Name & Title */}
          <Onboarding.Step step={0} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <ChoiceGroup
                options={TITLE_OPTIONS as any}
                value={form.title}
                onChange={(v) => updateField("title", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Gender</label>
              <ChoiceGroup
                options={GENDER_OPTIONS as any}
                value={form.gender}
                onChange={(v) => updateField("gender", v)}
              />
            </div>
          </Onboarding.Step>

          {/* Step 2: Organization & Role */}
          <Onboarding.Step step={1} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Organization <span className="text-destructive">*</span>
              </label>
              <OrganizationSearchableSelect
                organizations={organizations}
                value={form.organizationId}
                onValueChange={(v) => updateField("organizationId", v)}
                placeholder="Select your organization..."
                searchPlaceholder="Search organizations..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => updateField("department", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. Aid Coordination"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Position</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => updateField("position", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. Program Manager"
              />
            </div>
          </Onboarding.Step>

          {/* Step 3: Contact & Photo */}
          <Onboarding.Step step={2} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Primary Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="+95 9 xxx xxx xxx"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Preferred Language</label>
              <select
                value={form.preferredLanguage}
                onChange={(e) => updateField("preferredLanguage", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Profile Picture</label>
              <ProfilePhotoUpload
                currentPhoto={form.profilePicture}
                onPhotoChange={(photoUrl: string) => updateField("profilePicture", photoUrl)}
                userInitials={
                  `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase() || "U"
                }
                userId={user.id}
              />
            </div>
          </Onboarding.Step>

          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}

          <StepNavigation
            form={form}
            isSubmitting={isSubmitting}
            onComplete={handleComplete}
          />
        </Onboarding>
      </DialogContent>
    </Dialog>
  );
}

// Separate component so it can access useOnboarding context
function StepNavigation({
  form,
  isSubmitting,
  onComplete,
}: {
  form: FormData;
  isSubmitting: boolean;
  onComplete: () => void;
}) {
  const { currentStep } = useOnboarding();

  // Validation per step
  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return form.firstName.trim() !== "" && form.lastName.trim() !== "";
      case 1:
        return form.organizationId !== "";
      case 2:
        return true; // All optional
      default:
        return true;
    }
  };

  return (
    <Onboarding.Navigation
      onComplete={onComplete}
      isSubmitting={isSubmitting}
      nextDisabled={!isStepValid()}
      completeLabel="Complete Setup"
    />
  );
}

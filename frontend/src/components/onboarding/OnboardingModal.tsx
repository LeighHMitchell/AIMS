"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Onboarding, ChoiceGroup, useOnboarding } from "@/components/ui/onboarding";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

interface OnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

interface FormData {
  title: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  department: string;
  position: string;
  phone: string;
  profilePicture: string;
}

export default function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const [form, setForm] = useState<FormData>({
    title: user.title || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    organizationId: user.organizationId || "",
    department: user.department || "",
    position: user.jobTitle || "",
    phone: user.telephone || user.phone || "",
    profilePicture: user.profilePicture || "",
  });
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations
  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await apiFetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          const orgs = (Array.isArray(data) ? data : []).map((org: any) => ({
            value: org.id,
            label: org.acronym ? `${org.name} (${org.acronym})` : org.name,
          }));
          setOrganizations(orgs);
        }
      } catch (err) {
        console.error("[Onboarding] Failed to fetch organizations:", err);
      }
    }
    fetchOrgs();
  }, []);

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
          organization_id: form.organizationId || undefined,
          department: form.department || undefined,
          job_title: form.position || undefined,
          telephone: form.phone || undefined,
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
        className="sm:max-w-lg"
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
          </Onboarding.Step>

          {/* Step 2: Organization & Role */}
          <Onboarding.Step step={1} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Organization <span className="text-destructive">*</span>
              </label>
              <SearchableSelect
                options={organizations}
                value={form.organizationId}
                onValueChange={(v) => updateField("organizationId", v)}
                placeholder="Select your organization..."
                searchPlaceholder="Search organizations..."
                emptyText="No organizations found."
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

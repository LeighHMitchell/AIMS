"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

// --- Context ---

interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within <Onboarding>");
  return ctx;
}

// --- Root ---

interface OnboardingProps {
  totalSteps: number;
  initialStep?: number;
  children: ReactNode;
  className?: string;
}

export function Onboarding({ totalSteps, initialStep = 0, children, className }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
  }, [totalSteps]);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        totalSteps,
        goNext,
        goBack,
        goTo,
        isFirst: currentStep === 0,
        isLast: currentStep === totalSteps - 1,
      }}
    >
      <div className={className}>{children}</div>
    </OnboardingContext.Provider>
  );
}

// --- Step ---

interface StepProps {
  step: number;
  children: ReactNode;
  className?: string;
}

Onboarding.Step = function OnboardingStep({ step, children, className }: StepProps) {
  const { currentStep } = useOnboarding();
  if (currentStep !== step) return null;
  return <div className={className}>{children}</div>;
};

// --- Step Indicator ---

interface StepIndicatorProps {
  labels?: string[];
  className?: string;
}

Onboarding.StepIndicator = function OnboardingStepIndicator({ labels, className }: StepIndicatorProps) {
  const { currentStep, totalSteps } = useOnboarding();

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
              i === currentStep
                ? "bg-primary text-primary-foreground"
                : i < currentStep
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {i < currentStep ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {labels && labels[i] && (
            <span
              className={cn(
                "hidden text-sm sm:inline",
                i === currentStep ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {labels[i]}
            </span>
          )}
          {i < totalSteps - 1 && (
            <div
              className={cn(
                "h-px w-8 transition-colors",
                i < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// --- Navigation ---

interface NavigationProps {
  onComplete: () => void;
  isSubmitting?: boolean;
  nextDisabled?: boolean;
  completeLabel?: string;
  className?: string;
}

Onboarding.Navigation = function OnboardingNavigation({
  onComplete,
  isSubmitting = false,
  nextDisabled = false,
  completeLabel = "Complete",
  className,
}: NavigationProps) {
  const { goNext, goBack, isFirst, isLast } = useOnboarding();

  return (
    <div className={cn("flex items-center justify-between pt-4", className)}>
      <button
        type="button"
        onClick={goBack}
        disabled={isFirst || isSubmitting}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-colors",
          isFirst
            ? "invisible"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        Back
      </button>
      {isLast ? (
        <button
          type="button"
          onClick={onComplete}
          disabled={nextDisabled || isSubmitting}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            completeLabel
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled || isSubmitting}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      )}
    </div>
  );
};

// --- Choice Group (for title selection) ---

interface ChoiceGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  className?: string;
}

export function ChoiceGroup<T extends string>({ options, value, onChange, className }: ChoiceGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

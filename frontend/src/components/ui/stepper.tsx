"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface StepperContextValue {
  activeStep: number
  totalSteps: number
}

const StepperContext = React.createContext<StepperContextValue>({
  activeStep: 1,
  totalSteps: 1,
})

interface StepItemContextValue {
  step: number
  state: "completed" | "active" | "inactive"
}

const StepItemContext = React.createContext<StepItemContextValue>({
  step: 1,
  state: "inactive",
})

/* ------------------------------------------------------------------ */
/*  Stepper (root)                                                    */
/* ------------------------------------------------------------------ */

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number
  children: React.ReactNode
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ activeStep, className, children, ...props }, ref) => {
    const totalSteps = React.Children.toArray(children).filter(Boolean).length
    return (
      <StepperContext.Provider value={{ activeStep, totalSteps }}>
        <div
          ref={ref}
          className={cn("flex w-full items-start gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </StepperContext.Provider>
    )
  },
)
Stepper.displayName = "Stepper"

/* ------------------------------------------------------------------ */
/*  StepperItem                                                       */
/* ------------------------------------------------------------------ */

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  children: React.ReactNode
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>(
  ({ step, className, children, ...props }, ref) => {
    const { activeStep } = React.useContext(StepperContext)
    const state: StepItemContextValue["state"] =
      step < activeStep ? "completed" : step === activeStep ? "active" : "inactive"

    return (
      <StepItemContext.Provider value={{ step, state }}>
        <div
          ref={ref}
          data-state={state}
          className={cn(
            "group relative flex w-full flex-col items-center justify-center",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </StepItemContext.Provider>
    )
  },
)
StepperItem.displayName = "StepperItem"

/* ------------------------------------------------------------------ */
/*  StepperIndicator                                                  */
/* ------------------------------------------------------------------ */

interface StepperIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

const StepperIndicator = React.forwardRef<HTMLDivElement, StepperIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { state } = React.useContext(StepItemContext)

    return (
      <div
        ref={ref}
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300",
          state === "completed"
            ? "border-primary bg-primary text-primary-foreground"
            : state === "active"
              ? "border-primary bg-background text-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
              : "border-muted-foreground/25 bg-muted text-muted-foreground",
          className,
        )}
        {...props}
      >
        {state === "completed" ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : (
          children
        )}
      </div>
    )
  },
)
StepperIndicator.displayName = "StepperIndicator"

/* ------------------------------------------------------------------ */
/*  StepperSeparator                                                  */
/* ------------------------------------------------------------------ */

interface StepperSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

const StepperSeparator = React.forwardRef<HTMLDivElement, StepperSeparatorProps>(
  ({ className, ...props }, ref) => {
    const { state } = React.useContext(StepItemContext)

    return (
      <div
        ref={ref}
        className={cn(
          "absolute left-[calc(50%+24px)] right-[calc(-50%+14px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted transition-colors duration-300",
          state === "completed" && "bg-primary",
          className,
        )}
        {...props}
      />
    )
  },
)
StepperSeparator.displayName = "StepperSeparator"

/* ------------------------------------------------------------------ */
/*  StepperTitle                                                      */
/* ------------------------------------------------------------------ */

interface StepperTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

const StepperTitle = React.forwardRef<HTMLDivElement, StepperTitleProps>(
  ({ className, ...props }, ref) => {
    const { state } = React.useContext(StepItemContext)

    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 text-sm font-medium transition-colors duration-300",
          state === "active"
            ? "text-foreground font-semibold"
            : state === "completed"
              ? "text-foreground"
              : "text-muted-foreground",
          className,
        )}
        {...props}
      />
    )
  },
)
StepperTitle.displayName = "StepperTitle"

/* ------------------------------------------------------------------ */
/*  StepperDescription                                                */
/* ------------------------------------------------------------------ */

interface StepperDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

const StepperDescription = React.forwardRef<HTMLDivElement, StepperDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-xs text-muted-foreground/70",
          className,
        )}
        {...props}
      />
    )
  },
)
StepperDescription.displayName = "StepperDescription"

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

export {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
}

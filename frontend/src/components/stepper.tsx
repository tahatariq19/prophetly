import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Step } from "@/lib/state";
import { cn } from "@/lib/utils";

interface StepperProps {
  currentStep: Step;
  maxStepReached: Step;
  onStepClick: (step: Step) => void;
}

const steps: { number: Step; label: string; description: string }[] = [
  { number: 1, label: "Upload Data", description: "CSV file or sample" },
  { number: 2, label: "Configure", description: "Model settings" },
  { number: 3, label: "Results", description: "Forecast & metrics" },
];

export function Stepper({
  currentStep,
  maxStepReached,
  onStepClick,
}: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-3 md:gap-8 py-2">
      {steps.map((s, idx) => {
        const isCompleted = currentStep > s.number || maxStepReached > s.number;
        const isActive = currentStep === s.number;
        const isClickable = s.number <= maxStepReached && !isActive;

        return (
          <div key={s.number} className="flex items-center gap-3">
            <Button
              type="button"
              variant={
                isActive ? "default" : isCompleted ? "secondary" : "ghost"
              }
              disabled={!isClickable && !isActive}
              aria-current={isActive ? "step" : undefined}
              onClick={() => isClickable && onStepClick(s.number)}
              className={cn(
                "group h-8 px-3 rounded-full text-xs font-medium transition-all gap-2",
                isActive && "shadow-sm",
                !isClickable && !isActive && "opacity-60 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary-foreground text-primary"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted-foreground/20 text-muted-foreground",
                )}
              >
                {isCompleted && !isActive ? (
                  <Check data-icon="inline-start" className="stroke-[3]" />
                ) : (
                  s.number
                )}
              </span>
              <span className="font-semibold tracking-tight">{s.label}</span>
            </Button>
            {idx < steps.length - 1 && (
              <Separator
                orientation="horizontal"
                className={cn(
                  "w-6 md:w-12 transition-colors",
                  s.number < currentStep ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

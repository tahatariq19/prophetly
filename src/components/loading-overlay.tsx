import { ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface LoadingOverlayProps {
  message: string;
  progress?: number;
  activeStep?: number;
  onCancel?: () => void;
}

export function LoadingOverlay({
  message,
  progress,
  activeStep = 2,
  onCancel,
}: LoadingOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const getStepDescription = () => {
    if (message.toLowerCase().includes("cross-validation")) {
      return "Step 2: Cross-Validation Grid Evaluation";
    }
    if (message.toLowerCase().includes("forecast")) {
      return "Step 2: Prophet Model Fitting & Posterior Prediction";
    }
    return `Step ${activeStep}: Model Processing`;
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-labelledby="loading-title"
      aria-describedby="loading-desc"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200 outline-none"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
        <Spinner aria-hidden="true" className="size-8 text-primary animate-spin" />

        <div className="flex flex-col gap-1 w-full">
          <Badge
            variant="outline"
            className="self-center mb-1 text-[11px] font-semibold tracking-wide uppercase bg-primary/10 text-primary border-primary/20"
          >
            {getStepDescription()}
          </Badge>
          <h3
            id="loading-title"
            className="font-bold text-lg text-foreground tracking-tight text-balance"
          >
            Processing Model
          </h3>
          <p
            id="loading-desc"
            aria-live="polite"
            className="text-xs text-muted-foreground line-clamp-2 px-2"
          >
            {message}
          </p>
        </div>

        {/* Live Progress Bar during Cross-Validation */}
        {progress !== undefined && progress >= 0 && (
          <div aria-live="polite" className="w-full flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground px-0.5">
              <span>Evaluation Progress</span>
              <span className="font-semibold text-primary tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
              <div
                className="bg-primary h-full transition-[width] duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Touchpoint 3: Loading overlay badge */}
        <Badge
          variant="secondary"
          className="gap-1.5 text-[11px] py-1 px-3 bg-muted/80 text-muted-foreground border border-border/50"
        >
          <ShieldCheck aria-hidden="true" className="size-3.5 text-emerald-500" />
          <span>Processing locally via WebAssembly — 100% Private</span>
        </Badge>

        {/* Cancel Button */}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="mt-1 text-xs font-semibold h-8 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
          >
            <X aria-hidden="true" className="size-3.5 mr-1" />
            Cancel Execution
          </Button>
        )}
      </div>
    </div>
  );
}

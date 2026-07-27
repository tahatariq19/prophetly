import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-desc"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all animate-in fade-in duration-200 outline-none"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 shadow-xl max-w-sm text-center">
        <Spinner className="text-primary animate-spin" />
        <div className="flex flex-col gap-1">
          <h3
            id="loading-title"
            className="font-semibold text-lg text-foreground"
          >
            Processing Model
          </h3>
          <p id="loading-desc" className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

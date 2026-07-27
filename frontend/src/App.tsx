import { lazy, Suspense, startTransition, useReducer, useState } from "react";
import { toast } from "sonner";
import { LoadingOverlay } from "@/components/loading-overlay";
import { StepUpload } from "@/components/step-upload";
import { Stepper } from "@/components/stepper";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewTransition } from "@/components/ui/view-transition";
import { fetchCrossValidation, fetchForecast } from "@/lib/api";
import {
  type ActionType,
  appReducer,
  type CVParams,
  type ForecastParams,
  initialAppState,
  type Step,
} from "@/lib/state";
import { useTheme } from "@/lib/theme";
import type { ModelConfig } from "@/lib/types";

const StepConfigure = lazy(() =>
  import("@/components/step-configure").then((m) => ({
    default: m.StepConfigure,
  })),
);
const StepResults = lazy(() =>
  import("@/components/step-results").then((m) => ({ default: m.StepResults })),
);

function StepSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl border-border/60 shadow-lg my-auto p-6 flex flex-col gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex flex-col gap-3 pt-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [maxStepReached, setMaxStepReached] = useState<Step>(1);
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">(
    "forward",
  );

  const setStepWithTransition = (
    nextStep: Step,
    direction: "forward" | "backward" = "forward",
  ) => {
    setStepDirection(direction);
    startTransition(() => {
      dispatch({ type: "SET_STEP", payload: nextStep });
    });
  };

  const handleDataLoaded = (data: typeof state.data, isSample = false) => {
    dispatch({ type: "SET_DATA", payload: { data, isSample } });
  };

  const handleNextStep = () => {
    if (state.step < 3) {
      const nextStep = (state.step + 1) as Step;
      setStepDirection("forward");
      startTransition(() => {
        dispatch({ type: "SET_STEP", payload: nextStep });
        setMaxStepReached((prev) => (nextStep > prev ? nextStep : prev));
      });
    }
  };

  const handleStepClick = (step: Step) => {
    if (step <= maxStepReached) {
      const dir = step > state.step ? "forward" : "backward";
      setStepWithTransition(step, dir);
    }
  };

  const handleReset = () => {
    setStepDirection("backward");
    startTransition(() => {
      dispatch({ type: "RESET" });
      setMaxStepReached(1);
    });
  };

  const handleActionTypeChange = (actionType: ActionType) => {
    dispatch({ type: "SET_ACTION_TYPE", payload: actionType });
  };

  const handleConfigChange = (config: Partial<ModelConfig>) => {
    dispatch({ type: "SET_CONFIG", payload: config });
  };

  const handleForecastParamsChange = (params: Partial<ForecastParams>) => {
    dispatch({ type: "SET_FORECAST_PARAMS", payload: params });
  };

  const handleCVParamsChange = (params: Partial<CVParams>) => {
    dispatch({ type: "SET_CV_PARAMS", payload: params });
  };

  const handleModeChange = (mode: "forecast" | "cross_validation") => {
    startTransition(() => {
      dispatch({ type: "SET_ACTIVE_RESULTS_MODE", payload: mode });
    });
  };

  const handleSubmit = async () => {
    if (state.data.length < 2) {
      toast.error("Please upload a dataset with at least 2 data points first.");
      return;
    }

    if (state.actionType === "forecast") {
      dispatch({
        type: "START_LOADING",
        payload: "Fitting Prophet model & generating forecast...",
      });
      try {
        const result = await fetchForecast({
          data: state.data,
          config: state.config,
          periods: state.forecastParams.periods,
          freq: state.forecastParams.freq,
        });
        setStepDirection("forward");
        startTransition(() => {
          dispatch({ type: "SET_FORECAST_RESULTS", payload: result });
          setMaxStepReached(3);
        });
        toast.success("Forecast generated successfully!");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Forecast request failed.";
        dispatch({ type: "SET_ERROR", payload: msg });
        toast.error(msg);
      }
    } else if (state.actionType === "cross_validation") {
      dispatch({
        type: "START_LOADING",
        payload: "Running cross-validation metrics across cutoffs...",
      });
      try {
        const result = await fetchCrossValidation({
          data: state.data,
          config: state.config,
          initial: state.cvParams.initial,
          period: state.cvParams.period,
          horizon: state.cvParams.horizon,
        });
        setStepDirection("forward");
        startTransition(() => {
          dispatch({ type: "SET_CV_RESULTS", payload: result });
          setMaxStepReached(3);
        });
        toast.success("Cross validation completed!");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Cross validation request failed.";
        dispatch({ type: "SET_ERROR", payload: msg });
        toast.error(msg);
      }
    } else if (state.actionType === "both") {
      dispatch({
        type: "START_LOADING",
        payload: "Fitting Prophet model & running parallel cross-validation...",
      });
      try {
        // Parallelized fetch using Promise.all (Eliminating Waterfall)
        const [forecastRes, cvRes] = await Promise.all([
          fetchForecast({
            data: state.data,
            config: state.config,
            periods: state.forecastParams.periods,
            freq: state.forecastParams.freq,
          }),
          fetchCrossValidation({
            data: state.data,
            config: state.config,
            initial: state.cvParams.initial,
            period: state.cvParams.period,
            horizon: state.cvParams.horizon,
          }),
        ]);

        setStepDirection("forward");
        startTransition(() => {
          dispatch({
            type: "SET_BOTH_RESULTS",
            payload: { forecast: forecastRes, cv: cvRes },
          });
          setMaxStepReached(3);
        });
        toast.success("Forecast and Cross-Validation completed successfully!");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Execution failed.";
        dispatch({ type: "SET_ERROR", payload: msg });
        toast.error(msg);
      }
    }
  };

  const handleRunCVFromResults = async (customParams?: CVParams) => {
    if (state.data.length < 2) return;
    const paramsToUse = customParams || state.cvParams;
    if (customParams) {
      dispatch({ type: "SET_CV_PARAMS", payload: customParams });
    }

    dispatch({
      type: "START_LOADING",
      payload: "Running cross-validation metrics across cutoffs...",
    });
    try {
      const result = await fetchCrossValidation({
        data: state.data,
        config: state.config,
        initial: paramsToUse.initial,
        period: paramsToUse.period,
        horizon: paramsToUse.horizon,
      });
      dispatch({ type: "SET_CV_RESULTS", payload: result });
      toast.success("Cross-validation completed!");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Cross validation request failed.";
      dispatch({ type: "SET_ERROR", payload: msg });
      toast.error(msg);
    }
  };

  const handleRunForecastFromResults = async () => {
    if (state.data.length < 2) return;
    dispatch({
      type: "START_LOADING",
      payload: "Fitting Prophet model & generating forecast...",
    });
    try {
      const result = await fetchForecast({
        data: state.data,
        config: state.config,
        periods: state.forecastParams.periods,
        freq: state.forecastParams.freq,
      });
      dispatch({ type: "SET_FORECAST_RESULTS", payload: result });
      toast.success("Forecast generated successfully!");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Forecast request failed.";
      dispatch({ type: "SET_ERROR", payload: msg });
      toast.error(msg);
    }
  };

  const handleBackToUpload = () => {
    setStepWithTransition(1, "backward");
  };

  const stepAnimationClass =
    stepDirection === "forward"
      ? "animate-slide-in-right"
      : "animate-slide-in-left";

  return (
    <TooltipProvider>
      <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-background text-foreground select-none">
        <h1 className="sr-only">Prophetly — Time Series Forecasting</h1>
        {/* Floating Theme Toggle */}
        <div className="fixed top-3 right-4 z-50">
          <ThemeToggle />
        </div>

        {/* Clean 3-step Indicator */}
        <nav
          aria-label="Wizard Steps Progress"
          className="w-full shrink-0 pt-4 pb-2 px-4 flex justify-center"
        >
          <Stepper
            currentStep={state.step}
            maxStepReached={maxStepReached}
            onStepClick={handleStepClick}
          />
        </nav>

        {/* Step Views with ViewTransition support */}
        <main className="relative flex-1 overflow-hidden">
          {state.step === 1 && (
            <ViewTransition default="none">
              <div className={`h-full w-full ${stepAnimationClass}`}>
                <StepUpload
                  data={state.data}
                  sampleDataLoaded={state.sampleDataLoaded}
                  onDataLoaded={handleDataLoaded}
                  onNext={handleNextStep}
                />
              </div>
            </ViewTransition>
          )}

          {state.step === 2 && (
            <ViewTransition default="none">
              <div className={`h-full w-full ${stepAnimationClass}`}>
                <Suspense fallback={<StepSkeleton />}>
                  <StepConfigure
                    data={state.data}
                    actionType={state.actionType}
                    config={state.config}
                    forecastParams={state.forecastParams}
                    cvParams={state.cvParams}
                    onActionTypeChange={handleActionTypeChange}
                    onConfigChange={handleConfigChange}
                    onForecastParamsChange={handleForecastParamsChange}
                    onCVParamsChange={handleCVParamsChange}
                    onBack={handleBackToUpload}
                    onSubmit={handleSubmit}
                  />
                </Suspense>
              </div>
            </ViewTransition>
          )}

          {state.step === 3 && (
            <ViewTransition default="none">
              <div className={`h-full w-full ${stepAnimationClass}`}>
                <Suspense fallback={<StepSkeleton />}>
                  <StepResults
                    data={state.data}
                    forecastResults={state.forecastResults}
                    cvResults={state.cvResults}
                    cvParams={state.cvParams}
                    activeResultsMode={state.activeResultsMode}
                    onModeChange={handleModeChange}
                    onReset={handleReset}
                    onRunCrossValidation={handleRunCVFromResults}
                    onRunForecast={handleRunForecastFromResults}
                  />
                </Suspense>
              </div>
            </ViewTransition>
          )}
        </main>

        {/* Processing Overlay */}
        {state.isLoading && <LoadingOverlay message={state.loadingMessage} />}

        {/* Dynamic Theme Synced Toast Notifications */}
        <Toaster theme={theme} position="top-right" richColors />
      </div>
    </TooltipProvider>
  );
}

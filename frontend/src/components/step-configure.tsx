import { ArrowLeft, Check, Play, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fetchCountries } from "@/lib/api";
import { calculateTotalDays, constrainCVSplit } from "@/lib/cv-helper";
import type { ActionType, CVParams, ForecastParams } from "@/lib/state";
import type { DataPoint, Holiday, ModelConfig } from "@/lib/types";
import {
  AdvancedModelSection,
  CustomHolidaysSection,
  CVSplitSection,
  GrowthSeasonalitySection,
} from "./configure-sections";

interface StepConfigureProps {
  data: DataPoint[];
  actionType: ActionType;
  config: ModelConfig;
  forecastParams: ForecastParams;
  cvParams: CVParams;
  onActionTypeChange: (actionType: ActionType) => void;
  onConfigChange: (config: Partial<ModelConfig>) => void;
  onForecastParamsChange: (params: Partial<ForecastParams>) => void;
  onCVParamsChange: (params: Partial<CVParams>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  PK: "Pakistan",
  GB: "United Kingdom",
  UK: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  IN: "India",
  AU: "Australia",
  BR: "Brazil",
  JP: "Japan",
  CN: "China",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
};

export function StepConfigure({
  data,
  actionType,
  config,
  forecastParams,
  cvParams,
  onActionTypeChange,
  onConfigChange,
  onForecastParamsChange,
  onCVParamsChange,
  onBack,
  onSubmit,
}: StepConfigureProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const totalDays = useMemo(() => calculateTotalDays(data), [data]);

  const cvSplit = useMemo(() => {
    return constrainCVSplit(
      totalDays,
      cvParams.initialPct ?? 0.6,
      cvParams.horizonPct ?? 0.2,
      cvParams.periodPct ?? 0.2,
    );
  }, [totalDays, cvParams.initialPct, cvParams.horizonPct, cvParams.periodPct]);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  const handleStep2InitialChange = (val: number | readonly number[]) => {
    const num = Array.isArray(val) ? val[0] : (val as number);
    const updated = constrainCVSplit(totalDays, num, cvSplit.horizonPct);
    onCVParamsChange({
      initial: updated.initialStr,
      horizon: updated.horizonStr,
      period: updated.periodStr,
      initialPct: updated.initialPct,
      horizonPct: updated.horizonPct,
      periodPct: updated.periodPct,
    });
  };

  const handleStep2HorizonChange = (val: number | readonly number[]) => {
    const num = Array.isArray(val) ? val[0] : (val as number);
    const updated = constrainCVSplit(totalDays, cvSplit.initialPct, num);
    onCVParamsChange({
      initial: updated.initialStr,
      horizon: updated.horizonStr,
      period: updated.periodStr,
      initialPct: updated.initialPct,
      horizonPct: updated.horizonPct,
      periodPct: updated.periodPct,
    });
  };

  const handleStep2PeriodChange = (val: number | readonly number[]) => {
    const num = Array.isArray(val) ? val[0] : (val as number);
    const updated = constrainCVSplit(
      totalDays,
      cvSplit.initialPct,
      cvSplit.horizonPct,
      num,
    );
    onCVParamsChange({
      initial: updated.initialStr,
      horizon: updated.horizonStr,
      period: updated.periodStr,
      initialPct: updated.initialPct,
      horizonPct: updated.horizonPct,
      periodPct: updated.periodPct,
    });
  };

  const handleAddHoliday = (newHol: Holiday) => {
    onConfigChange({ holidays: [...(config.holidays || []), newHol] });
  };

  const handleRemoveHoliday = (idx: number) => {
    const list = [...(config.holidays || [])];
    list.splice(idx, 1);
    onConfigChange({ holidays: list });
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-4 md:p-6 overflow-hidden">
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col border-border/60 shadow-lg my-auto backdrop-blur-md bg-card/95">
        <CardHeader className="pb-3 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Configure Model
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Tune model parameters and execution mode.
              </CardDescription>
            </div>

            {/* Action Switcher */}
            <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border/50 self-start sm:self-auto">
              <ToggleGroup
                value={[actionType]}
                onValueChange={(val: string[]) =>
                  val[0] && onActionTypeChange(val[0] as ActionType)
                }
                className="gap-1"
              >
                <ToggleGroupItem
                  value="forecast"
                  aria-label="Forecast Mode"
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                >
                  {actionType === "forecast" && (
                    <Check data-icon="inline-start" className="stroke-[3]" />
                  )}
                  Forecast
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="cross_validation"
                  aria-label="Cross Validation"
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                >
                  {actionType === "cross_validation" && (
                    <Check data-icon="inline-start" className="stroke-[3]" />
                  )}
                  Cross-Validate
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="both"
                  aria-label="Forecast + Cross-Validate"
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                >
                  {actionType === "both" && (
                    <Zap
                      data-icon="inline-start"
                      className="text-amber-500 fill-amber-500"
                    />
                  )}
                  Forecast + CV
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <GrowthSeasonalitySection
            config={config}
            onConfigChange={onConfigChange}
            forecastParams={forecastParams}
            onForecastParamsChange={onForecastParamsChange}
            actionType={actionType}
            countries={countries}
            countryNames={COUNTRY_NAMES}
          />

          {(actionType === "cross_validation" || actionType === "both") && (
            <CVSplitSection
              totalDays={totalDays}
              cvSplit={cvSplit}
              onStep2InitialChange={handleStep2InitialChange}
              onStep2HorizonChange={handleStep2HorizonChange}
              onStep2PeriodChange={handleStep2PeriodChange}
            />
          )}

          <CustomHolidaysSection
            holidays={config.holidays}
            onAddHoliday={handleAddHoliday}
            onRemoveHoliday={handleRemoveHoliday}
          />

          <AdvancedModelSection
            config={config}
            onConfigChange={onConfigChange}
            isOpen={isAdvancedOpen}
            onOpenChange={setIsAdvancedOpen}
          />
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4 shrink-0 bg-muted/10">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs"
          >
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            className="text-xs font-bold"
          >
            <Play data-icon="inline-start" className="fill-current" />
            {actionType === "forecast"
              ? "Generate Forecast"
              : actionType === "cross_validation"
                ? "Run Cross Validation"
                : "Run Forecast & CV"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

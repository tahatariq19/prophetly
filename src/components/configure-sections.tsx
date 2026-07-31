import {
  Activity,
  CalendarDays,
  ChevronDown,
  HelpCircle,
  Layers3,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { type ChangeEvent, memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SmartCVSplit as CVSplit } from "@/lib/cv-helper";
import {
  type ActionType,
  defaultConfig,
  type ForecastParams,
} from "@/lib/state";
import type {
  CustomSeasonality,
  Holiday,
  ModelConfig,
  Regressor,
} from "@/lib/types";

export const ResetIndicator = memo(function ResetIndicator({
  isModified,
  onReset,
}: {
  isModified: boolean;
  onReset: () => void;
}) {
  if (!isModified) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Reset to default"
      aria-label="Reset to default"
      onClick={onReset}
      className="size-5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/80 p-0"
    >
      <RotateCcw aria-hidden="true" data-icon="inline-start" className="size-3" />
    </Button>
  );
});

interface GrowthSeasonalitySectionProps {
  config: ModelConfig;
  onConfigChange: (config: Partial<ModelConfig>) => void;
  forecastParams: ForecastParams;
  onForecastParamsChange: (params: Partial<ForecastParams>) => void;
  actionType: ActionType;
  countries: string[];
  countryNames: Record<string, string>;
}

export const GrowthSeasonalitySection = memo(function GrowthSeasonalitySection({
  config,
  onConfigChange,
  forecastParams,
  onForecastParamsChange,
  actionType,
  countries,
  countryNames,
}: GrowthSeasonalitySectionProps) {
  return (
    <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Growth */}
      <Field className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FieldLabel htmlFor="growth" className="text-xs font-medium">
              Growth Model
            </FieldLabel>
            <Tooltip>
              <TooltipTrigger className="cursor-pointer">
                <HelpCircle aria-hidden="true" className="size-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Linear for standard trend, Logistic for bounded growth.
              </TooltipContent>
            </Tooltip>
          </div>
          <ResetIndicator
            isModified={config.growth !== defaultConfig.growth}
            onReset={() => onConfigChange({ growth: defaultConfig.growth })}
          />
        </div>
        <Select
          value={config.growth}
          onValueChange={(val: string | null) =>
            val &&
            onConfigChange({ growth: val as "linear" | "logistic" | "flat" })
          }
        >
          <SelectTrigger id="growth" aria-label="Growth Model" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="linear">Linear Trend</SelectItem>
              <SelectItem value="logistic">
                Logistic (Bounded Growth)
              </SelectItem>
              <SelectItem value="flat">Flat (Constant Trend)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {/* Seasonality Mode */}
      <Field className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FieldLabel
              htmlFor="seasonality_mode"
              className="text-xs font-medium"
            >
              Seasonality Mode
            </FieldLabel>
            <Tooltip>
              <TooltipTrigger className="cursor-pointer">
                <HelpCircle aria-hidden="true" className="size-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Additive (+) or Multiplicative (×) variations.
              </TooltipContent>
            </Tooltip>
          </div>
          <ResetIndicator
            isModified={
              config.seasonality_mode !== defaultConfig.seasonality_mode
            }
            onReset={() =>
              onConfigChange({
                seasonality_mode: defaultConfig.seasonality_mode,
              })
            }
          />
        </div>
        <Select
          value={config.seasonality_mode}
          onValueChange={(val: string | null) =>
            val &&
            onConfigChange({
              seasonality_mode: val as "additive" | "multiplicative",
            })
          }
        >
          <SelectTrigger id="seasonality_mode" aria-label="Seasonality Mode" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="additive">Additive (+)</SelectItem>
              <SelectItem value="multiplicative">Multiplicative (×)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {/* Forecast Params (if forecast or both) */}
      {(actionType === "forecast" || actionType === "both") && (
        <>
          <Field className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="periods" className="text-xs font-medium">
              Forecast Periods
            </FieldLabel>
            <Input
              id="periods"
              aria-label="Forecast Periods"
              type="number"
              autoComplete="off"
              min={1}
              max={3650}
              value={forecastParams.periods}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onForecastParamsChange({
                  periods: Math.max(1, parseInt(e.target.value, 10) || 30),
                })
              }
              className="h-9 text-xs"
            />
          </Field>

          <Field className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="freq" className="text-xs font-medium">
              Frequency
            </FieldLabel>
            <Select
              value={forecastParams.freq}
              onValueChange={(val: string | null) =>
                val && onForecastParamsChange({ freq: val })
              }
            >
              <SelectTrigger id="freq" aria-label="Frequency" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="D">Daily (D)</SelectItem>
                  <SelectItem value="W">Weekly (W)</SelectItem>
                  <SelectItem value="M">Monthly (M)</SelectItem>
                  <SelectItem value="H">Hourly (H)</SelectItem>
                  <SelectItem value="Y">Yearly (Y)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {/* Country Holidays */}
      <Field className="flex flex-col gap-1.5 md:col-span-2">
        <div className="flex items-center justify-between">
          <FieldLabel
            htmlFor="country_holidays"
            className="text-xs font-medium"
          >
            Built-in Country Holidays
          </FieldLabel>
          <ResetIndicator
            isModified={config.country_holidays !== undefined}
            onReset={() => onConfigChange({ country_holidays: undefined })}
          />
        </div>
        <Select
          value={config.country_holidays || "none"}
          onValueChange={(val: string | null) =>
            onConfigChange({
              country_holidays: !val || val === "none" ? undefined : val,
            })
          }
        >
          <SelectTrigger id="country_holidays" aria-label="Built-in Country Holidays" className="h-9 text-xs">
            <SelectValue placeholder="Select country…" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            <SelectGroup>
              <SelectItem value="none">None</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c} {countryNames[c] ? `— ${countryNames[c]}` : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
});

interface CVSplitSectionProps {
  totalDays: number;
  cvSplit: CVSplit;
  onStep2InitialChange: (val: number | readonly number[]) => void;
  onStep2HorizonChange: (val: number | readonly number[]) => void;
  onStep2PeriodChange: (val: number | readonly number[]) => void;
}

export const CVSplitSection = memo(function CVSplitSection({
  totalDays,
  cvSplit,
  onStep2InitialChange,
  onStep2HorizonChange,
  onStep2PeriodChange,
}: CVSplitSectionProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity aria-hidden="true" className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Smart Cross-Validation Split
          </span>
        </div>
        <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
          Span: {totalDays} days
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>Timeline Partition (100% Total)</span>
          <span className="font-mono tabular-nums">
            {cvSplit.initialDays + cvSplit.horizonDays + cvSplit.periodDays} /{" "}
            {totalDays} days
          </span>
        </div>

        <div className="h-3.5 w-full rounded-md overflow-hidden flex bg-muted p-0.5 border border-border/40 gap-0.5">
          <div
            className="h-full bg-primary rounded-xs transition-[width] duration-200 flex items-center justify-center text-[9px] font-bold text-primary-foreground overflow-hidden"
            style={{ width: `${cvSplit.initialPct * 100}%` }}
            title={`Initial Training: ${(cvSplit.initialPct * 100).toFixed(0)}%`}
          >
            {cvSplit.initialPct >= 0.25 &&
              `Training ${(cvSplit.initialPct * 100).toFixed(0)}%`}
          </div>
          <div
            className="h-full bg-chart-2 rounded-xs transition-[width] duration-200 flex items-center justify-center text-[9px] font-bold text-background overflow-hidden"
            style={{ width: `${cvSplit.horizonPct * 100}%` }}
            title={`Forecast Horizon: ${(cvSplit.horizonPct * 100).toFixed(0)}%`}
          >
            {cvSplit.horizonPct >= 0.15 &&
              `Horizon ${(cvSplit.horizonPct * 100).toFixed(0)}%`}
          </div>
          <div
            className="h-full bg-muted-foreground/40 rounded-xs transition-[width] duration-200 flex items-center justify-center text-[9px] text-foreground font-semibold overflow-hidden"
            style={{ width: `${cvSplit.periodPct * 100}%` }}
            title={`Cutoff Step Period: ${(cvSplit.periodPct * 100).toFixed(0)}%`}
          >
            {cvSplit.periodPct >= 0.1 &&
              `Step ${(cvSplit.periodPct * 100).toFixed(0)}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <Label className="text-[11px] font-semibold">
              Initial Training
            </Label>
            <span className="font-mono text-muted-foreground text-[11px] tabular-nums">
              {cvSplit.initialLabel || cvSplit.initialStr} ({(cvSplit.initialPct * 100).toFixed(0)}%)
            </span>
          </div>
          <Slider
            min={0.3}
            max={0.85}
            step={0.05}
            value={cvSplit.initialPct}
            onValueChange={onStep2InitialChange}
            aria-label="Initial Training Split"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <Label className="text-[11px] font-semibold">
              Forecast Horizon
            </Label>
            <span className="font-mono text-muted-foreground text-[11px] tabular-nums">
              {cvSplit.horizonLabel || cvSplit.horizonStr} ({(cvSplit.horizonPct * 100).toFixed(0)}%)
            </span>
          </div>
          <Slider
            min={0.05}
            max={0.4}
            step={0.05}
            value={cvSplit.horizonPct}
            onValueChange={onStep2HorizonChange}
            aria-label="Forecast Horizon Split"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <Label className="text-[11px] font-semibold">
              Cutoff Step Period
            </Label>
            <span className="font-mono text-muted-foreground text-[11px] tabular-nums">
              {cvSplit.periodLabel || cvSplit.periodStr} ({(cvSplit.periodPct * 100).toFixed(0)}%)
            </span>
          </div>
          <Slider
            min={0.025}
            max={0.3}
            step={0.025}
            value={cvSplit.periodPct}
            onValueChange={onStep2PeriodChange}
            aria-label="Cutoff Step Period Split"
          />
        </div>
      </div>
    </div>
  );
});

interface CustomHolidaysSectionProps {
  holidays?: Holiday[];
  onAddHoliday: (h: Holiday) => void;
  onRemoveHoliday: (idx: number) => void;
}

export const CustomHolidaysSection = memo(function CustomHolidaysSection({
  holidays = [],
  onAddHoliday,
  onRemoveHoliday,
}: CustomHolidaysSectionProps) {
  const [name, setName] = useState("");
  const [ds, setDs] = useState("");
  const [lower, setLower] = useState(0);
  const [upper, setUpper] = useState(0);

  const handleAdd = () => {
    if (!name || !ds) return;
    onAddHoliday({
      holiday: name,
      ds,
      lower_window: lower,
      upper_window: upper,
    });
    setName("");
    setDs("");
    setLower(0);
    setUpper(0);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Custom Holidays
          </span>
        </div>
        {holidays.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {holidays.length} holiday{holidays.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {holidays.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {holidays.map((h, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded border bg-background px-3 py-1 text-xs"
            >
              <span className="font-semibold">{h.holiday}</span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {h.ds} ([-{h.lower_window}, +{h.upper_window}])
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveHoliday(idx)}
                aria-label={`Remove holiday ${h.holiday}`}
                className="size-6 text-destructive hover:bg-destructive/10 p-0"
              >
                <Trash2 aria-hidden="true" className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
        <Input
          id="holiday-name"
          aria-label="Holiday Name"
          autoComplete="off"
          placeholder="Holiday Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-xs sm:col-span-1"
        />
        <Input
          id="holiday-date"
          aria-label="Holiday Date"
          type="date"
          autoComplete="off"
          value={ds}
          onChange={(e) => setDs(e.target.value)}
          className="h-8 text-xs sm:col-span-1"
        />
        <div className="flex items-center gap-1 sm:col-span-1">
          <Input
            id="holiday-lower"
            aria-label="Holiday Lower Window"
            type="number"
            autoComplete="off"
            placeholder="Lower"
            value={lower}
            onChange={(e) => setLower(parseInt(e.target.value, 10) || 0)}
            className="h-8 text-xs"
          />
          <Input
            id="holiday-upper"
            aria-label="Holiday Upper Window"
            type="number"
            autoComplete="off"
            placeholder="Upper"
            value={upper}
            onChange={(e) => setUpper(parseInt(e.target.value, 10) || 0)}
            className="h-8 text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={!name || !ds}
          className="h-8 text-xs gap-1 sm:col-span-1"
        >
          <Plus aria-hidden="true" data-icon="inline-start" /> Add
        </Button>
      </div>
    </div>
  );
});

interface AdvancedModelSectionProps {
  config: ModelConfig;
  onConfigChange: (config: Partial<ModelConfig>) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdvancedModelSection = memo(function AdvancedModelSection({
  config,
  onConfigChange,
  isOpen,
  onOpenChange,
}: AdvancedModelSectionProps) {
  const [seasName, setSeasName] = useState("");
  const [seasPeriod, setSeasPeriod] = useState<number>(30.5);
  const [seasFourier, setSeasFourier] = useState<number>(5);
  const [regName, setRegName] = useState("");
  const [cpDate, setCpDate] = useState("");

  const handleAddSeasonality = () => {
    if (!seasName || seasPeriod <= 0) return;
    const newSeas: CustomSeasonality = {
      name: seasName,
      period: seasPeriod,
      fourier_order: seasFourier,
    };
    onConfigChange({
      custom_seasonalities: [...(config.custom_seasonalities || []), newSeas],
    });
    setSeasName("");
  };

  const handleRemoveSeasonality = (idx: number) => {
    const list = [...(config.custom_seasonalities || [])];
    list.splice(idx, 1);
    onConfigChange({ custom_seasonalities: list });
  };

  const handleAddRegressor = () => {
    if (!regName) return;
    const newReg: Regressor = { name: regName, standardize: true };
    onConfigChange({ regressors: [...(config.regressors || []), newReg] });
    setRegName("");
  };

  const handleRemoveRegressor = (idx: number) => {
    const list = [...(config.regressors || [])];
    list.splice(idx, 1);
    onConfigChange({ regressors: list });
  };

  const handleAddChangepointDate = () => {
    if (!cpDate) return;
    const current = config.changepoints || [];
    if (!current.includes(cpDate)) {
      onConfigChange({ changepoints: [...current, cpDate] });
    }
    setCpDate("");
  };

  const handleRemoveChangepointDate = (idx: number) => {
    const list = [...(config.changepoints || [])];
    list.splice(idx, 1);
    onConfigChange({ changepoints: list });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between p-2 h-9 text-xs font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted/50 cursor-pointer">
        <span className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Advanced Model Settings
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 flex flex-col gap-5 animate-in fade-in">
        {/* Changepoints */}
        <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-pretty">
            Changepoints
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <FieldLabel className="text-xs">
                  Potential Changepoints
                </FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{config.n_changepoints}</span>
                  <ResetIndicator
                    isModified={
                      config.n_changepoints !== defaultConfig.n_changepoints
                    }
                    onReset={() =>
                      onConfigChange({
                        n_changepoints: defaultConfig.n_changepoints,
                      })
                    }
                  />
                </div>
              </div>
              <Input
                id="n_changepoints"
                aria-label="Number of Changepoints"
                type="number"
                autoComplete="off"
                min={0}
                max={100}
                value={config.n_changepoints}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onConfigChange({
                    n_changepoints: Math.max(
                      0,
                      Math.min(100, parseInt(e.target.value, 10) || 25),
                    ),
                  })
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <FieldLabel className="text-xs">
                  Changepoint Prior Scale
                </FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{config.changepoint_prior_scale}</span>
                  <ResetIndicator
                    isModified={
                      config.changepoint_prior_scale !==
                      defaultConfig.changepoint_prior_scale
                    }
                    onReset={() =>
                      onConfigChange({
                        changepoint_prior_scale:
                          defaultConfig.changepoint_prior_scale,
                      })
                    }
                  />
                </div>
              </div>
              <Slider
                min={0.001}
                max={0.5}
                step={0.005}
                value={config.changepoint_prior_scale}
                onValueChange={(val: number | readonly number[]) => {
                  const num = Array.isArray(val) ? val[0] : (val as number);
                  onConfigChange({
                    changepoint_prior_scale: Number(num.toFixed(3)),
                  });
                }}
                aria-label="Changepoint Prior Scale"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <div className="flex justify-between items-center text-xs">
                <FieldLabel className="text-xs">Changepoint Range</FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{(config.changepoint_range * 100).toFixed(0)}%</span>
                  <ResetIndicator
                    isModified={
                      config.changepoint_range !==
                      defaultConfig.changepoint_range
                    }
                    onReset={() =>
                      onConfigChange({
                        changepoint_range: defaultConfig.changepoint_range,
                      })
                    }
                  />
                </div>
              </div>
              <Slider
                min={0.5}
                max={0.95}
                step={0.05}
                value={config.changepoint_range}
                onValueChange={(val: number | readonly number[]) => {
                  const num = Array.isArray(val) ? val[0] : (val as number);
                  onConfigChange({ changepoint_range: num });
                }}
                aria-label="Changepoint Range"
              />
            </div>
          </div>

          <div className="pt-2 border-t flex flex-col gap-2">
            <FieldLabel className="text-xs font-semibold">
              Manual Changepoint Dates
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="manual-changepoint-date"
                aria-label="Manual Changepoint Date"
                type="date"
                autoComplete="off"
                value={cpDate}
                onChange={(e) => setCpDate(e.target.value)}
                className="h-8 text-xs max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddChangepointDate}
                disabled={!cpDate}
                className="h-8 text-xs gap-1"
              >
                <Plus aria-hidden="true" data-icon="inline-start" /> Add Date
              </Button>
            </div>
            {config.changepoints && config.changepoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {config.changepoints.map((d, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="gap-1 font-mono text-[11px] tabular-nums"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveChangepointDate(idx)}
                      aria-label={`Remove changepoint date ${d}`}
                      className="hover:text-destructive cursor-pointer"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prior Scales Sliders */}
        <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-pretty">
            Seasonality & Holiday Prior Scales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <FieldLabel className="text-xs">
                  Seasonality Prior Scale
                </FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{config.seasonality_prior_scale}</span>
                  <ResetIndicator
                    isModified={
                      config.seasonality_prior_scale !==
                      defaultConfig.seasonality_prior_scale
                    }
                    onReset={() =>
                      onConfigChange({
                        seasonality_prior_scale:
                          defaultConfig.seasonality_prior_scale,
                      })
                    }
                  />
                </div>
              </div>
              <Slider
                min={0.1}
                max={50.0}
                step={0.5}
                value={config.seasonality_prior_scale}
                onValueChange={(val: number | readonly number[]) => {
                  const num = Array.isArray(val) ? val[0] : (val as number);
                  onConfigChange({ seasonality_prior_scale: num });
                }}
                aria-label="Seasonality Prior Scale"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <FieldLabel className="text-xs">
                  Holidays Prior Scale
                </FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{config.holidays_prior_scale}</span>
                  <ResetIndicator
                    isModified={
                      config.holidays_prior_scale !==
                      defaultConfig.holidays_prior_scale
                    }
                    onReset={() =>
                      onConfigChange({
                        holidays_prior_scale:
                          defaultConfig.holidays_prior_scale,
                      })
                    }
                  />
                </div>
              </div>
              <Slider
                min={0.1}
                max={50.0}
                step={0.5}
                value={config.holidays_prior_scale}
                onValueChange={(val: number | readonly number[]) => {
                  const num = Array.isArray(val) ? val[0] : (val as number);
                  onConfigChange({ holidays_prior_scale: num });
                }}
                aria-label="Holidays Prior Scale"
              />
            </div>
          </div>
        </div>

        {/* Custom Seasonalities Section */}
        <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers3 aria-hidden="true" className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Custom Seasonalities
              </span>
            </div>
            {config.custom_seasonalities &&
              config.custom_seasonalities.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {config.custom_seasonalities.length}
                </Badge>
              )}
          </div>

          {config.custom_seasonalities &&
            config.custom_seasonalities.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {config.custom_seasonalities.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border bg-background px-3 py-1 text-xs"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      Period: {s.period}d (Fourier {s.fourier_order})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSeasonality(idx)}
                      aria-label={`Remove seasonality ${s.name}`}
                      className="size-6 text-destructive hover:bg-destructive/10 p-0"
                    >
                      <Trash2 aria-hidden="true" className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <Input
              id="seasonality-name"
              aria-label="Seasonality Name"
              autoComplete="off"
              placeholder="Seasonality Name"
              value={seasName}
              onChange={(e) => setSeasName(e.target.value)}
              className="h-8 text-xs sm:col-span-1"
            />
            <Input
              id="seasonality-period"
              aria-label="Seasonality Period"
              type="number"
              autoComplete="off"
              placeholder="Period (days)"
              value={seasPeriod}
              onChange={(e) =>
                setSeasPeriod(parseFloat(e.target.value) || 30.5)
              }
              className="h-8 text-xs sm:col-span-1"
            />
            <Input
              id="seasonality-fourier"
              aria-label="Seasonality Fourier Order"
              type="number"
              autoComplete="off"
              placeholder="Fourier Order"
              value={seasFourier}
              onChange={(e) =>
                setSeasFourier(parseInt(e.target.value, 10) || 5)
              }
              className="h-8 text-xs sm:col-span-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddSeasonality}
              disabled={!seasName || seasPeriod <= 0}
              className="h-8 text-xs gap-1 sm:col-span-1"
            >
              <Plus aria-hidden="true" data-icon="inline-start" /> Add
            </Button>
          </div>
        </div>

        {/* Additional Regressors Section */}
        <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity aria-hidden="true" className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Additional Regressors
              </span>
            </div>
            {config.regressors && config.regressors.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {config.regressors.length}
              </Badge>
            )}
          </div>

          {config.regressors && config.regressors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {config.regressors.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border bg-background px-3 py-1 text-xs"
                >
                  <span className="font-semibold">{r.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRegressor(idx)}
                    aria-label={`Remove regressor ${r.name}`}
                    className="size-6 text-destructive hover:bg-destructive/10 p-0"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Input
              id="regressor-name"
              aria-label="Regressor Column Name"
              placeholder="Regressor Column Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="h-8 text-xs max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRegressor}
              disabled={!regName}
              className="h-8 text-xs gap-1"
            >
              <Plus data-icon="inline-start" aria-hidden="true" /> Add Regressor
            </Button>
          </div>
        </div>

        {/* Seasonalities Toggles */}
        <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-pretty">
              Seasonality Components
            </h4>
            <ResetIndicator
              isModified={
                config.yearly_seasonality === false ||
                config.weekly_seasonality === false ||
                config.daily_seasonality === false
              }
              onReset={() =>
                onConfigChange({
                  yearly_seasonality: "auto",
                  weekly_seasonality: "auto",
                  daily_seasonality: "auto",
                })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center justify-between border rounded p-2 bg-background">
              <div className="flex items-center gap-1">
                <span>Yearly</span>
                <ResetIndicator
                  isModified={config.yearly_seasonality === false}
                  onReset={() => onConfigChange({ yearly_seasonality: "auto" })}
                />
              </div>
              <Switch
                checked={config.yearly_seasonality !== false}
                aria-label="Toggle yearly seasonality"
                onCheckedChange={(checked: boolean) =>
                  onConfigChange({
                    yearly_seasonality: checked ? "auto" : false,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between border rounded p-2 bg-background">
              <div className="flex items-center gap-1">
                <span>Weekly</span>
                <ResetIndicator
                  isModified={config.weekly_seasonality === false}
                  onReset={() => onConfigChange({ weekly_seasonality: "auto" })}
                />
              </div>
              <Switch
                checked={config.weekly_seasonality !== false}
                aria-label="Toggle weekly seasonality"
                onCheckedChange={(checked: boolean) =>
                  onConfigChange({
                    weekly_seasonality: checked ? "auto" : false,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between border rounded p-2 bg-background">
              <div className="flex items-center gap-1">
                <span>Daily</span>
                <ResetIndicator
                  isModified={config.daily_seasonality === false}
                  onReset={() => onConfigChange({ daily_seasonality: "auto" })}
                />
              </div>
              <Switch
                checked={config.daily_seasonality !== false}
                aria-label="Toggle daily seasonality"
                onCheckedChange={(checked: boolean) =>
                  onConfigChange({
                    daily_seasonality: checked ? "auto" : false,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Uncertainty & MCMC */}
        <div className="flex flex-col gap-3 rounded-lg border p-3.5 bg-muted/20">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-pretty">
            Uncertainty & MCMC
          </h4>
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <FieldLabel className="text-xs">Interval Width</FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{(config.interval_width * 100).toFixed(0)}%</span>
                  <ResetIndicator
                    isModified={
                      config.interval_width !== defaultConfig.interval_width
                    }
                    onReset={() =>
                      onConfigChange({
                        interval_width: defaultConfig.interval_width,
                      })
                    }
                  />
                </div>
              </div>
              <Slider
                min={0.5}
                max={0.99}
                step={0.05}
                value={config.interval_width}
                onValueChange={(val: number | readonly number[]) => {
                  const num = Array.isArray(val) ? val[0] : (val as number);
                  onConfigChange({ interval_width: num });
                }}
                aria-label="Interval Width"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t">
              <div className="flex justify-between items-center">
                <FieldLabel className="text-xs">
                  MCMC Samples (Uncertainty)
                </FieldLabel>
                <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                  <span>{config.mcmc_samples}</span>
                  <ResetIndicator
                    isModified={
                      config.mcmc_samples !== defaultConfig.mcmc_samples
                    }
                    onReset={() =>
                      onConfigChange({
                        mcmc_samples: defaultConfig.mcmc_samples,
                      })
                    }
                  />
                </div>
              </div>
              <Input
                id="mcmc_samples"
                aria-label="MCMC Samples"
                type="number"
                autoComplete="off"
                min={0}
                max={100}
                value={config.mcmc_samples}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onConfigChange({
                    mcmc_samples: Math.max(
                      0,
                      Math.min(100, parseInt(e.target.value, 10) || 0),
                    ),
                  })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

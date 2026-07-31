import { Activity, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { calculateTotalDays, constrainCVSplit } from "@/lib/cv-helper";
import type { CVParams } from "@/lib/state";
import type { DataPoint } from "@/lib/types";

interface CVConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DataPoint[];
  cvParams: CVParams;
  freq?: string;
  onConfirm: (params: CVParams) => void;
}

export function CVConfigDialog({
  open,
  onOpenChange,
  data,
  cvParams,
  freq = "D",
  onConfirm,
}: CVConfigDialogProps) {
  const totalDays = useMemo(() => calculateTotalDays(data), [data]);

  const [initPct, setInitPct] = useState(cvParams.initialPct ?? 0.6);
  const [horizPct, setHorizPct] = useState(cvParams.horizonPct ?? 0.2);
  const [perPct, setPerPct] = useState(cvParams.periodPct ?? 0.2);

  // Strict 3-way partition (sum = 100%)
  const split = useMemo(() => {
    return constrainCVSplit(totalDays, initPct, horizPct, perPct, freq);
  }, [totalDays, initPct, horizPct, perPct, freq]);

  const handleInitialChange = (val: number | readonly number[]) => {
    const targetInit = Array.isArray(val) ? val[0] : (val as number);
    const newSplit = constrainCVSplit(totalDays, targetInit, horizPct, undefined, freq);
    setInitPct(newSplit.initialPct);
    setHorizPct(newSplit.horizonPct);
    setPerPct(newSplit.periodPct);
  };

  const handleHorizonChange = (val: number | readonly number[]) => {
    const targetHoriz = Array.isArray(val) ? val[0] : (val as number);
    const newSplit = constrainCVSplit(totalDays, initPct, targetHoriz, undefined, freq);
    setInitPct(newSplit.initialPct);
    setHorizPct(newSplit.horizonPct);
    setPerPct(newSplit.periodPct);
  };

  const handlePeriodChange = (val: number | readonly number[]) => {
    const targetPer = Array.isArray(val) ? val[0] : (val as number);
    const newSplit = constrainCVSplit(totalDays, initPct, horizPct, targetPer, freq);
    setInitPct(newSplit.initialPct);
    setHorizPct(newSplit.horizonPct);
    setPerPct(newSplit.periodPct);
  };

  const handleConfirm = () => {
    onConfirm({
      initial: split.initialStr,
      horizon: split.horizonStr,
      period: split.periodStr,
      initialPct: split.initialPct,
      horizonPct: split.horizonPct,
      periodPct: split.periodPct,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <Activity aria-hidden="true" className="size-5 text-primary" />
              <DialogTitle>Configure Cross-Validation Split</DialogTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs tabular-nums">
              Span: {totalDays} days
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Strict 100% Timeline Partition: Initial Training + Forecast Horizon
            + Cutoff Step Period = 100.0%.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* Visual 100% Timeline Split Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Timeline Partition (100% Total)</span>
              <span className="font-mono tabular-nums">
                {split.initialDays + split.horizonDays + split.periodDays} /{" "}
                {totalDays} days
              </span>
            </div>

            <div className="h-4 w-full rounded-md overflow-hidden flex bg-muted p-0.5 border border-border/40 gap-0.5">
              <div
                className="h-full bg-primary rounded-xs transition-[width] duration-200 flex items-center justify-center text-[10px] font-bold text-primary-foreground overflow-hidden"
                style={{ width: `${split.initialPct * 100}%` }}
                title={`Initial Training: ${(split.initialPct * 100).toFixed(0)}%`}
              >
                {split.initialPct >= 0.25 &&
                  `Training ${(split.initialPct * 100).toFixed(0)}%`}
              </div>
              <div
                className="h-full bg-chart-2 rounded-xs transition-[width] duration-200 flex items-center justify-center text-[10px] font-bold text-background overflow-hidden"
                style={{ width: `${split.horizonPct * 100}%` }}
                title={`Forecast Horizon: ${(split.horizonPct * 100).toFixed(0)}%`}
              >
                {split.horizonPct >= 0.15 &&
                  `Horizon ${(split.horizonPct * 100).toFixed(0)}%`}
              </div>
              <div
                className="h-full bg-muted-foreground/40 rounded-xs transition-[width] duration-200 flex items-center justify-center text-[10px] text-foreground font-semibold overflow-hidden"
                style={{ width: `${split.periodPct * 100}%` }}
                title={`Cutoff Step Period: ${(split.periodPct * 100).toFixed(0)}%`}
              >
                {split.periodPct >= 0.1 &&
                  `Step ${(split.periodPct * 100).toFixed(0)}%`}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary inline-block" />
                Training:{" "}
                <strong className="text-foreground">{split.initialLabel || split.initialStr}</strong>{" "}
                ({(split.initialPct * 100).toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-chart-2 inline-block" />
                Horizon:{" "}
                <strong className="text-foreground">{split.horizonLabel || split.horizonStr}</strong>{" "}
                ({(split.horizonPct * 100).toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted-foreground/60 inline-block" />
                Step:{" "}
                <strong className="text-foreground">{split.periodLabel || split.periodStr}</strong> (
                {(split.periodPct * 100).toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* Smart Sliders */}
          <div className="flex flex-col gap-4 rounded-lg border p-4 bg-muted/20">
            {/* Initial Training Slider */}
            <Field className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <FieldLabel className="font-semibold">
                  Initial Training Split
                </FieldLabel>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {split.initialLabel || split.initialStr} ({(split.initialPct * 100).toFixed(0)}%)
                </span>
              </div>
              <Slider
                min={0.3}
                max={0.85}
                step={0.05}
                value={split.initialPct}
                onValueChange={handleInitialChange}
                aria-label="Initial Training Split"
              />
            </Field>

            {/* Forecast Horizon Slider */}
            <Field className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <FieldLabel className="font-semibold">
                  Forecast Horizon
                </FieldLabel>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {split.horizonLabel || split.horizonStr} ({(split.horizonPct * 100).toFixed(0)}%)
                </span>
              </div>
              <Slider
                min={0.05}
                max={0.4}
                step={0.05}
                value={split.horizonPct}
                onValueChange={handleHorizonChange}
                aria-label="Forecast Horizon"
              />
            </Field>

            {/* Cutoff Step Period Slider */}
            <Field className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <FieldLabel className="font-semibold">
                  Cutoff Step Period
                </FieldLabel>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {split.periodLabel || split.periodStr} ({(split.periodPct * 100).toFixed(0)}%)
                </span>
              </div>
              <Slider
                min={0.025}
                max={0.3}
                step={0.025}
                value={split.periodPct}
                onValueChange={handlePeriodChange}
                aria-label="Cutoff Step Period"
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="text-xs font-bold"
          >
            <Play aria-hidden="true" data-icon="inline-start" className="fill-current" />
            Run Cross-Validation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

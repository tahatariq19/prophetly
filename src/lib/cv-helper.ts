import type { DataPoint } from "./types";

export interface SmartCVSplit {
  totalDays: number;
  initialPct: number;
  horizonPct: number;
  periodPct: number;
  initialDays: number;
  horizonDays: number;
  periodDays: number;
  initialStr: string;
  horizonStr: string;
  periodStr: string;
  initialLabel: string;
  horizonLabel: string;
  periodLabel: string;
}

export function calculateTotalDays(data: DataPoint[]): number {
  if (!data || data.length < 2) return 365;
  const timestamps = data
    .map((d) => new Date(d.ds).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  if (timestamps.length < 2) return 365;

  const diffMs = timestamps[timestamps.length - 1] - timestamps[0];
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 14);
}

export function formatDaysWithFreq(days: number, freqCode: string = "D"): string {
  if (days <= 0) return `${days} days`;
  if (freqCode === "M") {
    const months = Math.round(days / 30.4375);
    if (months >= 1) {
      return `${months} month${months > 1 ? "s" : ""} (~${days} days)`;
    }
  } else if (freqCode === "W") {
    const weeks = Math.round(days / 7);
    if (weeks >= 1) {
      return `${weeks} week${weeks > 1 ? "s" : ""} (~${days} days)`;
    }
  } else if (freqCode === "Y") {
    const years = (days / 365.25).toFixed(1).replace(/\.0$/, "");
    if (Number(years) >= 1) {
      return `${years} year${years !== "1" ? "s" : ""} (~${days} days)`;
    }
  } else if (freqCode === "H") {
    const hours = days * 24;
    return `${hours} hours (${days} days)`;
  }
  return `${days} days`;
}

export function formatHorizonLabel(horizonStr: string, freqCode: string = "D"): string {
  if (!horizonStr) return horizonStr;
  const match = horizonStr.match(/^(\d+(?:\.\d+)?)\s*days?/i);
  if (!match) return horizonStr;
  const days = Math.round(Number.parseFloat(match[1]));
  if (freqCode === "M") {
    const months = Math.round(days / 30.4375);
    if (months >= 1) {
      return `${days} days (${months} mo)`;
    }
  } else if (freqCode === "W") {
    const weeks = Math.round(days / 7);
    if (weeks >= 1) {
      return `${days} days (${weeks} wk)`;
    }
  } else if (freqCode === "Y") {
    const years = (days / 365.25).toFixed(1).replace(/\.0$/, "");
    if (Number(years) >= 1) {
      return `${days} days (${years} yr)`;
    }
  }
  return horizonStr;
}

/**
 * Strict 3-way partition: Initial % + Horizon % + Step Period % = 100% EXPLICITLY ALWAYS.
 */
export function constrainCVSplit(
  totalDays: number,
  targetInitialPct: number,
  targetHorizonPct: number,
  targetPeriodPct?: number,
  freqCode: string = "D",
): SmartCVSplit {
  // 1. Clamp Initial between 30% and 85%
  let initialPct = Number(
    Math.min(0.85, Math.max(0.3, targetInitialPct)).toFixed(2),
  );

  // 2. Max possible Horizon leaves at least 2.5% for period
  const maxHorizon = Number((0.975 - initialPct).toFixed(2));
  let horizonPct = Number(
    Math.min(maxHorizon, Math.max(0.05, targetHorizonPct)).toFixed(2),
  );

  // If period was explicitly specified, adjust horizon to accommodate it
  if (targetPeriodPct !== undefined) {
    const targetP = Number(
      Math.min(0.3, Math.max(0.025, targetPeriodPct)).toFixed(2),
    );
    const maxH = Number((1.0 - initialPct - targetP).toFixed(2));
    if (maxH >= 0.05) {
      horizonPct = maxH;
    } else {
      initialPct = Number((1.0 - horizonPct - targetP).toFixed(2));
    }
  }

  // 3. Period is ALWAYS strictly the exact remainder so sum is 100%
  let periodPct = Number(
    Math.max(0.025, 1.0 - initialPct - horizonPct).toFixed(2),
  );

  // Fine-tune floating point rounding to guarantee sum is exactly 1.00 (100%)
  const sum = Number((initialPct + horizonPct + periodPct).toFixed(2));
  if (sum !== 1.0) {
    periodPct = Number((1.0 - initialPct - horizonPct).toFixed(2));
  }

  // 4. Calculate exact days
  const initialDays = Math.max(7, Math.round(totalDays * initialPct));
  const horizonDays = Math.max(3, Math.round(totalDays * horizonPct));
  const periodDays = Math.max(1, Math.round(totalDays * periodPct));

  return {
    totalDays,
    initialPct,
    horizonPct,
    periodPct,
    initialDays,
    horizonDays,
    periodDays,
    initialStr: `${initialDays} days`,
    horizonStr: `${horizonDays} days`,
    periodStr: `${periodDays} days`,
    initialLabel: formatDaysWithFreq(initialDays, freqCode),
    horizonLabel: formatDaysWithFreq(horizonDays, freqCode),
    periodLabel: formatDaysWithFreq(periodDays, freqCode),
  };
}

export const computeCVSplitStrings = constrainCVSplit;


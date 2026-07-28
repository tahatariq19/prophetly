import initProphet, {
  Prophet,
  type ProphetHoliday,
  type ProphetOptions,
  type ProphetPredictionData,
  type ProphetSeasonalityOption,
  type ProphetTrainingData,
} from "@bsull/augurs/prophet";
import { optimizer } from "@bsull/augurs-prophet-wasmstan";
import Holidays from "date-holidays";
import type {
  ComponentData,
  CrossValidationRequest,
  CrossValidationResponse,
  DataPoint,
  ForecastPoint,
  ForecastRequest,
  ForecastResponse,
  ModelConfig,
  PerformanceMetrics,
} from "./types";

let wasmInitPromise: Promise<unknown> | null = null;
let cancelRequested = false;
let activeCvRequestId: string | null = null;

export async function ensureWasmInitialized(
  customBuffer?: ArrayBuffer | Uint8Array,
): Promise<unknown> {
  if (!wasmInitPromise) {
    wasmInitPromise = initProphet(customBuffer);
  }
  return wasmInitPromise;
}

export function requestCrossValidationCancel(targetId?: string): void {
  if (!targetId || !activeCvRequestId || targetId === activeCvRequestId) {
    cancelRequested = true;
  }
}

export function parseTimestamp(ds: string | number): number {
  if (typeof ds === "number") return Math.floor(ds);
  if (typeof ds !== "string") return 0;
  const str = ds.trim();
  if (!str) return 0;

  const hasTz = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(str);

  let parseable = str;
  if (!hasTz) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      parseable = `${str}T00:00:00Z`;
    } else {
      const formatted = str.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
      if (formatted.includes("T")) {
        parseable = `${formatted}Z`;
      } else {
        parseable = `${formatted}T00:00:00Z`;
      }
    }
  } else {
    parseable = str.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  }

  const ts = new Date(parseable).getTime();
  if (Number.isNaN(ts)) {
    const fallbackTs = new Date(str).getTime();
    if (Number.isNaN(fallbackTs)) return 0;
    return Math.floor(fallbackTs / 1000);
  }
  return Math.floor(ts / 1000);
}

export function formatIsoDate(sec: number, hasTime = false): string {
  const d = new Date(sec * 1000);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const seconds = d.getUTCSeconds();
  if (hasTime || hours !== 0 || minutes !== 0 || seconds !== 0) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(hours).padStart(2, "0");
    const min = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
  return d.toISOString().split("T")[0];
}

export function parseDurationToSeconds(val: string): number {
  if (!val) return 365 * 86400;
  const lower = val.toString().trim().toLowerCase();
  const match = lower.match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/);
  if (!match) {
    const num = Number.parseFloat(lower);
    return Number.isNaN(num) ? 365 * 86400 : Math.round(num * 86400);
  }
  const num = Number.parseFloat(match[1]);
  const unit = match[2];
  if (!unit) return Math.round(num * 86400);

  switch (unit) {
    case "s":
    case "sec":
    case "second":
    case "seconds":
      return Math.round(num * 1);

    case "m":
    case "min":
    case "mins":
    case "minute":
    case "minutes":
      return Math.round(num * 60);

    case "h":
    case "hr":
    case "hrs":
    case "hour":
    case "hours":
      return Math.round(num * 3600);

    case "d":
    case "day":
    case "days":
      return Math.round(num * 86400);

    case "w":
    case "wk":
    case "wks":
    case "week":
    case "weeks":
      return Math.round(num * 7 * 86400);

    case "mo":
    case "mon":
    case "month":
    case "months":
      return Math.round(num * 30 * 86400);

    case "y":
    case "yr":
    case "yrs":
    case "year":
    case "years":
      return Math.round(num * 365 * 86400);

    default:
      if (unit.startsWith("sec")) return Math.round(num * 1);
      if (unit.startsWith("min")) return Math.round(num * 60);
      if (unit.startsWith("mo")) return Math.round(num * 30 * 86400);
      if (unit.startsWith("h")) return Math.round(num * 3600);
      if (unit.startsWith("d")) return Math.round(num * 86400);
      if (unit.startsWith("w")) return Math.round(num * 7 * 86400);
      if (unit.startsWith("y")) return Math.round(num * 365 * 86400);
      return Math.round(num * 86400);
  }
}

export function parseFrequencySpec(
  freqStr?: string,
): { quantity: number; unit: string } | null {
  if (!freqStr || typeof freqStr !== "string") return null;
  const trimmed = freqStr.trim();
  if (!trimmed || trimmed.toLowerCase() === "auto") return null;

  const match = trimmed.match(/^(\d+)?\s*([A-Za-z]+)$/);
  if (!match) return null;

  const quantity = match[1] ? Number.parseInt(match[1], 10) : 1;
  const unit = match[2].toUpperCase();
  return { quantity, unit };
}

export function generateFutureTimestamps(
  lastTs: number,
  periods: number,
  freqStr: string | undefined,
  dataTimestampsSec: number[],
): number[] {
  const futureTs: number[] = [];
  const spec = parseFrequencySpec(freqStr);
  const baseDate = new Date(lastTs * 1000);

  if (!spec) {
    let stepSec = 86400;
    if (dataTimestampsSec.length > 1) {
      const diffs: number[] = [];
      for (let i = 1; i < dataTimestampsSec.length; i++) {
        diffs.push(dataTimestampsSec[i] - dataTimestampsSec[i - 1]);
      }
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      if (avgDiff > 0) stepSec = Math.round(avgDiff);
    }
    for (let i = 1; i <= periods; i++) {
      futureTs.push(lastTs + i * stepSec);
    }
    return futureTs;
  }

  const { quantity, unit } = spec;

  if (
    unit === "S" ||
    unit === "SEC" ||
    unit === "SECS" ||
    unit === "SECOND" ||
    unit === "SECONDS"
  ) {
    const stepSec = quantity * 1;
    for (let i = 1; i <= periods; i++) {
      futureTs.push(lastTs + i * stepSec);
    }
  } else if (
    unit === "MIN" ||
    unit === "MINS" ||
    unit === "MINUTE" ||
    unit === "MINUTES" ||
    unit === "T"
  ) {
    const stepSec = quantity * 60;
    for (let i = 1; i <= periods; i++) {
      futureTs.push(lastTs + i * stepSec);
    }
  } else if (
    unit === "H" ||
    unit === "HR" ||
    unit === "HRS" ||
    unit === "HOUR" ||
    unit === "HOURS" ||
    unit === "HOURLY"
  ) {
    const stepSec = quantity * 3600;
    for (let i = 1; i <= periods; i++) {
      futureTs.push(lastTs + i * stepSec);
    }
  } else if (
    unit === "D" ||
    unit === "DAY" ||
    unit === "DAYS" ||
    unit === "DAILY"
  ) {
    for (let i = 1; i <= periods; i++) {
      const d = new Date(baseDate.getTime());
      d.setUTCDate(d.getUTCDate() + i * quantity);
      futureTs.push(Math.floor(d.getTime() / 1000));
    }
  } else if (
    unit === "W" ||
    unit === "WK" ||
    unit === "WKS" ||
    unit === "WEEK" ||
    unit === "WEEKS" ||
    unit === "WEEKLY"
  ) {
    for (let i = 1; i <= periods; i++) {
      const d = new Date(baseDate.getTime());
      d.setUTCDate(d.getUTCDate() + i * quantity * 7);
      futureTs.push(Math.floor(d.getTime() / 1000));
    }
  } else if (unit === "B" || unit === "BUS" || unit === "BUSINESS") {
    const curDate = new Date(baseDate.getTime());
    for (let i = 1; i <= periods; i++) {
      let added = 0;
      while (added < quantity) {
        curDate.setUTCDate(curDate.getUTCDate() + 1);
        const dayOfWeek = curDate.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          added++;
        }
      }
      futureTs.push(Math.floor(curDate.getTime() / 1000));
    }
  } else if (unit === "MS") {
    for (let i = 1; i <= periods; i++) {
      const targetMonthTotal = baseDate.getUTCMonth() + i * quantity;
      const targetYear =
        baseDate.getUTCFullYear() + Math.floor(targetMonthTotal / 12);
      const targetMonth = ((targetMonthTotal % 12) + 12) % 12;
      const d = new Date(
        Date.UTC(
          targetYear,
          targetMonth,
          1,
          baseDate.getUTCHours(),
          baseDate.getUTCMinutes(),
          baseDate.getUTCSeconds(),
        ),
      );
      futureTs.push(Math.floor(d.getTime() / 1000));
    }
  } else if (
    unit === "M" ||
    unit === "MON" ||
    unit === "MONTH" ||
    unit === "MONTHS" ||
    unit === "MONTHLY"
  ) {
    const origDay = baseDate.getUTCDate();
    for (let i = 1; i <= periods; i++) {
      const targetMonthTotal = baseDate.getUTCMonth() + i * quantity;
      const targetYear =
        baseDate.getUTCFullYear() + Math.floor(targetMonthTotal / 12);
      const targetMonth = ((targetMonthTotal % 12) + 12) % 12;
      const d = new Date(
        Date.UTC(
          targetYear,
          targetMonth,
          1,
          baseDate.getUTCHours(),
          baseDate.getUTCMinutes(),
          baseDate.getUTCSeconds(),
        ),
      );
      const lastDayOfTargetMonth = new Date(
        Date.UTC(targetYear, targetMonth + 1, 0),
      ).getUTCDate();
      d.setUTCDate(Math.min(origDay, lastDayOfTargetMonth));
      futureTs.push(Math.floor(d.getTime() / 1000));
    }
  } else if (unit === "YS") {
    for (let i = 1; i <= periods; i++) {
      const targetYear = baseDate.getUTCFullYear() + i * quantity;
      const d = new Date(
        Date.UTC(
          targetYear,
          0,
          1,
          baseDate.getUTCHours(),
          baseDate.getUTCMinutes(),
          baseDate.getUTCSeconds(),
        ),
      );
      futureTs.push(Math.floor(d.getTime() / 1000));
    }
  } else if (
    unit === "Y" ||
    unit === "YR" ||
    unit === "YRS" ||
    unit === "YEAR" ||
    unit === "YEARS" ||
    unit === "YEARLY"
  ) {
    const origMonth = baseDate.getUTCMonth();
    const origDay = baseDate.getUTCDate();
    for (let i = 1; i <= periods; i++) {
      const targetYear = baseDate.getUTCFullYear() + i * quantity;
      const d = new Date(
        Date.UTC(
          targetYear,
          origMonth,
          1,
          baseDate.getUTCHours(),
          baseDate.getUTCMinutes(),
          baseDate.getUTCSeconds(),
        ),
      );
      const lastDayOfTargetMonth = new Date(
        Date.UTC(targetYear, origMonth + 1, 0),
      ).getUTCDate();
      d.setUTCDate(Math.min(origDay, lastDayOfTargetMonth));
      futureTs.push(Math.floor(d.getTime() / 1000));
    }
  } else {
    let stepSec = 86400;
    if (dataTimestampsSec.length > 1) {
      const diffs: number[] = [];
      for (let i = 1; i < dataTimestampsSec.length; i++) {
        diffs.push(dataTimestampsSec[i] - dataTimestampsSec[i - 1]);
      }
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      if (avgDiff > 0) stepSec = Math.round(avgDiff);
    }
    for (let i = 1; i <= periods; i++) {
      futureTs.push(lastTs + i * stepSec);
    }
  }

  return futureTs;
}

export function checkHasTimeComponents(
  dsSeconds: number[],
  dataPoints: DataPoint[],
  freq?: string,
): boolean {
  if (freq) {
    const spec = parseFrequencySpec(freq);
    if (spec) {
      const u = spec.unit;
      if (
        u === "S" ||
        u === "SEC" ||
        u === "SECS" ||
        u === "SECOND" ||
        u === "SECONDS" ||
        u === "MIN" ||
        u === "MINS" ||
        u === "MINUTE" ||
        u === "MINUTES" ||
        u === "T" ||
        u === "H" ||
        u === "HR" ||
        u === "HRS" ||
        u === "HOUR" ||
        u === "HOURS" ||
        u === "HOURLY"
      ) {
        return true;
      }
    }
  }
  for (const d of dataPoints) {
    if (
      typeof d.ds === "string" &&
      (d.ds.includes("T") || d.ds.includes(" ") || d.ds.includes(":"))
    ) {
      return true;
    }
  }
  for (const tsSec of dsSeconds) {
    const d = new Date(tsSec * 1000);
    if (
      d.getUTCHours() !== 0 ||
      d.getUTCMinutes() !== 0 ||
      d.getUTCSeconds() !== 0
    ) {
      return true;
    }
  }
  return false;
}

function parseSeasonalityOption(
  val: string | boolean | number | undefined,
): ProphetSeasonalityOption {
  if (val === undefined || val === null || val === "auto" || val === true) {
    return { type: "auto" };
  }
  if (typeof val === "boolean") {
    return { type: "manual", enabled: val };
  }
  if (typeof val === "number") {
    return { type: "fourier", order: val };
  }
  if (typeof val === "string") {
    const parsed = Number.parseInt(val, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return { type: "fourier", order: parsed };
    }
    if (val === "false") return { type: "manual", enabled: false };
    if (val === "true") return { type: "manual", enabled: true };
  }
  return { type: "auto" };
}

function buildProphetOptions(
  config: ModelConfig,
  dataTimestampsSec: number[],
  futureHorizonYears = 5,
): ProphetOptions {
  const holidaysMap = new Map<string, ProphetHoliday>();

  if (config.country_holidays) {
    try {
      const hd = new Holidays(config.country_holidays);
      const yearsSet = new Set<number>();
      for (const t of dataTimestampsSec) {
        yearsSet.add(new Date(t * 1000).getFullYear());
      }
      const maxYear =
        yearsSet.size > 0
          ? Math.max(...Array.from(yearsSet))
          : new Date().getFullYear();
      for (let y = maxYear + 1; y <= maxYear + futureHorizonYears; y++) {
        yearsSet.add(y);
      }
      for (const year of yearsSet) {
        const hList = hd.getHolidays(year);
        if (Array.isArray(hList)) {
          for (const h of hList) {
            if (!h.name || !h.start) continue;
            const startSec = Math.floor(new Date(h.start).getTime() / 1000);
            const endSec = h.end
              ? Math.floor(new Date(h.end).getTime() / 1000)
              : startSec + 86399;
            const existing = holidaysMap.get(h.name) || {
              occurrences: [],
              priorScale: config.holidays_prior_scale ?? 10.0,
            };
            existing.occurrences.push({ start: startSec, end: endSec });
            holidaysMap.set(h.name, existing);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load country holidays:", e);
    }
  }

  if (config.holidays && Array.isArray(config.holidays)) {
    for (const h of config.holidays) {
      if (!h.ds || !h.holiday) continue;
      const baseSec = Math.floor(new Date(h.ds).getTime() / 1000);
      const startSec = baseSec + (h.lower_window ?? 0) * 86400;
      const endSec = baseSec + ((h.upper_window ?? 0) + 1) * 86400 - 1;
      const existing = holidaysMap.get(h.holiday) || {
        occurrences: [],
        priorScale: config.holidays_prior_scale ?? 10.0,
      };
      existing.occurrences.push({ start: startSec, end: endSec });
      holidaysMap.set(h.holiday, existing);
    }
  }

  const opts: ProphetOptions = {
    optimizer,
    growth: config.growth || "linear",
    nChangepoints: config.n_changepoints ?? 25,
    changepointRange: config.changepoint_range ?? 0.8,
    changepointPriorScale: config.changepoint_prior_scale ?? 0.05,
    seasonalityMode: config.seasonality_mode || "additive",
    seasonalityPriorScale: config.seasonality_prior_scale ?? 10.0,
    holidaysPriorScale: config.holidays_prior_scale ?? 10.0,
    intervalWidth: config.interval_width ?? 0.8,
    uncertaintySamples:
      config.mcmc_samples && config.mcmc_samples > 0
        ? config.mcmc_samples
        : 1000,
    yearlySeasonality: parseSeasonalityOption(config.yearly_seasonality),
    weeklySeasonality: parseSeasonalityOption(config.weekly_seasonality),
    dailySeasonality: parseSeasonalityOption(config.daily_seasonality),
  };

  if (holidaysMap.size > 0) {
    opts.holidays = holidaysMap;
  }

  return opts;
}

export function runProphetFitAndPredict(
  dataPoints: DataPoint[],
  config: ModelConfig,
  periods: number,
  freq: string,
): ForecastResponse {
  if (!dataPoints || dataPoints.length < 2) {
    throw new Error(
      "Insufficient data points for forecasting (at least 2 required)",
    );
  }
  const sorted = [...dataPoints]
    .map((d) => ({ ...d, ts: parseTimestamp(d.ds) }))
    .sort((a, b) => a.ts - b.ts);
  const dsSeconds = sorted.map((d) => d.ts);
  const yValues = sorted.map((d) => d.y);

  const trainingData: ProphetTrainingData = {
    ds: dsSeconds,
    y: yValues,
  };
  if (config.growth === "logistic") {
    trainingData.cap = sorted.map((d) => d.cap ?? Math.max(...yValues) * 1.5);
    trainingData.floor = sorted.map((d) => d.floor ?? 0);
  }

  const opts = buildProphetOptions(config, dsSeconds);
  let prophet: Prophet | null = null;
  try {
    prophet = new Prophet(opts);

    if (
      config.custom_seasonalities &&
      Array.isArray(config.custom_seasonalities)
    ) {
      for (const cs of config.custom_seasonalities) {
        prophet.addSeasonality(cs.name, {
          period: cs.period,
          fourierOrder: cs.fourier_order,
          priorScale: cs.prior_scale ?? config.seasonality_prior_scale,
          mode: cs.mode ?? config.seasonality_mode,
        });
      }
    }

    if (config.regressors && Array.isArray(config.regressors)) {
      for (const reg of config.regressors) {
        prophet.addRegressor(reg.name, {
          mode: reg.mode ?? "additive",
          priorScale: reg.prior_scale ?? config.seasonality_prior_scale,
          standardize: reg.standardize ? "yes" : "no",
        });
      }
    }

    prophet.fit(trainingData);

    const hasTimeComponents = checkHasTimeComponents(
      dsSeconds,
      dataPoints,
      freq,
    );

    const futureTs = generateFutureTimestamps(
      dsSeconds[dsSeconds.length - 1],
      periods,
      freq,
      dsSeconds,
    );
    const allTs = [...dsSeconds, ...futureTs];

    const predictionData: ProphetPredictionData = {
      ds: allTs,
    };

    if (config.growth === "logistic") {
      const lastCap =
        sorted[sorted.length - 1].cap ?? Math.max(...yValues) * 1.5;
      const lastFloor = sorted[sorted.length - 1].floor ?? 0;
      predictionData.cap = [
        ...sorted.map((d) => d.cap ?? lastCap),
        ...Array(periods).fill(lastCap),
      ];
      predictionData.floor = [
        ...sorted.map((d) => d.floor ?? lastFloor),
        ...Array(periods).fill(lastFloor),
      ];
    }

    const predictions = prophet.predict(predictionData);

    const dsStrings = predictions.ds.map((sec) =>
      formatIsoDate(sec, hasTimeComponents),
    );
    const forecastPoints: ForecastPoint[] = [];

    for (let i = 0; i < predictions.ds.length; i++) {
      const tsSec = predictions.ds[i];
      const yhat = predictions.yhat.point[i];
      const yhat_lower = predictions.yhat.intervals?.lower
        ? predictions.yhat.intervals.lower[i]
        : yhat;
      const yhat_upper = predictions.yhat.intervals?.upper
        ? predictions.yhat.intervals.upper[i]
        : yhat;
      const trend = predictions.trend.point[i];
      const trend_lower = predictions.trend.intervals?.lower
        ? predictions.trend.intervals.lower[i]
        : trend;
      const trend_upper = predictions.trend.intervals?.upper
        ? predictions.trend.intervals.upper[i]
        : trend;

      forecastPoints.push({
        ds: dsStrings[i],
        ts: tsSec,
        yhat,
        yhat_lower,
        yhat_upper,
        trend,
        trend_lower,
        trend_upper,
      });
    }

    const components: Record<string, ComponentData> = {
      trend: {
        ds: dsStrings,
        values: predictions.trend.point,
        lower: predictions.trend.intervals?.lower,
        upper: predictions.trend.intervals?.upper,
      },
    };

    if (predictions.additive && predictions.additive.point.length > 0) {
      components.additive = {
        ds: dsStrings,
        values: predictions.additive.point,
        lower: predictions.additive.intervals?.lower,
        upper: predictions.additive.intervals?.upper,
      };
    }

    if (
      predictions.multiplicative &&
      predictions.multiplicative.point.length > 0
    ) {
      components.multiplicative = {
        ds: dsStrings,
        values: predictions.multiplicative.point,
        lower: predictions.multiplicative.intervals?.lower,
        upper: predictions.multiplicative.intervals?.upper,
      };
    }

    if (predictions.seasonalities) {
      for (const [name, fc] of predictions.seasonalities.entries()) {
        components[name] = {
          ds: dsStrings,
          values: fc.point,
          lower: fc.intervals?.lower,
          upper: fc.intervals?.upper,
        };
      }
    }

    if (predictions.holidays) {
      for (const [name, fc] of predictions.holidays.entries()) {
        components[name] = {
          ds: dsStrings,
          values: fc.point,
          lower: fc.intervals?.lower,
          upper: fc.intervals?.upper,
        };
      }
    }

    if (predictions.regressors) {
      for (const [name, fc] of predictions.regressors.entries()) {
        components[name] = {
          ds: dsStrings,
          values: fc.point,
          lower: fc.intervals?.lower,
          upper: fc.intervals?.upper,
        };
      }
    }

    const changepointDates: string[] = [];
    if (config.changepoints && Array.isArray(config.changepoints)) {
      changepointDates.push(...config.changepoints);
    } else {
      const N = sorted.length;
      const nCp = config.n_changepoints ?? 25;
      const cpRange = config.changepoint_range ?? 0.8;
      const maxIdx = Math.floor(N * cpRange);
      if (maxIdx > 0 && nCp > 0) {
        const step = maxIdx / (nCp + 1);
        for (let c = 1; c <= nCp; c++) {
          const idx = Math.floor(c * step);
          if (idx >= 0 && idx < N) {
            changepointDates.push(sorted[idx].ds);
          }
        }
      }
    }

    return {
      forecast: forecastPoints,
      components,
      changepoints: Array.from(new Set(changepointDates)),
    };
  } finally {
    try {
      prophet?.free();
    } catch (_) {}
  }
}

export async function runCrossValidation(
  request: CrossValidationRequest,
  id: string,
): Promise<CrossValidationResponse | null> {
  cancelRequested = false;
  activeCvRequestId = id;

  try {
    const { data, config, initial, period, horizon, freq } = request;
    const sorted = [...data]
      .map((d) => ({ ...d, ts: parseTimestamp(d.ds) }))
      .sort((a, b) => a.ts - b.ts);
    if (sorted.length < 2) {
      throw new Error("Insufficient data points for cross-validation");
    }

    const minTs = sorted[0].ts;
    const maxTs = sorted[sorted.length - 1].ts;

    const initialSec = parseDurationToSeconds(initial);
    const periodSec = parseDurationToSeconds(period);
    const horizonSec = parseDurationToSeconds(horizon);

    const minCutoff = minTs + initialSec;
    const cutoffs: number[] = [];
    let curCutoff = maxTs - horizonSec;

    while (curCutoff >= minCutoff) {
      cutoffs.push(curCutoff);
      curCutoff -= periodSec;
    }

    cutoffs.reverse();

    if (cutoffs.length === 0) {
      throw new Error(
        `Data timespan is too short for requested initial (${initial}), horizon (${horizon})`,
      );
    }

    const cvResults: Array<Record<string, unknown>> = [];
    const squaredErrors: number[] = [];
    const absErrors: number[] = [];
    const absPctErrors: number[] = [];
    let coverageHits = 0;
    let totalEvaluated = 0;

    const hasTime = checkHasTimeComponents(
      sorted.map((d) => d.ts),
      data,
      freq,
    );

    for (let k = 0; k < cutoffs.length; k++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (cancelRequested && (!activeCvRequestId || activeCvRequestId === id)) {
        if (typeof self !== "undefined") {
          self.postMessage({ type: "CV_CANCELLED", id });
        }
        return null;
      }

      const cutoff = cutoffs[k];
      const cutoffIso = formatIsoDate(cutoff, hasTime);
      const percent = Math.round(((k + 1) / cutoffs.length) * 100);
      if (typeof self !== "undefined") {
        self.postMessage({
          type: "CV_PROGRESS",
          id,
          percent,
          step: `Cutoff ${k + 1}/${cutoffs.length}`,
        });
      }

      const trainSlice = sorted.filter((d) => d.ts <= cutoff);
      const testSlice = sorted.filter(
        (d) => d.ts > cutoff && d.ts <= cutoff + horizonSec,
      );

      if (trainSlice.length < 2 || testSlice.length === 0) {
        continue;
      }

      const maxTestTs = testSlice[testSlice.length - 1].ts;
      let stepSec = 86400;
      if (trainSlice.length > 1) {
        stepSec = Math.max(
          1,
          Math.round(
            (trainSlice[trainSlice.length - 1].ts - trainSlice[0].ts) /
              (trainSlice.length - 1),
          ),
        );
      }
      const periodsNeeded = Math.ceil((maxTestTs - cutoff) / stepSec);

      const fcResponse = runProphetFitAndPredict(
        trainSlice,
        config,
        Math.max(periodsNeeded, testSlice.length * 2),
        freq || "D",
      );
      const fcMap = new Map<number, ForecastPoint>();
      for (const pt of fcResponse.forecast) {
        if (pt.ts !== undefined) {
          fcMap.set(pt.ts, pt);
        }
      }

      for (const testPt of testSlice) {
        const fcPt = fcMap.get(testPt.ts);
        if (!fcPt) continue;

        const err = testPt.y - fcPt.yhat;
        const absErr = Math.abs(err);
        squaredErrors.push(err * err);
        absErrors.push(absErr);
        if (testPt.y !== 0) {
          absPctErrors.push((absErr / Math.abs(testPt.y)) * 100);
        }
        if (testPt.y >= fcPt.yhat_lower && testPt.y <= fcPt.yhat_upper) {
          coverageHits++;
        }
        totalEvaluated++;

        cvResults.push({
          cutoff: cutoffIso,
          ds: testPt.ds,
          y: testPt.y,
          yhat: fcPt.yhat,
          yhat_lower: fcPt.yhat_lower,
          yhat_upper: fcPt.yhat_upper,
        });
      }
    }

    if (cancelRequested && (!activeCvRequestId || activeCvRequestId === id)) {
      if (typeof self !== "undefined") {
        self.postMessage({ type: "CV_CANCELLED", id });
      }
      return null;
    }

    const n = squaredErrors.length;
    const mse = n > 0 ? squaredErrors.reduce((a, b) => a + b, 0) / n : 0;
    const rmse = Math.sqrt(mse);
    const mae = n > 0 ? absErrors.reduce((a, b) => a + b, 0) / n : 0;
    const mape =
      absPctErrors.length > 0
        ? absPctErrors.reduce((a, b) => a + b, 0) / absPctErrors.length
        : 0;

    let mdape = 0;
    if (absPctErrors.length > 0) {
      const sortedPct = [...absPctErrors].sort((a, b) => a - b);
      const mid = Math.floor(sortedPct.length / 2);
      mdape =
        sortedPct.length % 2 !== 0
          ? sortedPct[mid]
          : (sortedPct[mid - 1] + sortedPct[mid]) / 2;
    }

    const coverage = totalEvaluated > 0 ? coverageHits / totalEvaluated : 0;
    const horizonDaysStr = `${Math.round(horizonSec / 86400)} days`;

    const metrics: PerformanceMetrics = {
      horizon: [horizonDaysStr],
      mse: [mse],
      rmse: [rmse],
      mae: [mae],
      mape: [mape],
      mdape: [mdape],
      coverage: [coverage],
    };

    return {
      cv_results: cvResults,
      metrics,
    };
  } finally {
    if (activeCvRequestId === id) {
      activeCvRequestId = null;
    }
  }
}

if (typeof self !== "undefined") {
  self.onmessage = async (event: MessageEvent) => {
    const { type, id, payload } = event.data || {};

    if (type === "CANCEL_CV") {
      const targetId = payload?.id || id;
      requestCrossValidationCancel(targetId);
      return;
    }

    if (type === "PRELOAD") {
      try {
        await ensureWasmInitialized();
        self.postMessage({ type: "PRELOAD_SUCCESS", id });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        self.postMessage({
          type: "PRELOAD_ERROR",
          id,
          error: errorMsg,
        });
      }
      return;
    }

    if (type === "FORECAST") {
      try {
        await ensureWasmInitialized();
        const req = payload as ForecastRequest;
        const res = runProphetFitAndPredict(
          req.data,
          req.config,
          req.periods,
          req.freq,
        );
        self.postMessage({ type: "FORECAST_SUCCESS", id, payload: res });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        self.postMessage({
          type: "FORECAST_ERROR",
          id,
          error: errorMsg,
        });
      }
      return;
    }

    if (type === "CROSS_VALIDATE") {
      try {
        await ensureWasmInitialized();
        const req = payload as CrossValidationRequest;
        const res = await runCrossValidation(req, id);
        if (res) {
          self.postMessage({ type: "CV_SUCCESS", id, payload: res });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        self.postMessage({
          type: "CV_ERROR",
          id,
          error: errorMsg,
        });
      }
      return;
    }
  };
}

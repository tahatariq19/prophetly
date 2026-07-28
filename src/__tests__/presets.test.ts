import fs from "node:fs";
import path from "node:path";
import initProphet, { Prophet } from "@bsull/augurs/prophet";
import { optimizer } from "@bsull/augurs-prophet-wasmstan";
import { type AppState, appReducer, defaultConfig } from "../lib/state";
import type { ModelConfig } from "../lib/types";

async function initNodeWasm() {
  const wasmPath = path.resolve(
    process.cwd(),
    "node_modules/@bsull/augurs/prophet_bg.wasm",
  );
  const wasmBuffer = fs.readFileSync(wasmPath);
  await initProphet(wasmBuffer);
}

export const PRESET_CONFIGS: Record<string, Partial<ModelConfig>> = {
  Quick: {
    growth: "linear",
    seasonality_mode: "additive",
    n_changepoints: 15,
    changepoint_prior_scale: 0.05,
    seasonality_prior_scale: 10.0,
    holidays_prior_scale: 10.0,
    mcmc_samples: 0,
  },
  Detailed: {
    growth: "linear",
    seasonality_mode: "multiplicative",
    n_changepoints: 30,
    changepoint_prior_scale: 0.05,
    seasonality_prior_scale: 10.0,
    holidays_prior_scale: 10.0,
    yearly_seasonality: true,
    weekly_seasonality: true,
    daily_seasonality: "auto",
  },
  Conservative: {
    growth: "linear",
    seasonality_mode: "additive",
    n_changepoints: 20,
    changepoint_prior_scale: 0.01,
    seasonality_prior_scale: 1.0,
    holidays_prior_scale: 1.0,
  },
};

export async function runPresetsStressTest() {
  console.log("\n=======================================================");
  console.log("  STRESS TEST 3: Presets (Quick, Detailed, Conservative)");
  console.log("=======================================================");

  const results = {
    allPassed: false,
    presetResults: [] as Array<{
      name: string;
      configPassed: boolean;
      fitPassed: boolean;
      fitTimeMs: number;
      changepointsCount: number;
    }>,
    details: [] as string[],
  };

  try {
    await initNodeWasm();

    // Generate test data (500 daily points)
    const dsSecs: number[] = [];
    const yVals: number[] = [];
    const startTs = new Date("2023-01-01T00:00:00Z").getTime() / 1000;
    for (let i = 0; i < 500; i++) {
      dsSecs.push(startTs + i * 86400);
      yVals.push(
        50 + i * 0.1 + 10 * Math.sin(i / 15) + (Math.random() - 0.5) * 2,
      );
    }

    const initialState: AppState = {
      step: 2,
      data: [],
      datasetName: "Test Dataset",
      sampleDataLoaded: false,
      actionType: "forecast",
      config: defaultConfig,
      forecastParams: { periods: 30, freq: "D" },
      cvParams: { initial: "300 days", period: "60 days", horizon: "90 days" },
      isLoading: false,
      loadingMessage: "",
      forecastResults: null,
      cvResults: null,
      activeResultsMode: "forecast",
      error: null,
    };

    for (const [name, presetPayload] of Object.entries(PRESET_CONFIGS)) {
      // 1. Test Reducer state update
      const updatedState = appReducer(initialState, {
        type: "SET_CONFIG",
        payload: presetPayload,
      });

      const configMatches = Object.entries(presetPayload).every(
        ([k, v]) => updatedState.config[k as keyof ModelConfig] === v,
      );

      // 2. Test WASM fit with preset parameters
      const cfg = updatedState.config;
      const opts = {
        optimizer,
        growth: (cfg.growth as "linear" | "logistic") || "linear",
        nChangepoints: cfg.n_changepoints ?? 25,
        changepointRange: cfg.changepoint_range ?? 0.8,
        changepointPriorScale: cfg.changepoint_prior_scale ?? 0.05,
        seasonalityMode:
          (cfg.seasonality_mode as "additive" | "multiplicative") || "additive",
        seasonalityPriorScale: cfg.seasonality_prior_scale ?? 10.0,
        holidaysPriorScale: cfg.holidays_prior_scale ?? 10.0,
        intervalWidth: cfg.interval_width ?? 0.8,
        uncertaintySamples: 1000,
        yearlySeasonality:
          typeof cfg.yearly_seasonality === "boolean"
            ? { type: "manual" as const, enabled: cfg.yearly_seasonality }
            : { type: "auto" as const },
        weeklySeasonality:
          typeof cfg.weekly_seasonality === "boolean"
            ? { type: "manual" as const, enabled: cfg.weekly_seasonality }
            : { type: "auto" as const },
        dailySeasonality: { type: "auto" as const },
      };

      const prophet = new Prophet(opts);
      const fitStart = performance.now();
      prophet.fit({ ds: dsSecs, y: yVals });

      const futureTs = Array.from(
        { length: 30 },
        (_, i) => dsSecs[dsSecs.length - 1] + (i + 1) * 86400,
      );
      const predictions = prophet.predict({ ds: [...dsSecs, ...futureTs] });
      const fitTime = performance.now() - fitStart;

      prophet.free();

      const fitPassed =
        predictions.yhat.point.length === dsSecs.length + 30 &&
        !Number.isNaN(predictions.yhat.point[0]);

      results.presetResults.push({
        name,
        configPassed: configMatches,
        fitPassed,
        fitTimeMs: fitTime,
        changepointsCount: opts.nChangepoints,
      });

      results.details.push(
        `Preset '${name}': Config reducer = ${configMatches ? "PASS" : "FAIL"} | WASM Fit = ${fitPassed ? "PASS" : "FAIL"} (${fitTime.toFixed(2)}ms)`,
      );
    }

    results.allPassed = results.presetResults.every(
      (r) => r.configPassed && r.fitPassed,
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.details.push(`ERROR in Presets stress test: ${errorMsg}`);
  }

  return results;
}

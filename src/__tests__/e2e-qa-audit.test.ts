import fs from "node:fs";
import path from "node:path";
import initProphet from "@bsull/augurs/prophet";
import { beforeAll, describe, expect, it } from "vitest";
import { parseCSVText } from "../lib/csv";
import {
  checkHasTimeComponents,
  ensureWasmInitialized,
  formatIsoDate,
  parseTimestamp,
  runCrossValidation,
  runProphetFitAndPredict,
} from "../lib/prophet.worker";
import type {
  CrossValidationRequest,
  DataPoint,
  ModelConfig,
} from "../lib/types";

beforeAll(async () => {
  const wasmPath = path.resolve(
    process.cwd(),
    "node_modules/@bsull/augurs/prophet_bg.wasm",
  );
  if (fs.existsSync(wasmPath)) {
    const wasmBuffer = fs.readFileSync(wasmPath);
    await initProphet(wasmBuffer);
    await ensureWasmInitialized(wasmBuffer);
  }
});

describe("Comprehensive E2E QA Audit Suite", () => {
  it("CSV Parser handles quoted fields, formatted currency numbers, and comma numbers", () => {
    const csvContent = `Date, Sales, "Capacity", "Floor"
"2021-01-01", "$1,250.50", "2,000", "500"
"2021-01-02", "$1,400.00", "2,000", "500"
"2021-01-03", "$1,100.75", "2,000", "500"`;

    const parsed = parseCSVText(csvContent);
    expect(parsed.length).toBe(3);
    expect(parsed[0].y).toBe(1250.5);
    expect(parsed[0].cap).toBe(2000);
    expect(parsed[0].floor).toBe(500);
    expect(parsed[1].y).toBe(1400);
  });

  it("Daily dataset with midnight timestamps (00:00:00) does NOT trigger hasTimeComponents (formats as days, not hours)", () => {
    const dailyPoints: DataPoint[] = [
      { ds: "2021-07-14 00:00:00", y: 250 },
      { ds: "2021-07-15T00:00:00Z", y: 248 },
      { ds: "2021-07-16 00:00:00", y: 245 },
    ];
    const tsSecs = dailyPoints.map((p) => parseTimestamp(p.ds));

    const hasTime = checkHasTimeComponents(tsSecs, dailyPoints);
    expect(hasTime).toBe(false);

    const formattedDate = formatIsoDate(tsSecs[0], hasTime);
    expect(formattedDate).toBe("2021-07-14");
    expect(formattedDate).not.includes("00:00:00");
  });

  it("Sub-daily dataset with non-zero hours/minutes triggers hasTimeComponents", () => {
    const subDailyPoints: DataPoint[] = [
      { ds: "2021-07-14 08:30:00", y: 12 },
      { ds: "2021-07-14 09:30:00", y: 15 },
    ];
    const tsSecs = subDailyPoints.map((p) => parseTimestamp(p.ds));

    const hasTime = checkHasTimeComponents(tsSecs, subDailyPoints);
    expect(hasTime).toBe(true);

    const formattedDate = formatIsoDate(tsSecs[0], hasTime);
    expect(formattedDate).toBe("2021-07-14 08:30:00");
  });

  it("Model fitting auto-generates changepoint dates when config.changepoints is empty array []", () => {
    const data: DataPoint[] = [];
    const startMs = Date.UTC(2021, 6, 14);
    for (let i = 0; i < 100; i++) {
      const d = new Date(startMs + i * 86400 * 1000)
        .toISOString()
        .split("T")[0];
      data.push({ ds: d, y: 100 + i * 0.5 + Math.sin(i / 5) * 5 });
    }

    const config: ModelConfig = {
      growth: "linear",
      n_changepoints: 10,
      changepoint_range: 0.8,
      changepoint_prior_scale: 0.05,
      changepoints: [], // empty array default
    };

    const res = runProphetFitAndPredict(data, config, 10, "D");
    expect(res.changepoints.length).toBe(10);
    expect(res.changepoints[0]).toBe("2021-07-21");
  });

  it("Cross-validation on daily stock dataset produces clean horizon bins labeled in days with realistic MAPE", async () => {
    const data: DataPoint[] = [];
    const startMs = Date.UTC(2021, 6, 14);
    for (let i = 0; i < 200; i++) {
      const d = new Date(startMs + i * 86400 * 1000)
        .toISOString()
        .split("T")[0];
      data.push({ ds: d, y: 250 - i * 0.3 + Math.cos(i / 10) * 8 });
    }

    const cvReq: CrossValidationRequest = {
      data,
      config: {
        growth: "linear",
        seasonality_mode: "additive",
        changepoint_prior_scale: 0.05,
        seasonality_prior_scale: 10,
        holidays_prior_scale: 10,
        interval_width: 0.8,
      },
      initial: "100 days",
      period: "20 days",
      horizon: "40 days",
      freq: "D",
    };

    const res = await runCrossValidation(cvReq, "qa-daily-stock-test");
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.cv_results.length).toBeGreaterThan(0);
    expect(res.metrics.horizon.length).toBeGreaterThan(0);

    // Verify horizon labels are in days
    for (const hLabel of res.metrics.horizon) {
      expect(hLabel).toMatch(/^\d+\s+days$/);
      expect(hLabel).not.includes("hours");
    }

    // Verify MAPE is scaled properly (e.g. 0.02 - 0.25 decimal ratio, which represents 2% - 25%)
    for (const mapeVal of res.metrics.mape) {
      expect(mapeVal).toBeGreaterThan(0);
      expect(mapeVal).toBeLessThan(1.0); // Less than 100%
    }
  });
});

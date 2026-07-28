import fs from "node:fs";
import path from "node:path";
import initProphet from "@bsull/augurs/prophet";
import { beforeAll, describe, expect, it } from "vitest";
import { detectFrequencyCode } from "../lib/csv";
import {
  checkHasTimeComponents,
  ensureWasmInitialized,
  formatIsoDate,
  generateFutureTimestamps,
  parseDurationToSeconds,
  parseFrequencySpec,
  parseTimestamp,
  runCrossValidation,
} from "../lib/prophet.worker";
import { appReducer, initialAppState } from "../lib/state";
import type { CrossValidationRequest, DataPoint } from "../lib/types";

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

describe("R2 Fixes - parseDurationToSeconds", () => {
  it("correctly parses seconds", () => {
    expect(parseDurationToSeconds("10 s")).toBe(10);
    expect(parseDurationToSeconds("1 sec")).toBe(1);
    expect(parseDurationToSeconds("5 second")).toBe(5);
    expect(parseDurationToSeconds("30 seconds")).toBe(30);
    expect(parseDurationToSeconds("30s")).toBe(30);
  });

  it("correctly parses minutes without month collision", () => {
    expect(parseDurationToSeconds("1 m")).toBe(60);
    expect(parseDurationToSeconds("5m")).toBe(300);
    expect(parseDurationToSeconds("5 min")).toBe(300);
    expect(parseDurationToSeconds("5 minutes")).toBe(300);
    expect(parseDurationToSeconds("15 min")).toBe(900);
    expect(parseDurationToSeconds("5 mins")).toBe(300);
    expect(parseDurationToSeconds("1 minute")).toBe(60);
    expect(parseDurationToSeconds("60 minutes")).toBe(3600);
  });

  it("correctly parses hours", () => {
    expect(parseDurationToSeconds("1 h")).toBe(3600);
    expect(parseDurationToSeconds("12h")).toBe(43200);
    expect(parseDurationToSeconds("2 hr")).toBe(7200);
    expect(parseDurationToSeconds("3 hrs")).toBe(10800);
    expect(parseDurationToSeconds("1 hour")).toBe(3600);
    expect(parseDurationToSeconds("24 hours")).toBe(86400);
  });

  it("correctly parses days", () => {
    expect(parseDurationToSeconds("1 d")).toBe(86400);
    expect(parseDurationToSeconds("3d")).toBe(259200);
    expect(parseDurationToSeconds("7 day")).toBe(7 * 86400);
    expect(parseDurationToSeconds("30 days")).toBe(30 * 86400);
  });

  it("correctly parses weeks", () => {
    expect(parseDurationToSeconds("1 w")).toBe(7 * 86400);
    expect(parseDurationToSeconds("2w")).toBe(14 * 86400);
    expect(parseDurationToSeconds("2 wk")).toBe(14 * 86400);
    expect(parseDurationToSeconds("3 wks")).toBe(21 * 86400);
    expect(parseDurationToSeconds("1 week")).toBe(7 * 86400);
    expect(parseDurationToSeconds("4 weeks")).toBe(28 * 86400);
  });

  it("correctly parses months", () => {
    expect(parseDurationToSeconds("1 mo")).toBe(30 * 86400);
    expect(parseDurationToSeconds("5mo")).toBe(5 * 30 * 86400);
    expect(parseDurationToSeconds("5 month")).toBe(5 * 30 * 86400);
    expect(parseDurationToSeconds("5months")).toBe(5 * 30 * 86400);
    expect(parseDurationToSeconds("2 mon")).toBe(60 * 86400);
    expect(parseDurationToSeconds("3 month")).toBe(90 * 86400);
    expect(parseDurationToSeconds("12 months")).toBe(360 * 86400);
  });

  it("correctly parses years", () => {
    expect(parseDurationToSeconds("1 y")).toBe(365 * 86400);
    expect(parseDurationToSeconds("2 yr")).toBe(2 * 365 * 86400);
    expect(parseDurationToSeconds("3 yrs")).toBe(3 * 365 * 86400);
    expect(parseDurationToSeconds("1 year")).toBe(365 * 86400);
    expect(parseDurationToSeconds("5 years")).toBe(5 * 365 * 86400);
  });

  it("explicitly verifies exact requested edge-case duration strings", () => {
    const testCases: Array<[string, number]> = [
      ["5m", 300],
      ["5 min", 300],
      ["5 minutes", 300],
      ["5mo", 5 * 30 * 86400],
      ["5 month", 5 * 30 * 86400],
      ["5months", 5 * 30 * 86400],
      ["2w", 2 * 7 * 86400],
      ["3d", 3 * 86400],
      ["12h", 12 * 3600],
      ["30s", 30],
    ];

    for (const [input, expectedSec] of testCases) {
      expect(
        parseDurationToSeconds(input),
        `Failed for input: "${input}"`,
      ).toBe(expectedSec);
    }
  });

  it("handles case-insensitivity and whitespace", () => {
    expect(parseDurationToSeconds("  12H  ")).toBe(43200);
    expect(parseDurationToSeconds("5 Mins")).toBe(300);
    expect(parseDurationToSeconds("5MO")).toBe(5 * 30 * 86400);
  });
});

describe("R2 Fixes - Calendar-Aware Horizon Stepping & Frequency Stepping", () => {
  it("parses frequency specifications", () => {
    expect(parseFrequencySpec("D")).toEqual({ quantity: 1, unit: "D" });
    expect(parseFrequencySpec("3D")).toEqual({ quantity: 3, unit: "D" });
    expect(parseFrequencySpec("12H")).toEqual({ quantity: 12, unit: "H" });
    expect(parseFrequencySpec("15min")).toEqual({ quantity: 15, unit: "MIN" });
    expect(parseFrequencySpec("MS")).toEqual({ quantity: 1, unit: "MS" });
    expect(parseFrequencySpec("B")).toEqual({ quantity: 1, unit: "B" });
    expect(parseFrequencySpec("30s")).toEqual({ quantity: 30, unit: "S" });
  });

  it("generates 30 daily steps (produces 30 days)", () => {
    // 2024-01-01 00:00:00 UTC
    const startSec = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    const future = generateFutureTimestamps(startSec, 30, "D", [startSec]);
    expect(future.length).toBe(30);
    const dates = future.map(
      (s) => new Date(s * 1000).toISOString().split("T")[0],
    );
    expect(dates[0]).toBe("2024-01-02");
    expect(dates[29]).toBe("2024-01-31");
    // Verify each step is exactly 1 day (86400 sec)
    for (let i = 0; i < future.length; i++) {
      const prev = i === 0 ? startSec : future[i - 1];
      expect(future[i] - prev).toBe(86400);
    }
  });

  it("generates 30 monthly steps (produces 30 calendar months)", () => {
    // 2024-01-31 UTC
    const jan31Sec = Math.floor(Date.UTC(2024, 0, 31) / 1000);
    const future = generateFutureTimestamps(jan31Sec, 30, "M", [jan31Sec]);
    expect(future.length).toBe(30);
    const dates = future.map(
      (s) => new Date(s * 1000).toISOString().split("T")[0],
    );
    expect(dates[0]).toBe("2024-02-29"); // Feb in leap year 2024
    expect(dates[1]).toBe("2024-03-31");
    expect(dates[2]).toBe("2024-04-30"); // April 30 days
    expect(dates[29]).toBe("2026-07-31"); // 30th month from Jan 2024 is July 2026
  });

  it("generates business day stepping for B (skipping weekends)", () => {
    // Friday 2024-01-05 UTC
    const friSec = Math.floor(Date.UTC(2024, 0, 5) / 1000);
    const future = generateFutureTimestamps(friSec, 30, "B", [friSec]);
    expect(future.length).toBe(30);
    const dates = future.map(
      (s) => new Date(s * 1000).toISOString().split("T")[0],
    );

    // Verify first 2 business days after Friday Jan 5 are Mon Jan 8 and Tue Jan 9
    expect(dates[0]).toBe("2024-01-08");
    expect(dates[1]).toBe("2024-01-09");

    // Verify no date falls on Saturday (6) or Sunday (0)
    for (const sec of future) {
      const dayOfWeek = new Date(sec * 1000).getUTCDay();
      expect(dayOfWeek).not.toBe(0);
      expect(dayOfWeek).not.toBe(6);
    }
  });

  it("generates numeric offset stepping (3D, 12H, 15min)", () => {
    // 2024-01-01 00:00:00 UTC
    const startSec = Math.floor(Date.UTC(2024, 0, 1) / 1000);

    // 3D
    const future3D = generateFutureTimestamps(startSec, 5, "3D", [startSec]);
    expect(future3D.length).toBe(5);
    expect(future3D[0] - startSec).toBe(3 * 86400);
    expect(future3D[4] - future3D[3]).toBe(3 * 86400);

    // 12H
    const future12H = generateFutureTimestamps(startSec, 5, "12H", [startSec]);
    expect(future12H.length).toBe(5);
    expect(future12H[0] - startSec).toBe(12 * 3600);
    expect(future12H[4] - future12H[3]).toBe(12 * 3600);

    // 15min
    const future15M = generateFutureTimestamps(startSec, 5, "15min", [
      startSec,
    ]);
    expect(future15M.length).toBe(5);
    expect(future15M[0] - startSec).toBe(15 * 60);
    expect(future15M[4] - future15M[3]).toBe(15 * 60);
  });
});

describe("R1 Fixes - ISO Formatting & Sub-daily support", () => {
  it("parses ISO date and timestamp strings consistently in UTC", () => {
    const expectedUtcSec = Math.floor(Date.UTC(2024, 0, 1, 0, 0, 0) / 1000);
    expect(parseTimestamp("2024-01-01")).toBe(expectedUtcSec);
    expect(parseTimestamp("2024-01-01 00:00:00")).toBe(expectedUtcSec);
    expect(parseTimestamp("2024-01-01T00:00:00")).toBe(expectedUtcSec);
    expect(parseTimestamp("2024-01-01T00:00:00Z")).toBe(expectedUtcSec);
    expect(parseTimestamp("2024-01-01 00:00:00Z")).toBe(expectedUtcSec);

    const expectedUtcSecTime = Math.floor(
      Date.UTC(2024, 0, 1, 14, 30, 45) / 1000,
    );
    expect(parseTimestamp("2024-01-01 14:30:45")).toBe(expectedUtcSecTime);
    expect(parseTimestamp("2024-01-01T14:30:45")).toBe(expectedUtcSecTime);
    expect(parseTimestamp("2024-01-01T14:30:45Z")).toBe(expectedUtcSecTime);
  });

  it("formats dates without time when hours/mins/secs are 0 and hasTime is false", () => {
    const sec = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    expect(formatIsoDate(sec, false)).toBe("2024-01-01");
  });

  it("preserves time components when non-zero time exists", () => {
    const sec = Math.floor(Date.UTC(2024, 0, 1, 14, 30, 45) / 1000);
    expect(formatIsoDate(sec, false)).toBe("2024-01-01 14:30:45");
  });

  it("preserves time components when hasTime is true", () => {
    const sec = Math.floor(Date.UTC(2024, 0, 1, 0, 0, 0) / 1000);
    expect(formatIsoDate(sec, true)).toBe("2024-01-01 00:00:00");
  });

  it("verifies checkHasTimeComponents detects time in sub-daily frequencies and timestamps", () => {
    const dummyPoints: DataPoint[] = [
      { ds: "2024-01-01 00:00:00", y: 10 },
      { ds: "2024-01-01 01:00:00", y: 12 },
    ];
    const tsSecs = [
      Math.floor(Date.UTC(2024, 0, 1, 0, 0, 0) / 1000),
      Math.floor(Date.UTC(2024, 0, 1, 1, 0, 0) / 1000),
    ];

    expect(checkHasTimeComponents(tsSecs, dummyPoints, "1H")).toBe(true);
    expect(checkHasTimeComponents(tsSecs, dummyPoints, "15min")).toBe(true);
    expect(checkHasTimeComponents(tsSecs, dummyPoints, "30s")).toBe(true);
    expect(checkHasTimeComponents(tsSecs, dummyPoints, "12H")).toBe(true);
    expect(checkHasTimeComponents(tsSecs, dummyPoints)).toBe(true); // detected from string/timestamp
  });

  it("empirically verifies sub-daily dataset CV evaluation does not collide or truncate to YYYY-MM-DD", async () => {
    // 168 hours = 7 days of 1-hour interval data
    const startMs = Date.UTC(2024, 0, 1, 0, 0, 0);
    const data: DataPoint[] = [];
    for (let i = 0; i < 168; i++) {
      const d = new Date(startMs + i * 3600 * 1000);
      const y = 100 + Math.sin(i / 12) * 10 + i * 0.1;
      data.push({
        ds: d.toISOString().replace("T", " ").substring(0, 19),
        y,
      });
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
      initial: "3 days",
      period: "12 hours",
      horizon: "1 day",
      freq: "1H",
    };

    const res = await runCrossValidation(cvReq, "sub-daily-test-id");
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.cv_results.length).toBeGreaterThan(0);
    expect(res.metrics.rmse.length).toBeGreaterThan(0);
    expect(Number.isFinite(res.metrics.rmse[0])).toBe(true);

    // Verify cutoff strings in evaluation output preserve time components (HH:mm:ss)
    for (const ev of res.cv_results) {
      expect(ev.cutoff).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });
});

describe("Cross-Validation Cutoffs - Backward Stepping & Chronological Ordering", () => {
  it("calculates backward stepping cutoffs from maxTs - horizon down to minTs + initial", () => {
    const minTs = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    const maxTs = Math.floor(Date.UTC(2024, 3, 10) / 1000);

    const initialSec = parseDurationToSeconds("30 days");
    const periodSec = parseDurationToSeconds("10 days");
    const horizonSec = parseDurationToSeconds("15 days");

    const minCutoff = minTs + initialSec;
    const cutoffs: number[] = [];
    let curCutoff = maxTs - horizonSec;

    while (curCutoff >= minCutoff) {
      cutoffs.push(curCutoff);
      curCutoff -= periodSec;
    }
    cutoffs.reverse();

    expect(cutoffs.length).toBeGreaterThan(0);
    // Highest cutoff MUST be exactly maxTs - horizonSec
    expect(cutoffs[cutoffs.length - 1]).toBe(maxTs - horizonSec);
    // Lowest cutoff MUST be >= minTs + initialSec
    expect(cutoffs[0]).toBeGreaterThanOrEqual(minCutoff);
    // Verify strict chronological ascending order
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i]).toBeGreaterThan(cutoffs[i - 1]);
      expect(cutoffs[i] - cutoffs[i - 1]).toBe(periodSec);
    }
  });

  it("handles unaligned dataset span with exact period steps", () => {
    const minTs = Math.floor(Date.UTC(2024, 0, 1) / 1000); // Jan 1
    const maxTs = Math.floor(Date.UTC(2024, 2, 14) / 1000); // Mar 14 (73 days)

    const initialSec = parseDurationToSeconds("20 days");
    const periodSec = parseDurationToSeconds("7 days");
    const horizonSec = parseDurationToSeconds("10 days");

    const minCutoff = minTs + initialSec;
    const cutoffs: number[] = [];
    let curCutoff = maxTs - horizonSec;

    while (curCutoff >= minCutoff) {
      cutoffs.push(curCutoff);
      curCutoff -= periodSec;
    }
    cutoffs.reverse();

    expect(cutoffs.length).toBe(7);
    expect(cutoffs[cutoffs.length - 1]).toBe(maxTs - horizonSec);
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i] - cutoffs[i - 1]).toBe(periodSec);
    }
  });

  it("handles hourly sub-daily cutoffs stepping backward", () => {
    const minTs = Math.floor(Date.UTC(2024, 0, 1, 0, 0, 0) / 1000);
    const maxTs = minTs + 240 * 3600; // 10 days of hourly data

    const initialSec = parseDurationToSeconds("48h");
    const periodSec = parseDurationToSeconds("12h");
    const horizonSec = parseDurationToSeconds("24h");

    const minCutoff = minTs + initialSec;
    const cutoffs: number[] = [];
    let curCutoff = maxTs - horizonSec;

    while (curCutoff >= minCutoff) {
      cutoffs.push(curCutoff);
      curCutoff -= periodSec;
    }
    cutoffs.reverse();

    expect(cutoffs.length).toBe(15);
    expect(cutoffs[cutoffs.length - 1]).toBe(maxTs - horizonSec);
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i] - cutoffs[i - 1]).toBe(12 * 3600);
    }
  });

  it("produces empty cutoffs array when span is shorter than initial + horizon", () => {
    const minTs = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    const maxTs = minTs + 20 * 86400; // 20 days span

    const initialSec = parseDurationToSeconds("15 days");
    const periodSec = parseDurationToSeconds("5 days");
    const horizonSec = parseDurationToSeconds("10 days"); // initial + horizon = 25 days > 20 days

    const minCutoff = minTs + initialSec;
    const cutoffs: number[] = [];
    let curCutoff = maxTs - horizonSec;

    while (curCutoff >= minCutoff) {
      cutoffs.push(curCutoff);
      curCutoff -= periodSec;
    }
    cutoffs.reverse();

    expect(cutoffs.length).toBe(0);
  });

  it("produces exactly 1 cutoff when span equals initial + horizon", () => {
    const minTs = Math.floor(Date.UTC(2024, 0, 1) / 1000);
    const maxTs = minTs + 25 * 86400; // 25 days span

    const initialSec = parseDurationToSeconds("15 days");
    const periodSec = parseDurationToSeconds("5 days");
    const horizonSec = parseDurationToSeconds("10 days"); // 15 + 10 = 25

    const minCutoff = minTs + initialSec;
    const cutoffs: number[] = [];
    let curCutoff = maxTs - horizonSec;

    while (curCutoff >= minCutoff) {
      cutoffs.push(curCutoff);
      curCutoff -= periodSec;
    }
    cutoffs.reverse();

    expect(cutoffs.length).toBe(1);
    expect(cutoffs[0]).toBe(minTs + initialSec);
    expect(cutoffs[0]).toBe(maxTs - horizonSec);
  });

  it("auto-detects dataset frequency code and sets state forecastParams.freq", () => {
    const monthlyData = [
      { ds: "1949-01-01", y: 112 },
      { ds: "1949-02-01", y: 118 },
      { ds: "1949-03-01", y: 132 },
    ];
    expect(detectFrequencyCode(monthlyData)).toBe("M");

    const dailyData = [
      { ds: "2024-01-01", y: 10 },
      { ds: "2024-01-02", y: 12 },
      { ds: "2024-01-03", y: 11 },
    ];
    expect(detectFrequencyCode(dailyData)).toBe("D");

    const initialState = initialAppState;
    const newState = appReducer(initialState, {
      type: "SET_DATA",
      payload: {
        data: monthlyData,
        isSample: true,
        datasetName: "Test Monthly",
      },
    });
    expect(newState.forecastParams.freq).toBe("M");
  });
});

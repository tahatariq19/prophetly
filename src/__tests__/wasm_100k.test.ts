import fs from "node:fs";
import path from "node:path";
import initProphet, { Prophet } from "@bsull/augurs/prophet";
import { optimizer } from "@bsull/augurs-prophet-wasmstan";
import { parseCSVText } from "../lib/csv";
import type { DataPoint } from "../lib/types";

// Helper to initialize Prophet WASM in Node environment
async function initNodeWasm() {
  const wasmPath = path.resolve(
    process.cwd(),
    "node_modules/@bsull/augurs/prophet_bg.wasm",
  );
  const wasmBuffer = fs.readFileSync(wasmPath);
  await initProphet(wasmBuffer);
}

export function generateSyntheticData(count: number): DataPoint[] {
  const points: DataPoint[] = [];
  const startTs = new Date("2020-01-01T00:00:00Z").getTime();
  const dayMs = 86400 * 1000;

  for (let i = 0; i < count; i++) {
    const ds = new Date(startTs + i * dayMs).toISOString().split("T")[0];
    // Baseline trend + seasonality + noise
    const trend = 100 + i * 0.05;
    const seasonality = 10 * Math.sin((2 * Math.PI * i) / 365.25);
    const noise = (Math.random() - 0.5) * 2;
    const y = Number((trend + seasonality + noise).toFixed(2));
    points.push({ ds, y });
  }
  return points;
}

export function generateSyntheticCSV(count: number): string {
  const lines = ["ds,y"];
  const startTs = new Date("2020-01-01T00:00:00Z").getTime();
  const dayMs = 86400 * 1000;

  for (let i = 0; i < count; i++) {
    const ds = new Date(startTs + i * dayMs).toISOString().split("T")[0];
    const y = (100 + i * 0.05 + Math.sin(i / 10)).toFixed(2);
    lines.push(`${ds},${y}`);
  }
  return lines.join("\n");
}

export async function runWasmAnd100kStressTest() {
  console.log("\n=======================================================");
  console.log("  STRESS TEST 1 & 2: WASM Fitting & 100k Row Dataset ");
  console.log("=======================================================");

  const results = {
    wasmInit: false,
    csvParse100k: false,
    csvParseTimeMs: 0,
    fit100k: false,
    fitTimeMs: 0,
    predictTimeMs: 0,
    scalingTestPassed: false,
    memoryUsageMB: 0,
    details: [] as string[],
  };

  try {
    // Step 1: Initialize WASM
    const initStart = performance.now();
    await initNodeWasm();
    const initTime = performance.now() - initStart;
    results.wasmInit = true;
    results.details.push(
      `WASM initialized successfully in ${initTime.toFixed(2)}ms`,
    );

    // Step 2: Test CSV parsing performance on 100k rows
    console.log("Generating 100,000 row CSV payload...");
    const csvContent = generateSyntheticCSV(100000);
    const csvSizeBytes = Buffer.byteLength(csvContent, "utf-8");
    results.details.push(
      `Generated 100k CSV payload (${(csvSizeBytes / 1024 / 1024).toFixed(2)} MB)`,
    );

    console.log("Benchmarking CSV parser on 100,000 rows...");
    const parseStart = performance.now();
    const parsedData = parseCSVText(csvContent);
    results.csvParseTimeMs = performance.now() - parseStart;
    results.csvParse100k = parsedData.length === 100000;
    results.details.push(
      `Parsed 100,000 CSV rows in ${results.csvParseTimeMs.toFixed(2)}ms (${parsedData.length} DataPoints created)`,
    );

    // Step 3: Test WASM Fitting across scaling dataset sizes (100, 1,000, 10,000, 50,000, 100,000)
    const datasetSizes = [100, 1000, 10000, 50000, 100000];
    console.log(
      "Benchmarking WASM Prophet fit & predict performance across scaling sizes...",
    );

    for (const size of datasetSizes) {
      const subset = parsedData.slice(0, size);
      const dsSecs = subset.map((d) =>
        Math.floor(new Date(d.ds).getTime() / 1000),
      );
      const yVals = subset.map((d) => d.y);

      const opts = {
        optimizer,
        growth: "linear" as const,
        nChangepoints: 25,
        changepointRange: 0.8,
        changepointPriorScale: 0.05,
        seasonalityMode: "additive" as const,
        seasonalityPriorScale: 10.0,
        holidaysPriorScale: 10.0,
        intervalWidth: 0.8,
        uncertaintySamples: 1000,
        yearlySeasonality: { type: "auto" as const },
        weeklySeasonality: { type: "auto" as const },
        dailySeasonality: { type: "auto" as const },
      };

      const prophet = new Prophet(opts);

      const fitStart = performance.now();
      prophet.fit({ ds: dsSecs, y: yVals });
      const fitDuration = performance.now() - fitStart;

      // Predict for 30 future points
      const lastTs = dsSecs[dsSecs.length - 1];
      const futureTs = Array.from(
        { length: 30 },
        (_, i) => lastTs + (i + 1) * 86400,
      );
      const allTs = [...dsSecs, ...futureTs];

      const predictStart = performance.now();
      const predictions = prophet.predict({ ds: allTs });
      const predictDuration = performance.now() - predictStart;

      prophet.free();

      const pointCount = predictions.yhat.point.length;
      const firstYhat = predictions.yhat.point[0];
      const lastYhat = predictions.yhat.point[pointCount - 1];

      // Validate output
      const isValid =
        pointCount === allTs.length &&
        !Number.isNaN(firstYhat) &&
        !Number.isNaN(lastYhat) &&
        Number.isFinite(firstYhat);

      results.details.push(
        `Size: ${size.toLocaleString().padStart(7)} rows -> Fit: ${fitDuration.toFixed(1).padStart(7)}ms | Predict: ${predictDuration.toFixed(1).padStart(7)}ms | Valid predictions: ${pointCount} points (Valid: ${isValid})`,
      );

      if (size === 100000) {
        results.fit100k = isValid;
        results.fitTimeMs = fitDuration;
        results.predictTimeMs = predictDuration;
      }
    }

    const memUsage = process.memoryUsage();
    results.memoryUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    results.scalingTestPassed =
      results.wasmInit && results.csvParse100k && results.fit100k;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.details.push(`ERROR in WASM/100k stress test: ${errorMsg}`);
  }

  return results;
}

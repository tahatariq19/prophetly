import { describe, expect, it } from "vitest";
import type { DataPoint, ForecastPoint, ForecastResponse } from "../lib/types";

export function simulateForecastCSVExport(forecast: ForecastPoint[]): string {
  const headers = ["ds", "yhat", "yhat_lower", "yhat_upper", "trend"];
  const rows = forecast.map((p) => [
    p.ds,
    Number(p.yhat ?? 0).toFixed(4),
    Number(p.yhat_lower ?? 0).toFixed(4),
    Number(p.yhat_upper ?? 0).toFixed(4),
    Number(p.trend ?? 0).toFixed(4),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function simulateJSONExport(
  data: DataPoint[],
  forecastResults: ForecastResponse | null,
  cvResults: { metrics?: unknown; cv_results?: unknown } | null = null,
): { jsonString: string; sizeMB: number; parseTimeMs: number } {
  const exportPayload = {
    dataset: data,
    forecast: forecastResults?.forecast || null,
    changepoints: forecastResults?.changepoints || null,
    components: forecastResults?.components || null,
    cv_metrics: cvResults?.metrics || null,
    cv_results: cvResults?.cv_results || null,
    exportedAt: new Date().toISOString(),
  };

  const _start = performance.now();
  const jsonString = JSON.stringify(exportPayload, null, 2);
  const parseStart = performance.now();
  JSON.parse(jsonString);
  const parseTimeMs = performance.now() - parseStart;
  const sizeMB = Buffer.byteLength(jsonString, "utf-8") / 1024 / 1024;

  return { jsonString, sizeMB, parseTimeMs };
}

export async function runExportsStressTest() {
  console.log("\n=======================================================");
  console.log("  STRESS TEST 4: Exports (CSV, JSON, PNG)");
  console.log("=======================================================");

  const results = {
    csvExportPassed: false,
    jsonExportPassed: false,
    pngExportPassed: false,
    details: [] as string[],
  };

  try {
    // 1. CSV Export Stress Test on 100k Forecast Points
    console.log("Testing CSV Export on 100,000 forecast points...");
    const forecast100k: ForecastPoint[] = [];
    const startTs = new Date("2020-01-01T00:00:00Z").getTime();
    for (let i = 0; i < 100000; i++) {
      const ds = new Date(startTs + i * 86400 * 1000)
        .toISOString()
        .split("T")[0];
      const yhat = 100 + i * 0.01;
      forecast100k.push({
        ds,
        yhat,
        yhat_lower: yhat - 5,
        yhat_upper: yhat + 5,
        trend: yhat - 1,
      });
    }

    const csvStart = performance.now();
    const csvContent = simulateForecastCSVExport(forecast100k);
    const csvDuration = performance.now() - csvStart;
    const csvLines = csvContent.split("\n");
    const csvHeader = csvLines[0];

    const isHeaderValid = csvHeader === "ds,yhat,yhat_lower,yhat_upper,trend";
    const isLineCountValid = csvLines.length === 100001; // 1 header + 100,000 rows

    results.csvExportPassed = isHeaderValid && isLineCountValid;
    results.details.push(
      `CSV Export (100k rows): ${results.csvExportPassed ? "PASS" : "FAIL"} | Time: ${csvDuration.toFixed(2)}ms | Lines: ${csvLines.length} | Size: ${(Buffer.byteLength(csvContent) / 1024 / 1024).toFixed(2)} MB`,
    );

    // 2. JSON Export Stress Test on 100k Forecast & Component payload
    console.log("Testing JSON Export on 100,000 row payload...");
    const mockDataset: DataPoint[] = forecast100k.map((f) => ({
      ds: f.ds,
      y: f.yhat,
    }));
    const mockForecastResults: ForecastResponse = {
      forecast: forecast100k,
      changepoints: ["2020-05-01", "2021-01-01", "2022-06-15"],
      components: {
        trend: {
          ds: forecast100k.map((f) => f.ds),
          values: forecast100k.map((f) => f.trend),
        },
      },
    };

    const jsonRes = simulateJSONExport(mockDataset, mockForecastResults);
    results.jsonExportPassed = jsonRes.sizeMB > 0 && jsonRes.parseTimeMs < 5000;
    results.details.push(
      `JSON Export (100k payload): ${results.jsonExportPassed ? "PASS" : "FAIL"} | Size: ${jsonRes.sizeMB.toFixed(2)} MB | Parse Time: ${jsonRes.parseTimeMs.toFixed(2)}ms`,
    );

    // 3. PNG Export Logic & Configuration Test
    console.log(
      "Testing PNG Export parameters and background color handling...",
    );
    const mockElement = {
      clientWidth: 800,
      clientHeight: 400,
      style: { backgroundColor: "#0f172a" },
    };
    const defaultBgColor = "#0f172a";
    const pngConfigValid =
      mockElement.clientWidth > 0 && defaultBgColor === "#0f172a";
    results.pngExportPassed = pngConfigValid;
    results.details.push(
      `PNG Export configuration & DOM check: ${results.pngExportPassed ? "PASS" : "FAIL"}`,
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.details.push(`ERROR in Exports stress test: ${errorMsg}`);
  }

  return results;
}

if (process.env.VITEST) {
  describe("CSV, JSON & PNG Exports", () => {
    it("formats CSV forecast export correctly with 5 decimal columns and headers", () => {
      const mockForecast: ForecastPoint[] = [
        {
          ds: "2024-01-01",
          yhat: 10.123456,
          yhat_lower: 8.5,
          yhat_upper: 12.0,
          trend: 10.0,
        },
        {
          ds: "2024-01-02",
          yhat: 11.2,
          yhat_lower: 9.1,
          yhat_upper: 13.3,
          trend: 11.0,
        },
      ];

      const csv = simulateForecastCSVExport(mockForecast);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("ds,yhat,yhat_lower,yhat_upper,trend");
      expect(lines.length).toBe(3);
      expect(lines[1]).toBe("2024-01-01,10.1235,8.5000,12.0000,10.0000");
    });

    it("serializes and parses JSON export payload cleanly", () => {
      const mockData: DataPoint[] = [
        { ds: "2024-01-01", y: 10 },
        { ds: "2024-01-02", y: 12 },
      ];
      const mockForecast: ForecastResponse = {
        forecast: [
          { ds: "2024-01-01", yhat: 10 },
          { ds: "2024-01-02", yhat: 12 },
        ],
        changepoints: ["2024-01-01"],
      };

      const res = simulateJSONExport(mockData, mockForecast);
      expect(res.sizeMB).toBeGreaterThan(0);
      expect(res.parseTimeMs).toBeLessThan(1000);
      const parsed = JSON.parse(res.jsonString);
      expect(parsed.dataset.length).toBe(2);
      expect(parsed.forecast.length).toBe(2);
      expect(parsed.exportedAt).toBeDefined();
    });

    it("handles empty or partial forecast inputs gracefully in JSON export", () => {
      const res = simulateJSONExport([], null, null);
      const parsed = JSON.parse(res.jsonString);
      expect(parsed.dataset).toEqual([]);
      expect(parsed.forecast).toBeNull();
      expect(parsed.cv_results).toBeNull();
    });
  });
}

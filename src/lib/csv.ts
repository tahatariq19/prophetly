import type { DataPoint, ForecastPoint } from "./types";

export interface CSVParseResult {
  columns: string[];
  rawRows: Array<Record<string, string>>;
  autoDs: string | null;
  autoY: string | null;
  autoCap: string | null;
  autoFloor: string | null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        cur += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ""));
  return result;
}

export function analyzeCSV(csvText: string): CSVParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least 1 data row.");
  }

  const columns = parseCSVLine(lines[0]);
  const lowerCols = columns.map((c) => c.toLowerCase());

  const dsIdx = lowerCols.findIndex(
    (c) => c === "ds" || c === "date" || c === "timestamp" || c === "time",
  );
  const yIdx = lowerCols.findIndex(
    (c) =>
      c === "y" ||
      c === "value" ||
      c === "sales" ||
      c === "close" ||
      c === "price" ||
      c === "count",
  );
  const capIdx = lowerCols.findIndex(
    (c) => c === "cap" || c === "capacity" || c === "max",
  );
  const floorIdx = lowerCols.findIndex((c) => c === "floor" || c === "min");

  const rawRows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0) continue;

    const record: Record<string, string> = {};
    columns.forEach((colName, idx) => {
      record[colName] = cols[idx] || "";
    });
    rawRows.push(record);
  }

  return {
    columns,
    rawRows,
    autoDs: dsIdx !== -1 ? columns[dsIdx] : columns[0] || null,
    autoY: yIdx !== -1 ? columns[yIdx] : columns[1] || null,
    autoCap: capIdx !== -1 ? columns[capIdx] : null,
    autoFloor: floorIdx !== -1 ? columns[floorIdx] : null,
  };
}

export function buildDataPointsFromCSV(
  rawRows: Array<Record<string, string>>,
  dsCol: string,
  yCol: string,
  capCol?: string | null,
  floorCol?: string | null,
  fixedCap?: number | null,
  fixedFloor?: number | null,
): DataPoint[] {
  const points: DataPoint[] = [];

  for (const row of rawRows) {
    const dsVal = row[dsCol];
    const rawY = row[yCol]
      ? String(row[yCol]).replace(/,/g, "").replace(/[$€£]/g, "").trim()
      : "";
    const yVal = Number.parseFloat(rawY);

    if (!dsVal || Number.isNaN(yVal)) continue;

    const pt: DataPoint = { ds: dsVal, y: yVal };

    // Cap (Column or Fixed)
    if (capCol && row[capCol] !== undefined) {
      const rawCap = String(row[capCol])
        .replace(/,/g, "")
        .replace(/[$€£]/g, "")
        .trim();
      const capParsed = Number.parseFloat(rawCap);
      if (!Number.isNaN(capParsed)) pt.cap = capParsed;
    } else if (
      fixedCap !== undefined &&
      fixedCap !== null &&
      !Number.isNaN(fixedCap)
    ) {
      pt.cap = fixedCap;
    }

    // Floor (Column or Fixed)
    if (floorCol && row[floorCol] !== undefined) {
      const rawFloor = String(row[floorCol])
        .replace(/,/g, "")
        .replace(/[$€£]/g, "")
        .trim();
      const floorParsed = Number.parseFloat(rawFloor);
      if (!Number.isNaN(floorParsed)) pt.floor = floorParsed;
    } else if (
      fixedFloor !== undefined &&
      fixedFloor !== null &&
      !Number.isNaN(fixedFloor)
    ) {
      pt.floor = fixedFloor;
    }

    points.push(pt);
  }

  if (points.length < 2) {
    throw new Error("Mapped dataset must contain at least 2 valid data rows.");
  }

  return points;
}

export function parseCSVText(csvText: string): DataPoint[] {
  const result = analyzeCSV(csvText);
  if (!result.autoDs || !result.autoY) {
    throw new Error("CSV must contain date and value columns.");
  }
  return buildDataPointsFromCSV(
    result.rawRows,
    result.autoDs,
    result.autoY,
    result.autoCap,
    result.autoFloor,
  );
}

export function detectFrequencyCode(data: { ds: string }[]): string {
  if (data.length < 2) return "D";
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(data.length, 150); i++) {
    const t1 = new Date(data[i - 1].ds).getTime();
    const t2 = new Date(data[i].ds).getTime();
    if (!isNaN(t1) && !isNaN(t2)) {
      diffs.push(Math.abs(t2 - t1));
    }
  }
  if (diffs.length === 0) return "D";
  diffs.sort((a, b) => a - b);
  const medianDiffMs = diffs[Math.floor(diffs.length / 2)];
  const diffHours = medianDiffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours >= 0.9 && diffHours <= 2) return "H";
  if (diffDays >= 0.8 && diffDays <= 1.2) return "D";
  if (diffDays >= 6 && diffDays <= 8) return "W";
  if (diffDays >= 27 && diffDays <= 32) return "M";
  if (diffDays >= 360 && diffDays <= 366) return "Y";
  return "D";
}

export function exportForecastCSV(forecast: ForecastPoint[]): void {
  const headers = ["ds", "yhat", "yhat_lower", "yhat_upper", "trend"];
  const rows = forecast.map((p) => [
    p.ds,
    Number(p.yhat ?? 0).toFixed(4),
    Number(p.yhat_lower ?? 0).toFixed(4),
    Number(p.yhat_upper ?? 0).toFixed(4),
    Number(p.trend ?? 0).toFixed(4),
  ]);

  const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `prophetly_forecast_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

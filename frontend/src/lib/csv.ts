import type { DataPoint, ForecastPoint } from "./types";

export interface CSVParseResult {
  columns: string[];
  rawRows: Array<Record<string, string>>;
  autoDs: string | null;
  autoY: string | null;
  autoCap: string | null;
  autoFloor: string | null;
}

export function analyzeCSV(csvText: string): CSVParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least 1 data row.");
  }

  const columns = lines[0].split(",").map((h) => h.trim());
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
    const cols = lines[i].split(",").map((c) => c.trim());
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
    const yVal = parseFloat(row[yCol]);

    if (!dsVal || isNaN(yVal)) continue;

    const pt: DataPoint = { ds: dsVal, y: yVal };

    // Cap (Column or Fixed)
    if (capCol && row[capCol] !== undefined) {
      const capParsed = parseFloat(row[capCol]);
      if (!isNaN(capParsed)) pt.cap = capParsed;
    } else if (
      fixedCap !== undefined &&
      fixedCap !== null &&
      !isNaN(fixedCap)
    ) {
      pt.cap = fixedCap;
    }

    // Floor (Column or Fixed)
    if (floorCol && row[floorCol] !== undefined) {
      const floorParsed = parseFloat(row[floorCol]);
      if (!isNaN(floorParsed)) pt.floor = floorParsed;
    } else if (
      fixedFloor !== undefined &&
      fixedFloor !== null &&
      !isNaN(fixedFloor)
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

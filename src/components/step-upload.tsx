import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  analyzeCSV,
  buildDataPointsFromCSV,
  type CSVParseResult,
} from "@/lib/csv";
import { SAMPLE_DATA } from "@/lib/sample-data";
import type { DataPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StepUploadProps {
  data: DataPoint[];
  sampleDataLoaded: boolean;
  onDataLoaded: (
    data: DataPoint[],
    isSample?: boolean,
    datasetName?: string,
  ) => void;
  onNext: () => void;
}

export function StepUpload({
  data,
  sampleDataLoaded,
  onDataLoaded,
  onNext,
}: StepUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null);
  const [overrideLargeDataset, setOverrideLargeDataset] = useState(false);

  // Mapping States
  const [selectedDs, setSelectedDs] = useState<string>("");
  const [selectedY, setSelectedY] = useState<string>("");
  const [selectedCap, setSelectedCap] = useState<string>("none");
  const [selectedFloor, setSelectedFloor] = useState<string>("none");
  const [fixedCap, setFixedCap] = useState<string>("");
  const [fixedFloor, setFixedFloor] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dataset statistics & Validation Warnings Calculation
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const yValues = data
      .map((d) => d.y)
      .filter((v) => typeof v === "number" && !isNaN(v));
    if (yValues.length === 0) return null;

    const min = Math.min(...yValues);
    const max = Math.max(...yValues);
    const sum = yValues.reduce((a, b) => a + b, 0);
    const mean = sum / yValues.length;
    const variance =
      yValues.reduce((a, b) => a + (b - mean) ** 2, 0) / yValues.length;
    const std = Math.sqrt(variance);

    // Frequency detection
    let detectedFreq = "Daily (D)";
    if (data.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < Math.min(data.length, 150); i++) {
        const t1 = new Date(data[i - 1].ds).getTime();
        const t2 = new Date(data[i].ds).getTime();
        if (!isNaN(t1) && !isNaN(t2)) {
          diffs.push(Math.abs(t2 - t1));
        }
      }
      if (diffs.length > 0) {
        diffs.sort((a, b) => a - b);
        const medianDiffMs = diffs[Math.floor(diffs.length / 2)];
        const diffHours = medianDiffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        if (diffHours < 0.9) detectedFreq = "Sub-hourly";
        else if (diffHours >= 0.9 && diffHours <= 2)
          detectedFreq = "Hourly (H)";
        else if (diffDays >= 0.8 && diffDays <= 1.2) detectedFreq = "Daily (D)";
        else if (diffDays >= 6 && diffDays <= 8) detectedFreq = "Weekly (W)";
        else if (diffDays >= 27 && diffDays <= 32) detectedFreq = "Monthly (M)";
        else if (diffDays >= 360 && diffDays <= 366)
          detectedFreq = "Yearly (Y)";
        else detectedFreq = `${diffDays.toFixed(1)} Days`;
      }
    }

    // Validation Warnings
    const warnings: string[] = [];
    const dsSet = new Set<string>();
    let duplicates = 0;
    let missingCount = 0;
    let dateGapCount = 0;

    let prevTime: number | null = null;
    let expectedDiffMs: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (!pt.ds || pt.y === undefined || pt.y === null || isNaN(pt.y)) {
        missingCount++;
      }
      if (dsSet.has(pt.ds)) {
        duplicates++;
      } else {
        dsSet.add(pt.ds);
      }

      const t = new Date(pt.ds).getTime();
      if (!isNaN(t)) {
        if (prevTime !== null) {
          const diff = t - prevTime;
          if (expectedDiffMs === null) {
            expectedDiffMs = diff;
          } else if (expectedDiffMs > 0 && diff > expectedDiffMs * 1.8) {
            dateGapCount++;
          }
        }
        prevTime = t;
      }
    }

    if (duplicates > 0) {
      warnings.push(
        `Found ${duplicates} duplicate timestamp(s). Prophet averages duplicates automatically.`,
      );
    }
    if (missingCount > 0) {
      warnings.push(
        `Found ${missingCount} row(s) with missing or invalid target values.`,
      );
    }
    if (dateGapCount > 0) {
      warnings.push(`Detected ${dateGapCount} potential date sequence gap(s).`);
    }

    return {
      count: data.length,
      startDate: data[0].ds,
      endDate: data[data.length - 1].ds,
      min,
      max,
      mean,
      std,
      detectedFreq,
      warnings,
    };
  }, [data]);

  const isLargeDataset = data.length > 100000;

  const applyMapping = (
    result: CSVParseResult,
    dsCol: string,
    yCol: string,
    capCol: string,
    floorCol: string,
    fCap: string,
    fFloor: string,
    fileName?: string,
  ) => {
    try {
      const parsedCapVal = fCap ? parseFloat(fCap) : null;
      const parsedFloorVal = fFloor ? parseFloat(fFloor) : null;

      const points = buildDataPointsFromCSV(
        result.rawRows,
        dsCol,
        yCol,
        capCol === "none" ? null : capCol,
        floorCol === "none" ? null : floorCol,
        parsedCapVal,
        parsedFloorVal,
      );
      setError(null);
      setOverrideLargeDataset(false);
      onDataLoaded(points, false, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to map columns.");
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a valid .csv file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = analyzeCSV(text);
        setCsvResult(result);

        const ds = result.autoDs || result.columns[0];
        const y = result.autoY || result.columns[1] || result.columns[0];
        const cap = result.autoCap || "none";
        const floor = result.autoFloor || "none";

        setSelectedDs(ds);
        setSelectedY(y);
        setSelectedCap(cap);
        setSelectedFloor(floor);

        applyMapping(
          result,
          ds,
          y,
          cap,
          floor,
          fixedCap,
          fixedFloor,
          file.name,
        );

        toast.success(
          `CSV uploaded successfully (${result.rawRows.length} rows)`,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse CSV file.",
        );
      }
    };
    reader.onerror = () => setError("Error reading file.");
    reader.readAsText(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleLoadSample = () => {
    setError(null);
    setCsvResult(null);
    setOverrideLargeDataset(false);
    onDataLoaded(SAMPLE_DATA, true);
    toast.success("Airline Passengers sample dataset loaded!");
  };

  const previewRows: Array<{ ds: string; y: string }> = csvResult
    ? csvResult.rawRows.slice(0, 5).map((row) => ({
        ds: row[selectedDs] || row[csvResult.columns[0]] || "",
        y: row[selectedY] || row[csvResult.columns[1]] || "",
      }))
    : data.slice(0, 5).map((d) => ({ ds: d.ds, y: String(d.y) }));

  return (
    <div className="flex h-full w-full items-center justify-center p-4 md:p-6 overflow-y-auto">
      <Card className="w-full max-w-xl border-border/60 shadow-lg my-auto max-h-[88vh] flex flex-col backdrop-blur-md bg-card/95">
        <CardHeader className="text-center pb-2 shrink-0">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Upload Time Series Data
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Provide a CSV file with date and target value columns.
          </CardDescription>

          {/* Privacy Touchpoint 2 Badge */}
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Badge
              variant="secondary"
              className="gap-1 text-[11px] py-0.5 px-2.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
            >
              <ShieldCheck className="size-3 text-emerald-500" />
              <span>Local Processing — Data never leaves your machine</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 p-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleKeyDown}
            aria-label="Upload CSV file dropzone"
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-ring",
              isDragging
                ? "border-primary bg-primary/5 scale-[0.99]"
                : data.length > 0
                  ? "border-primary/40 bg-muted/20 hover:border-primary/60"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              aria-label="Upload CSV file"
              className="hidden"
            />
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              {data.length > 0 ? (
                <CheckCircle2 className="size-5 text-primary" />
              ) : (
                <Upload className="size-5" />
              )}
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
              <p className="font-semibold text-foreground text-xs">
                {data.length > 0
                  ? "Dataset Loaded & Ready!"
                  : "Drag & drop your CSV file here"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                or click to browse from your computer
              </p>
            </div>
          </div>

          {/* Column Mapping Options */}
          {csvResult && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3.5 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Column Mapping & Bounds
                </span>
              </div>
              <FieldGroup className="grid grid-cols-2 gap-2 text-xs">
                <Field>
                  <FieldLabel htmlFor="col-ds" className="text-xs font-medium">
                    Date Column (ds)
                  </FieldLabel>
                  <Select
                    value={selectedDs}
                    onValueChange={(val: string | null) => {
                      if (!val) return;
                      setSelectedDs(val);
                      applyMapping(
                        csvResult,
                        val,
                        selectedY,
                        selectedCap,
                        selectedFloor,
                        fixedCap,
                        fixedFloor,
                      );
                    }}
                  >
                    <SelectTrigger id="col-ds" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {csvResult.columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="col-y" className="text-xs font-medium">
                    Value Column (y)
                  </FieldLabel>
                  <Select
                    value={selectedY}
                    onValueChange={(val: string | null) => {
                      if (!val) return;
                      setSelectedY(val);
                      applyMapping(
                        csvResult,
                        selectedDs,
                        val,
                        selectedCap,
                        selectedFloor,
                        fixedCap,
                        fixedFloor,
                      );
                    }}
                  >
                    <SelectTrigger id="col-y" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {csvResult.columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="col-cap" className="text-xs font-medium">
                    Capacity / Cap (Optional)
                  </FieldLabel>
                  <Select
                    value={selectedCap}
                    onValueChange={(val: string | null) => {
                      const c = val || "none";
                      setSelectedCap(c);
                      applyMapping(
                        csvResult,
                        selectedDs,
                        selectedY,
                        c,
                        selectedFloor,
                        fixedCap,
                        fixedFloor,
                      );
                    }}
                  >
                    <SelectTrigger id="col-cap" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">None (or Fixed)</SelectItem>
                        {csvResult.columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            Col: {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="col-floor"
                    className="text-xs font-medium"
                  >
                    Floor (Optional)
                  </FieldLabel>
                  <Select
                    value={selectedFloor}
                    onValueChange={(val: string | null) => {
                      const f = val || "none";
                      setSelectedFloor(f);
                      applyMapping(
                        csvResult,
                        selectedDs,
                        selectedY,
                        selectedCap,
                        f,
                        fixedCap,
                        fixedFloor,
                      );
                    }}
                  >
                    <SelectTrigger id="col-floor" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">None (or Fixed)</SelectItem>
                        {csvResult.columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            Col: {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                {selectedCap === "none" && (
                  <Field>
                    <FieldLabel
                      htmlFor="fixed-cap"
                      className="text-xs font-medium"
                    >
                      Fixed Cap Value
                    </FieldLabel>
                    <Input
                      id="fixed-cap"
                      type="number"
                      placeholder="e.g. 500"
                      value={fixedCap}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFixedCap(val);
                        applyMapping(
                          csvResult,
                          selectedDs,
                          selectedY,
                          selectedCap,
                          selectedFloor,
                          val,
                          fixedFloor,
                        );
                      }}
                      className="h-8 text-xs"
                    />
                  </Field>
                )}

                {selectedFloor === "none" && (
                  <Field>
                    <FieldLabel
                      htmlFor="fixed-floor"
                      className="text-xs font-medium"
                    >
                      Fixed Floor Value
                    </FieldLabel>
                    <Input
                      id="fixed-floor"
                      type="number"
                      placeholder="e.g. 0"
                      value={fixedFloor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFixedFloor(val);
                        applyMapping(
                          csvResult,
                          selectedDs,
                          selectedY,
                          selectedCap,
                          selectedFloor,
                          fixedCap,
                          val,
                        );
                      }}
                      className="h-8 text-xs"
                    />
                  </Field>
                )}
              </FieldGroup>
            </div>
          )}

          {/* Dataset Summary Card Post-Upload */}
          {stats && (
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {sampleDataLoaded
                      ? "Airline Passengers Dataset Summary"
                      : "Dataset Summary"}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] bg-primary/5 text-primary border-primary/20"
                >
                  {stats.detectedFreq}
                </Badge>
              </div>

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="flex flex-col rounded-md border p-2 bg-muted/30">
                  <span className="text-muted-foreground font-medium">
                    Rows
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {stats.count.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col rounded-md border p-2 bg-muted/30">
                  <span className="text-muted-foreground font-medium">
                    Min Target (y)
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {stats.min.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col rounded-md border p-2 bg-muted/30">
                  <span className="text-muted-foreground font-medium">
                    Max Target (y)
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {stats.max.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col rounded-md border p-2 bg-muted/30">
                  <span className="text-muted-foreground font-medium">
                    Mean ± Std
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {stats.mean.toFixed(1)} ± {stats.std.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Date Span:</span>
                <span className="font-mono text-foreground font-semibold">
                  {stats.startDate} → {stats.endDate}
                </span>
              </div>

              {/* Validation Warnings Box */}
              {stats.warnings.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {stats.warnings.map((w, idx) => (
                    <Alert
                      key={idx}
                      variant="default"
                      className="py-2 text-[11px] bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                    >
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <AlertDescription>{w}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Large Dataset Warning (>100,000 rows) */}
              {isLargeDataset && (
                <Alert variant="destructive" className="py-2 text-[11px]">
                  <AlertCircle className="size-4 shrink-0" />
                  <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
                    <span>
                      Dataset size is {stats.count.toLocaleString()} rows
                      (&gt;100,000). Fitting WASM models may take extended
                      processing time.
                    </span>
                    {!overrideLargeDataset ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] font-bold shrink-0 bg-background"
                        onClick={() => setOverrideLargeDataset(true)}
                      >
                        Override Limit
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                      >
                        Override Active
                      </Badge>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <TableIcon className="size-3.5" />
                  <span>First 5 Preview Rows</span>
                </div>
                <div className="rounded-md border bg-background overflow-hidden max-h-32 overflow-y-auto">
                  <Table className="text-[11px]">
                    <TableHeader>
                      <TableRow className="h-6 hover:bg-transparent">
                        <TableHead className="h-6 py-0.5 font-bold">
                          Date (ds)
                        </TableHead>
                        <TableHead className="h-6 py-0.5 font-bold text-right">
                          Value (y)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx} className="h-5">
                          <TableCell className="py-0.5 font-mono">
                            {row.ds}
                          </TableCell>
                          <TableCell className="py-0.5 font-mono text-right">
                            {row.y}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Or
            </span>
            <Separator className="flex-1" />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadSample}
            className="flex-1 text-xs"
          >
            <Sparkles data-icon="inline-start" className="text-amber-500" />
            Try Sample Data
          </Button>

          <Button
            type="button"
            disabled={
              data.length === 0 || (isLargeDataset && !overrideLargeDataset)
            }
            onClick={onNext}
            className="flex-1 text-xs font-semibold"
          >
            Continue to Config
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

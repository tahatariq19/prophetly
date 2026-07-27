import {
  Activity,
  BarChart3,
  Calendar,
  LineChart as ChartIcon,
  CheckCircle2,
  Download,
  FileQuestion,
  Layers,
  Percent,
  Play,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { CVConfigDialog } from "@/components/cv-config-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { exportForecastCSV } from "@/lib/csv";
import type { CVParams } from "@/lib/state";
import type {
  CrossValidationResponse,
  DataPoint,
  ForecastResponse,
} from "@/lib/types";

// Hoisted Chart Config Constants (Vercel React Performance Best Practice)
const FORECAST_CHART_CONFIG = {
  yhat: { label: "Forecast (yhat)", color: "var(--chart-1)" },
  bounds: {
    label: "Uncertainty Interval",
    color: "var(--chart-1)",
  },
};

const CV_OVERVIEW_CHART_CONFIG = {
  rmse: { label: "RMSE", color: "var(--chart-1)" },
  mae: { label: "MAE", color: "var(--chart-2)" },
  mse: { label: "MSE", color: "var(--chart-3)" },
};

const CV_MAPE_CHART_CONFIG = {
  mape: { label: "MAPE %", color: "var(--chart-1)" },
  mdape: { label: "MDAPE %", color: "var(--chart-2)" },
};

const CV_COVERAGE_CHART_CONFIG = {
  coverage: { label: "Coverage %", color: "var(--chart-3)" },
};

const CV_CUTOFFS_CHART_CONFIG = {
  actual: { label: "Actual (y)", color: "var(--chart-1)" },
  predicted: {
    label: "Predicted (yhat)",
    color: "var(--chart-2)",
  },
};

const DEFAULT_CHART_MARGIN = { top: 10, right: 20, left: 10, bottom: 20 };

interface StepResultsProps {
  data: DataPoint[];
  forecastResults: ForecastResponse | null;
  cvResults: CrossValidationResponse | null;
  cvParams: CVParams;
  activeResultsMode: "forecast" | "cross_validation";
  onModeChange: (mode: "forecast" | "cross_validation") => void;
  onReset: () => void;
  onRunCrossValidation: (customParams?: CVParams) => void;
  onRunForecast: () => void;
}

export function StepResults({
  data,
  forecastResults,
  cvResults,
  cvParams,
  activeResultsMode,
  onModeChange,
  onReset,
  onRunCrossValidation,
  onRunForecast,
}: StepResultsProps) {
  const [componentTab, setComponentTab] = useState<string>("trend");
  const [isCVDialogOpen, setIsCVDialogOpen] = useState<boolean>(false);

  // Memoize forecast chart data
  const forecastChartData = useMemo(() => {
    if (!forecastResults) return [];
    return forecastResults.forecast.map((pt) => ({
      ds: pt.ds.split(" ")[0],
      yhat: Number(pt.yhat.toFixed(2)),
      bounds: [
        Number(pt.yhat_lower.toFixed(2)),
        Number(pt.yhat_upper.toFixed(2)),
      ],
      trend: Number(pt.trend.toFixed(2)),
    }));
  }, [forecastResults]);

  // Component keys
  const componentKeys = useMemo(() => {
    return forecastResults ? Object.keys(forecastResults.components) : [];
  }, [forecastResults]);

  // Memoize CV metrics chart data
  const cvMetricsChartData = useMemo(() => {
    if (!cvResults) return [];
    return cvResults.metrics.horizon.map((h, i) => ({
      horizon: h,
      rmse: Number(cvResults.metrics.rmse[i]?.toFixed(2) || 0),
      mae: Number(cvResults.metrics.mae[i]?.toFixed(2) || 0),
      mse: Number(cvResults.metrics.mse[i]?.toFixed(2) || 0),
      mape: Number((cvResults.metrics.mape[i] * 100)?.toFixed(2) || 0),
      mdape: Number((cvResults.metrics.mdape[i] * 100)?.toFixed(2) || 0),
      coverage: Number((cvResults.metrics.coverage[i] * 100)?.toFixed(1) || 0),
    }));
  }, [cvResults]);

  // Memoize raw CV results cutoffs prediction vs actual data
  const cvCutoffsData = useMemo(() => {
    if (!cvResults?.cv_results) return [];
    return cvResults.cv_results.slice(0, 300).map((r) => ({
      ds: String(r.ds || "").split(" ")[0],
      cutoff: String(r.cutoff || "").split(" ")[0],
      actual: Number(r.y) || 0,
      predicted: Number(r.yhat) || 0,
    }));
  }, [cvResults]);

  if (!forecastResults && !cvResults) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <Empty className="max-w-md border bg-card/90 shadow-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No Model Results Found</EmptyTitle>
            <EmptyDescription>
              No forecast or cross-validation data available. Return to the
              configuration step to run your model.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={onReset}>
              <RefreshCw data-icon="inline-start" />
              Start Fresh
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const handleExport = () => {
    if (forecastResults) {
      exportForecastCSV(forecastResults.forecast);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-3 md:p-6 overflow-hidden">
      <Card className="w-full max-w-5xl h-[88vh] flex flex-col border-border/60 shadow-xl my-auto backdrop-blur-md bg-card/95">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b shrink-0 px-6 py-3.5 gap-3">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-bold tracking-tight">
                {activeResultsMode === "forecast" && forecastResults
                  ? "Forecast Results"
                  : "Cross-Validation Performance"}
              </CardTitle>

              {/* ToggleGroup for Mode Selection */}
              {(forecastResults || cvResults) && (
                <ToggleGroup
                  value={[activeResultsMode]}
                  onValueChange={(val: string[]) =>
                    val[0] &&
                    onModeChange(val[0] as "forecast" | "cross_validation")
                  }
                  className="bg-muted p-0.5 rounded-lg border border-border/40"
                >
                  {forecastResults && (
                    <ToggleGroupItem
                      value="forecast"
                      aria-label="Forecast view"
                      className="text-xs px-2.5 py-1"
                    >
                      Forecast
                    </ToggleGroupItem>
                  )}
                  {cvResults && (
                    <ToggleGroupItem
                      value="cross_validation"
                      aria-label="Cross-validation view"
                      className="text-xs px-2.5 py-1"
                    >
                      Cross-Validation
                    </ToggleGroupItem>
                  )}
                </ToggleGroup>
              )}
            </div>

            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {activeResultsMode === "forecast" && forecastResults
                ? `Generated ${forecastResults.forecast.length} predictions.`
                : `Calculated metrics across ${cvResults?.metrics.horizon.length || 0} horizons.`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCVDialogOpen(true)}
              className="text-xs h-8 font-semibold text-primary border-primary/40 hover:bg-primary/10"
            >
              <Activity data-icon="inline-start" />
              {cvResults ? "Configure CV Split" : "Run Cross-Validation"}
            </Button>

            {!forecastResults && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRunForecast}
                className="text-xs h-8 font-semibold text-primary border-primary/40 hover:bg-primary/10"
              >
                <Play data-icon="inline-start" className="fill-current" />
                Run Forecast
              </Button>
            )}

            {forecastResults && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="text-xs h-8"
              >
                <Download data-icon="inline-start" />
                Export CSV
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onReset}
              className="text-xs h-8"
            >
              <RefreshCw data-icon="inline-start" />
              Start Fresh
            </Button>
          </div>
        </CardHeader>

        {/* Modal Dialog Pop-up for Cross-Validation */}
        <CVConfigDialog
          open={isCVDialogOpen}
          onOpenChange={setIsCVDialogOpen}
          data={data}
          cvParams={cvParams}
          onConfirm={(newParams) => {
            onRunCrossValidation(newParams);
          }}
        />

        <CardContent className="flex-1 overflow-hidden p-4 md:p-6">
          {activeResultsMode === "forecast" && forecastResults ? (
            <Tabs defaultValue="chart" className="flex h-full flex-col">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 gap-6 h-9 shrink-0">
                <TabsTrigger
                  value="chart"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <ChartIcon data-icon="inline-start" />
                  Forecast Chart
                </TabsTrigger>
                <TabsTrigger
                  value="components"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <Layers data-icon="inline-start" />
                  Components Breakdown ({componentKeys.length})
                </TabsTrigger>
                <TabsTrigger
                  value="changepoints"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <Calendar data-icon="inline-start" />
                  Changepoints ({forecastResults.changepoints.length})
                </TabsTrigger>
              </TabsList>

              {/* Main Forecast Chart */}
              <TabsContent value="chart" className="flex-1 pt-4 h-full min-h-0">
                <ChartContainer
                  config={FORECAST_CHART_CONFIG}
                  className="h-full w-full"
                  aria-label="Main Prophet forecast chart with upper/lower uncertainty bounds"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={forecastChartData}
                      margin={DEFAULT_CHART_MARGIN}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="ds"
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                        tickMargin={8}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="bounds"
                        stroke="none"
                        fill="var(--chart-1)"
                        fillOpacity={0.2}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                      <Line
                        type="monotone"
                        dataKey="yhat"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>

              {/* Components Sub-Tabs */}
              <TabsContent
                value="components"
                className="flex-1 pt-4 h-full flex flex-col min-h-0"
              >
                {componentKeys.length > 0 ? (
                  <Tabs
                    value={componentTab}
                    onValueChange={setComponentTab}
                    className="flex h-full flex-col"
                  >
                    {/* Scrollable Sub-Tabs Bar */}
                    <div className="shrink-0 w-full overflow-x-auto pb-1.5 scrollbar-thin">
                      <TabsList className="inline-flex h-9 items-center justify-start bg-muted p-1 rounded-lg gap-1 min-w-max">
                        {componentKeys.map((key) => (
                          <TabsTrigger
                            key={key}
                            value={key}
                            className="text-xs px-3 py-1.5 capitalize shrink-0 font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold shadow-xs"
                          >
                            {key}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    {componentKeys.map((key) => {
                      const comp = forecastResults.components[key];
                      const compDs = comp?.ds || [];
                      const compValues = comp?.values || [];
                      const compChartData = compDs.map((d, i) => ({
                        ds: String(d || "").split(" ")[0],
                        value: Number((compValues[i] ?? 0).toFixed(4)),
                      }));

                      return (
                        <TabsContent
                          key={key}
                          value={key}
                          className="flex-1 pt-3 h-full min-h-0"
                        >
                          <ChartContainer
                            config={{
                              value: { label: key, color: "var(--chart-2)" },
                            }}
                            className="h-full w-full"
                            aria-label={`Forecast component breakdown chart for ${key}`}
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart
                                data={compChartData}
                                margin={DEFAULT_CHART_MARGIN}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  opacity={0.3}
                                />
                                <XAxis
                                  dataKey="ds"
                                  tick={{
                                    fontSize: 11,
                                    fill: "var(--foreground)",
                                  }}
                                />
                                <YAxis
                                  tick={{
                                    fontSize: 11,
                                    fill: "var(--foreground)",
                                  }}
                                />
                                <RechartsTooltip
                                  content={<ChartTooltipContent />}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="var(--chart-2)"
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={true}
                                  animationDuration={350}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                ) : (
                  <Empty className="h-full border-0">
                    <EmptyHeader>
                      <EmptyTitle>No components extracted</EmptyTitle>
                      <EmptyDescription>
                        The model did not separate seasonal or trend components
                        for this dataset.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>

              {/* Changepoints Tab */}
              <TabsContent
                value="changepoints"
                className="flex-1 pt-4 overflow-y-auto min-h-0"
              >
                <div className="flex flex-wrap gap-2 p-2">
                  {forecastResults.changepoints.map((cp, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="font-mono text-xs py-1 px-2.5"
                    >
                      {cp}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          ) : cvResults ? (
            <Tabs defaultValue="overview" className="flex h-full flex-col">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 gap-6 h-9 shrink-0">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <TrendingUp data-icon="inline-start" />
                  Error Metrics (RMSE / MAE / MSE)
                </TabsTrigger>
                <TabsTrigger
                  value="mape"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <Percent data-icon="inline-start" />% Errors (MAPE & MDAPE)
                </TabsTrigger>
                <TabsTrigger
                  value="coverage"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <CheckCircle2 data-icon="inline-start" />
                  Prediction Coverage
                </TabsTrigger>
                <TabsTrigger
                  value="cutoffs"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <ChartIcon data-icon="inline-start" />
                  Actual vs Predicted
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 text-xs font-semibold gap-1.5"
                >
                  <BarChart3 data-icon="inline-start" />
                  Metrics Table
                </TabsTrigger>
              </TabsList>

              {/* 1. RMSE & MAE vs Horizon */}
              <TabsContent
                value="overview"
                className="flex-1 pt-4 h-full min-h-0"
              >
                <ChartContainer
                  config={CV_OVERVIEW_CHART_CONFIG}
                  className="h-full w-full"
                  aria-label="Cross-validation RMSE and MAE error metrics vs forecast horizon chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={cvMetricsChartData}
                      margin={DEFAULT_CHART_MARGIN}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="horizon"
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="rmse"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                      <Line
                        type="monotone"
                        dataKey="mae"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>

              {/* 2. MAPE & MDAPE Chart */}
              <TabsContent value="mape" className="flex-1 pt-4 h-full min-h-0">
                <ChartContainer
                  config={CV_MAPE_CHART_CONFIG}
                  className="h-full w-full"
                  aria-label="Cross-validation MAPE and MDAPE percentage error metrics chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={cvMetricsChartData}
                      margin={DEFAULT_CHART_MARGIN}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="horizon"
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                        unit="%"
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="mape"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                      <Line
                        type="monotone"
                        dataKey="mdape"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>

              {/* 3. Coverage % Chart */}
              <TabsContent
                value="coverage"
                className="flex-1 pt-4 h-full min-h-0"
              >
                <ChartContainer
                  config={CV_COVERAGE_CHART_CONFIG}
                  className="h-full w-full"
                  aria-label="Cross-validation interval coverage percentage chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={cvMetricsChartData}
                      margin={DEFAULT_CHART_MARGIN}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="horizon"
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                        unit="%"
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="coverage"
                        fill="var(--chart-3)"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>

              {/* 4. Cutoffs Actual vs Predicted Chart */}
              <TabsContent
                value="cutoffs"
                className="flex-1 pt-4 h-full min-h-0"
              >
                <ChartContainer
                  config={CV_CUTOFFS_CHART_CONFIG}
                  className="h-full w-full"
                  aria-label="Cross-validation actual vs predicted cutoff values chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={cvCutoffsData}
                      margin={DEFAULT_CHART_MARGIN}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="ds"
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--foreground)" }}
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="var(--chart-1)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={350}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>

              {/* 5. Metrics Table */}
              <TabsContent
                value="table"
                className="flex-1 pt-4 overflow-y-auto min-h-0"
              >
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Horizon</TableHead>
                        <TableHead className="text-xs text-right">
                          MSE
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          RMSE
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          MAE
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          MAPE
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          MDAPE
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          Coverage
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cvResults.metrics.horizon.map((h, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {h}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {cvResults.metrics.mse[i]?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {cvResults.metrics.rmse[i]?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {cvResults.metrics.mae[i]?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {(cvResults.metrics.mape[i] * 100)?.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {(cvResults.metrics.mdape[i] * 100)?.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold">
                            {(cvResults.metrics.coverage[i] * 100)?.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

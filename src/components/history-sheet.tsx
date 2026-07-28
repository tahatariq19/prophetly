import {
  Calendar,
  Clock,
  Database,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  clearHistory,
  deleteHistoryEntry,
  type ForecastHistoryEntry,
  getHistory,
} from "@/lib/history";

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadConfig: (entry: ForecastHistoryEntry) => void;
}

export function HistorySheet({
  open,
  onOpenChange,
  onLoadConfig,
}: HistorySheetProps) {
  const [history, setHistory] = useState<ForecastHistoryEntry[]>([]);

  const refreshHistory = useCallback(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    if (open) {
      refreshHistory();
    }
  }, [open, refreshHistory]);

  useEffect(() => {
    const handleUpdate = () => refreshHistory();
    window.addEventListener("prophetly_history_updated", handleUpdate);
    return () => {
      window.removeEventListener("prophetly_history_updated", handleUpdate);
    };
  }, [refreshHistory]);

  const handleClear = () => {
    clearHistory();
    toast.success("Forecast history cleared");
  };

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    toast.success("History entry removed");
  };

  const handleSelect = (entry: ForecastHistoryEntry) => {
    onLoadConfig(entry);
    onOpenChange(false);
    toast.info(`Loaded configuration for "${entry.datasetName}"`);
  };

  const formatValue = (
    val?: number | number[],
    isPct = false,
  ): string | null => {
    if (val === undefined || val === null) return null;
    const num = Array.isArray(val) ? val[0] : val;
    if (typeof num !== "number" || Number.isNaN(num)) return null;
    return isPct
      ? `${(num * (num <= 1 ? 100 : 1)).toFixed(2)}%`
      : num.toFixed(3);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg flex flex-col p-6 overflow-hidden"
      >
        <SheetHeader className="pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              <SheetTitle className="text-lg font-bold">
                Forecast History
              </SheetTitle>
            </div>
            {history.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
              >
                <Trash2 className="size-3.5" />
                Clear History
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Recent forecast runs (up to 10 stored locally). Load config to
            re-run.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed rounded-xl bg-muted/20">
              <History className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                No History Yet
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Run a forecast or cross-validation to automatically save history
                runs here.
              </p>
            </div>
          ) : (
            history.map((entry) => {
              const rmse = formatValue(
                entry.metrics?.rmse ?? entry.forecastSummary?.metrics?.rmse,
              );
              const mae = formatValue(
                entry.metrics?.mae ?? entry.forecastSummary?.metrics?.mae,
              );
              const mape = formatValue(
                entry.metrics?.mape ?? entry.forecastSummary?.metrics?.mape,
                true,
              );
              const coverage = formatValue(
                entry.metrics?.coverage ??
                  entry.forecastSummary?.metrics?.coverage,
                true,
              );

              return (
                <Card
                  key={entry.id}
                  className="border-border/60 shadow-xs hover:border-primary/40 transition-all bg-card/80"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1">
                            <Database className="size-3.5 text-primary" />
                            {entry.datasetName}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-mono"
                          >
                            {entry.rowCount} rows
                          </Badge>
                          {entry.actionType && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 uppercase"
                            >
                              {entry.actionType.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(entry.timestamp).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          {entry.executionTimeMs !== undefined && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="size-3" />
                              {entry.executionTimeMs < 1000
                                ? `${entry.executionTimeMs}ms`
                                : `${(entry.executionTimeMs / 1000).toFixed(2)}s`}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        title="Delete entry"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    {/* Parameters Summary */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-muted/40 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Growth: </span>
                        <span className="font-semibold">
                          {entry.config.growth}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-normal">
                          Mode:{" "}
                        </span>
                        <span className="font-semibold">
                          {entry.config.seasonality_mode}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Holidays:{" "}
                        </span>
                        <span className="font-semibold">
                          {entry.config.country_holidays || "None"}
                        </span>
                      </div>
                      {entry.forecastParams && (
                        <div>
                          <span className="text-muted-foreground">
                            Horizon:{" "}
                          </span>
                          <span className="font-semibold">
                            {entry.forecastParams.periods} (
                            {entry.forecastParams.freq})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Key Metrics if present */}
                    {(rmse || mae || mape || coverage) && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t text-[11px]">
                        {rmse && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground font-medium">
                              RMSE:
                            </span>
                            <span className="font-mono font-semibold text-primary">
                              {rmse}
                            </span>
                          </div>
                        )}
                        {mae && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground font-medium">
                              MAE:
                            </span>
                            <span className="font-mono font-semibold">
                              {mae}
                            </span>
                          </div>
                        )}
                        {mape && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground font-medium">
                              MAPE:
                            </span>
                            <span className="font-mono font-semibold">
                              {mape}
                            </span>
                          </div>
                        )}
                        {coverage && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground font-medium">
                              Coverage:
                            </span>
                            <span className="font-mono font-semibold">
                              {coverage}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSelect(entry)}
                      className="w-full text-xs gap-1.5 h-8 font-semibold mt-1"
                    >
                      <RotateCcw className="size-3.5 text-primary" />
                      Re-run / Load Config
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

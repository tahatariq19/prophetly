import { useState } from 'react';
import { Loader2, ArrowRight, Settings2, BarChart3, UploadCloud, ChevronLeft, RotateCcw } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { DataUpload } from '@/components/DataUpload';
import { ModelConfig } from '@/components/ModelConfig';
import { ForecastChart } from '@/components/ForecastChart';
import { CrossValidationPanel } from '@/components/CrossValidationPanel';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/stores/dataStore';
import { useConfigStore } from '@/stores/configStore';
import { useResultsStore } from '@/stores/resultsStore';
import { generateForecast, isBackendWarmingUp } from '@/services/api';
import type { ForecastRequest } from '@/types';

function App() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Config, 3: Results
  const [lastForecastRequest, setLastForecastRequest] = useState<ForecastRequest | null>(null);

  const { rawData, isDataValid, clearData } = useDataStore();
  const { config, periods, freq } = useConfigStore();
  const { isLoading, setLoading, setForecast, setError, forecast, clearResults, isWarmingUp, setWarmingUp, error } = useResultsStore();

  const handleRunForecast = async () => {
    if (!isDataValid()) return;

    const request: ForecastRequest = {
      data: rawData,
      config,
      periods,
      freq,
    };

    setLastForecastRequest(request);
    setLoading(true);
    setWarmingUp(true);

    try {
      const result = await generateForecast(request);
      setForecast(result);
      toast.success('Forecast generated successfully!');
      setStep(3);
      setWarmingUp(false);
    } catch (err) {
      setWarmingUp(false);

      if (isBackendWarmingUp(err)) {
        // Backend is warming up - show timeout message
        const timeoutMsg =
          'Backend is warming up (first request can take a minute). Please wait or click Retry.';
        setError(timeoutMsg);
        toast.error(timeoutMsg);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to generate forecast';
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryForecast = async () => {
    if (!lastForecastRequest) return;
    setLoading(true);
    setWarmingUp(true);

    try {
      const result = await generateForecast(lastForecastRequest);
      setForecast(result);
      toast.success('Forecast generated successfully!');
      setStep(3);
      setWarmingUp(false);
    } catch (err) {
      setWarmingUp(false);

      if (isBackendWarmingUp(err)) {
        const timeoutMsg =
          'Backend is still warming up. Please wait a bit more and try again.';
        setError(timeoutMsg);
        toast.error(timeoutMsg);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to generate forecast';
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  }

  const handleReset = () => {
    setStep(1);
    clearData();
    clearResults();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30 flex flex-col items-center p-6 overflow-hidden">
      {/* Progress header - Relative now to avoid overlap */}
      <div className="w-full flex justify-center items-center gap-4 text-sm font-medium text-zinc-500 py-8 mb-4 shrink-0 z-10">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-zinc-200' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-zinc-800'}`}>1</div>
          <span>Data</span>
        </div>
        <div className="w-8 h-px bg-zinc-800" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-zinc-200' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-zinc-800'}`}>2</div>
          <span>Configuration</span>
        </div>
        <div className="w-8 h-px bg-zinc-800" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-zinc-200' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 3 ? 'border-purple-500 bg-purple-500/20 text-purple-400' : 'border-zinc-800'}`}>3</div>
          <span>Forecast</span>
        </div>
      </div>

      <main className="w-full max-w-6xl relative flex-1 flex flex-col">
        {/* Warmup Banner - Shows when backend is starting up */}
        {isWarmingUp && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-96 text-center shadow-2xl">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Backend Warming Up</h3>
              <p className="text-sm text-zinc-400 mb-6">
                The forecast server is starting up. This usually takes 30-60 seconds on first request.
              </p>
              <p className="text-xs text-zinc-500">Please wait...</p>
            </div>
          </div>
        )}

        {/* Timeout Error Banner - Shows when request times out */}
        {error && isBackendWarmingUp(new Error()) && !isWarmingUp && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-amber-500 mt-0.5">⚠</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">{error}</p>
                <Button
                  onClick={handleRetryForecast}
                  disabled={isLoading}
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto my-auto">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center mx-auto shadow-xl shadow-purple-900/10">
                <UploadCloud className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">Upload your dataset</h1>
              <p className="text-zinc-400 max-w-md mx-auto">Prophetly expects a CSV file with at least a date column (`ds`) and a value column (`y`).</p>
            </div>

            <div className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-2 shadow-2xl">
              <DataUpload />
            </div>

            {isDataValid() && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button
                  onClick={() => setStep(2)}
                  size="lg"
                  className="h-12 px-8 bg-white text-zinc-950 hover:bg-zinc-200 hover:scale-105 transition-all cursor-pointer font-medium"
                >
                  Configure Model <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div className="animate-in fade-in zoom-in-95 slide-in-from-right-8 duration-500 w-full max-w-2xl mx-auto my-auto">
            <div className="flex items-center justify-between mb-8">
              <Button variant="ghost" onClick={handleBack} className="text-zinc-400 hover:text-white cursor-pointer hover:bg-zinc-800/50">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-400" /> Model Configuration
              </h2>
              <div className="w-20" /> {/* spacer */}
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-2xl">
              <ModelConfig />

              <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-end">
                <Button
                  onClick={handleRunForecast}
                  disabled={isLoading}
                  size="lg"
                  className="h-12 px-8 bg-purple-600 hover:bg-purple-500 text-white min-w-[200px] shadow-lg shadow-purple-900/20 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      Generate Forecast
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && forecast && (
          <div className="animate-in fade-in zoom-in-95 slide-in-from-right-8 duration-500 w-full h-[85vh] flex flex-col gap-6">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleReset} className="text-zinc-400 hover:text-white cursor-pointer hover:bg-zinc-800/50 text-sm">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Start Over
                </Button>
                <div className="h-4 w-px bg-zinc-800" />
                <span className="text-sm text-zinc-400">Model trained on {rawData.length} rows</span>
              </div>

              <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-400">Forecast Ready</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 overflow-y-auto px-1 pb-20 custom-scrollbar">
              {/* Main Chart Area - Full Width */}
              <div className="w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" /> Forecast Overview
                  </h3>
                </div>
                <div className="flex-1 min-h-0">
                  <ForecastChart historicalData={rawData} />
                </div>
              </div>

              {/* Validation Panel - Full Width below */}
              <div className="w-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                <div className="mb-6">
                  <h3 className="font-semibold text-white mb-1">Model Validation</h3>
                  <p className="text-sm text-zinc-400">Run backtesting to verify model accuracy</p>
                </div>
                <CrossValidationPanel />
              </div>
            </div>
          </div>
        )}
      </main>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

export default App;

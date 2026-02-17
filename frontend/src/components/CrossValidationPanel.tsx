import { useState, useEffect, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useResultsStore } from '@/stores/resultsStore';
import { useConfigStore } from '@/stores/configStore';
import { useDataStore } from '@/stores/dataStore';
import { runCrossValidation, isBackendWarmingUp } from '@/services/api';
import type { CrossValidationRequest } from '@/types';

export function CrossValidationPanel() {
    const [loading, setLoading] = useState(false);
    const [lastCvRequest, setLastCvRequest] = useState<CrossValidationRequest | null>(null);

    // Mode: 'auto' (Percentage) or 'manual' (Days)
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');

    // Manual State
    const [initial, setInitial] = useState('365 days');
    const [period, setPeriod] = useState('180 days');
    const [horizon, setHorizon] = useState('365 days');

    // Auto State (Percentages)
    // We manage 3 values that sum to 100
    const [split, setSplit] = useState({ train: 70, period: 10, horizon: 20 });

    const updateSplit = (key: 'train' | 'period' | 'horizon', newVal: number) => {
        // Clamp value
        let val = Math.max(1, Math.min(newVal, 99));

        // Calculate delta and remaining
        const oldVal = split[key];
        const delta = val - oldVal;

        // If delta is 0, do nothing
        if (delta === 0) return;

        // We need to decrease the other two by delta total
        const others = (Object.keys(split) as Array<keyof typeof split>).filter(k => k !== key);
        const sumOthers = split[others[0]] + split[others[1]];

        const newSplit = { ...split, [key]: val };

        if (sumOthers === 0) {
            // Edge case: others are 0, split evenly
            const rem = 100 - val;
            newSplit[others[0]] = rem / 2;
            newSplit[others[1]] = rem / 2;
        } else {
            // Distribute delta proportional to existing size
            // If we increased key, we reduce others. If we decreased key, we increase others.
            // Actually, simpler: distribute remaining (100 - val) proportionally
            const remaining = 100 - val;
            const ratio0 = split[others[0]] / sumOthers;
            // If split[others[0]] is 0 and sumOthers is 0 (handled above), or just split[others[0]] is 0

            newSplit[others[0]] = Math.floor(remaining * ratio0);
            newSplit[others[1]] = remaining - newSplit[others[0]]; // Ensure precise sum to 100
        }

        setSplit(newSplit);
    };


    const { cvResults, setCvResults, cvError, setCvError, isCvWarmingUp, setCvWarmingUp } = useResultsStore();
    const { config } = useConfigStore();
    const { rawData, isDataValid } = useDataStore();

    // Calculate dataset stats
    const dataStats = useMemo(() => {
        if (!rawData || rawData.length < 2) return null;
        const dates = rawData.map(d => new Date(d.ds).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        return { minDate, maxDate, totalDays };
    }, [rawData]);

    // Update manual fields when Auto params change
    useEffect(() => {
        if (mode === 'auto' && dataStats) {
            const initialDays = Math.floor(dataStats.totalDays * (split.train / 100));
            const horizonDays = Math.floor(dataStats.totalDays * (split.horizon / 100));
            const periodDays = Math.floor(dataStats.totalDays * (split.period / 100));

            setInitial(`${initialDays} days`);
            setHorizon(`${horizonDays} days`);
            setPeriod(`${Math.max(1, periodDays)} days`);
        }
    }, [mode, split, dataStats]);

    const handleRunCV = async () => {
        if (!isDataValid()) return;

        const request: CrossValidationRequest = {
            data: rawData,
            config,
            initial,
            period,
            horizon,
        };

        setLastCvRequest(request);
        setLoading(true);
        setCvWarmingUp(true);

        try {
            const result = await runCrossValidation(request);
            setCvResults(result);
            toast.success('Cross-validation completed!');
            setCvWarmingUp(false);
        } catch (err) {
            setCvWarmingUp(false);

            if (isBackendWarmingUp(err)) {
                const timeoutMsg =
                    'Backend is warming up. Please wait and try again.';
                setCvError(timeoutMsg);
                toast.error(timeoutMsg);
            } else {
                const message = err instanceof Error ? err.message : 'Cross-validation failed';
                setCvError(message);
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRetryCv = async () => {
        if (!lastCvRequest) return;
        setLoading(true);
        setCvWarmingUp(true);

        try {
            const result = await runCrossValidation(lastCvRequest);
            setCvResults(result);
            toast.success('Cross-validation completed!');
            setCvWarmingUp(false);
        } catch (err) {
            setCvWarmingUp(false);

            if (isBackendWarmingUp(err)) {
                const timeoutMsg =
                    'Backend is still warming up. Please wait and try again.';
                setCvError(timeoutMsg);
                toast.error(timeoutMsg);
            } else {
                const message = err instanceof Error ? err.message : 'Cross-validation failed';
                setCvError(message);
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const chartData = cvResults?.metrics.horizon.map((h, i) => ({
        horizon: h,
        mape: cvResults.metrics.mape[i] * 100, // Convert to percentage
        rmse: cvResults.metrics.rmse[i],
        mae: cvResults.metrics.mae[i],
    })) || [];

    return (
        <div className="space-y-6">
            {/* Warmup Banner - Shows when backend is starting up */}
            {isCvWarmingUp && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        <span className="text-sm text-purple-300">
                            Running cross-validation... Backend is warming up. This may take a minute.
                        </span>
                    </div>
                </div>
            )}

            {/* Timeout Error Banner - Shows when request times out */}
            {cvError && isBackendWarmingUp(new Error()) && !isCvWarmingUp && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-amber-500 mt-0.5">⚠</div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-200">{cvError}</p>
                            <Button
                                onClick={handleRetryCv}
                                disabled={loading}
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
            {/* Controls Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={mode === 'auto'}
                        onCheckedChange={(v) => setMode(v ? 'auto' : 'manual')}
                        id="cv-mode"
                        className="data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor="cv-mode" className="text-zinc-400 cursor-pointer">
                        {mode === 'auto' ? 'Smart Split (%)' : 'Manual (Days)'}
                    </Label>
                </div>
                {dataStats && (
                    <span className="text-xs text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">
                        Dataset Duration: ~{Math.round(dataStats.totalDays)} days
                    </span>
                )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                {mode === 'auto' ? (
                    <>
                        {/* 3 Reactive Sliders */}
                        <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Training</span>
                                    <span>{split.train}%</span>
                                </div>
                                <Slider
                                    value={[split.train]}
                                    onValueChange={([v]) => updateSplit('train', v)}
                                    min={10}
                                    max={90}
                                    step={1}
                                    className="py-2"
                                />
                                <p className="text-[10px] text-zinc-600 text-right">~{parseInt(initial)} days</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Period</span>
                                    <span>{split.period}%</span>
                                </div>
                                <Slider
                                    value={[split.period]}
                                    onValueChange={([v]) => updateSplit('period', v)}
                                    min={1}
                                    max={90}
                                    step={1}
                                    className="py-2"
                                />
                                <p className="text-[10px] text-zinc-600 text-right">~{parseInt(period)} days</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Horizon</span>
                                    <span>{split.horizon}%</span>
                                </div>
                                <Slider
                                    value={[split.horizon]}
                                    onValueChange={([v]) => updateSplit('horizon', v)}
                                    min={1}
                                    max={90}
                                    step={1}
                                    className="py-2"
                                />
                                <p className="text-[10px] text-zinc-600 text-right">~{parseInt(horizon)} days</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs">Initial Training</Label>
                            <Input
                                value={initial}
                                onChange={(e) => setInitial(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-white h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs">Cutoff Period</Label>
                            <Input
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-white h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs">Forecast Horizon</Label>
                            <Input
                                value={horizon}
                                onChange={(e) => setHorizon(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-white h-9"
                            />
                        </div>
                    </>
                )}

                <Button
                    onClick={handleRunCV}
                    disabled={loading || !isDataValid()}
                    className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 cursor-pointer h-9 w-full md:w-auto"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            Run
                        </>
                    )}
                </Button>
            </div>

            {cvResults && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pt-4 border-t border-zinc-800/50">
                    <div className="col-span-2 h-[300px] border border-zinc-800 rounded-lg p-4 bg-zinc-950/50">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="horizon"
                                    stroke="#71717a"
                                    tick={{ fontSize: 10, fill: '#71717a' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#71717a"
                                    tick={{ fontSize: 10, fill: '#71717a' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        border: '1px solid #27272a',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                />
                                <Line name="MAPE" type="monotone" dataKey="mape" stroke="#a855f7" strokeWidth={2} dot={false} />
                                <Line name="RMSE" type="monotone" dataKey="rmse" stroke="#06b6d4" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-center flex flex-col items-center justify-center h-[140px]">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Average MAPE</div>
                            <div className="text-3xl font-bold text-purple-400">
                                {(cvResults.metrics.mape.reduce((a, b) => a + b, 0) / cvResults.metrics.mape.length * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-center flex flex-col items-center justify-center h-[140px]">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Average RMSE</div>
                            <div className="text-3xl font-bold text-cyan-400">
                                {(cvResults.metrics.rmse.reduce((a, b) => a + b, 0) / cvResults.metrics.rmse.length).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

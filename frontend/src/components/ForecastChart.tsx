import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    ComposedChart,
    ReferenceLine,
    Legend,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResultsStore } from '@/stores/resultsStore';
import type { DataPoint } from '@/types';

interface ForecastChartProps {
    historicalData?: DataPoint[];
}

export function ForecastChart({ historicalData = [] }: ForecastChartProps) {
    const { forecast } = useResultsStore();

    const chartData = useMemo(() => {
        if (!forecast) return [];

        const historical = new Map(
            historicalData.map((d) => [d.ds.split(' ')[0], d.y])
        );

        return forecast.forecast.map((point) => ({
            ds: point.ds.split(' ')[0],
            actual: historical.get(point.ds.split(' ')[0]) ?? null,
            yhat: point.yhat,
            yhat_lower: point.yhat_lower,
            yhat_upper: point.yhat_upper,
            trend: point.trend,
        }));
    }, [forecast, historicalData]);

    const componentData = useMemo(() => {
        if (!forecast?.components) return {};

        const result: Record<string, { ds: string; value: number }[]> = {};

        Object.entries(forecast.components).forEach(([name, data]) => {
            if (name !== 'trend') {
                result[name] = data.ds.map((ds, i) => ({
                    ds: ds.split(' ')[0],
                    value: data.values[i],
                }));
            }
        });

        return result;
    }, [forecast]);

    if (!forecast) return null;

    return (
        <Tabs defaultValue="forecast" className="space-y-6 h-full flex flex-col">
            <div className="flex justify-start">
                <TabsList className="bg-zinc-950 border border-zinc-800">
                    <TabsTrigger value="forecast" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 cursor-pointer">Forecast</TabsTrigger>
                    <TabsTrigger value="components" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 cursor-pointer">Components</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="forecast" className="flex-1 min-h-0 animate-in fade-in zoom-in-95 duration-300">
                <div className="h-full w-full min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis
                                dataKey="ds"
                                stroke="#71717a"
                                tick={{ fill: '#71717a', fontSize: 12 }}
                                tickFormatter={(v) => v.slice(5)}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                tick={{ fill: '#71717a', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b', // Zinc-900
                                    border: '1px solid #27272a',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                                labelStyle={{ color: '#a1a1aa' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {/* Uncertainty band */}
                            <Area
                                type="monotone"
                                dataKey="yhat_upper"
                                stroke="transparent"
                                fill="url(#uncertaintyGradient)"
                                name="Confidence Interval"
                            />
                            <Area
                                type="monotone"
                                dataKey="yhat_lower"
                                stroke="transparent"
                                fill="#18181b" // Match chart background to "cut out" the bottom
                                name="Lower Bound"
                                legendType="none"
                            />

                            {/* Changepoints */}
                            {forecast.changepoints.map((cp, i) => (
                                <ReferenceLine
                                    key={i}
                                    x={cp}
                                    stroke="#f97316"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.5}
                                />
                            ))}

                            {/* Actual data points */}
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#52525b" // Zinc-600
                                strokeWidth={1.5}
                                dot={{ fill: '#52525b', r: 1.5 }}
                                name="Historical"
                                connectNulls={false}
                            />

                            {/* Forecast line */}
                            <Line
                                type="monotone"
                                dataKey="yhat"
                                stroke="#a855f7" // Purple-500
                                strokeWidth={2.5}
                                dot={false}
                                name="Forecast"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </TabsContent>

            <TabsContent value="components" className="flex-1 min-h-0 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto">
                    {Object.entries(componentData).map(([name, data]) => (
                        <div key={name} className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800 h-[250px]">
                            <h4 className="text-sm font-medium text-zinc-400 mb-2 capitalize">
                                {name}
                            </h4>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis
                                            dataKey="ds"
                                            stroke="#52525b"
                                            tick={{ fill: '#52525b', fontSize: 10 }}
                                            tickFormatter={(v) => v.slice(5)}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#52525b"
                                            tick={{ fill: '#52525b', fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#18181b',
                                                border: '1px solid #27272a',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                color: '#fff'
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#06b6d4" // Cyan-500
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            </TabsContent>
        </Tabs>
    );
}

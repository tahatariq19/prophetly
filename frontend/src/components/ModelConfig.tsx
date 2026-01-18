import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useConfigStore } from '@/stores/configStore';
import { useDataStore } from '@/stores/dataStore';

const COUNTRIES = [
    { code: 'none', name: 'None' },
    { code: 'US', name: 'United States' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'BR', name: 'Brazil' },
    { code: 'RU', name: 'Russia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'TR', name: 'Turkey' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'MX', name: 'Mexico' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'KR', name: 'South Korea' },
];

export function ModelConfig() {
    const { config, periods, freq, setConfig, setPeriods, setFreq, addHoliday, removeHoliday } = useConfigStore();
    const { capColumn } = useDataStore();

    // Local state for new holiday input
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');

    const handleAddHoliday = () => {
        if (newHolidayName && newHolidayDate) {
            addHoliday({
                holiday: newHolidayName,
                ds: newHolidayDate,
                lower_window: 0,
                upper_window: 0,
            });
            setNewHolidayName('');
            setNewHolidayDate('');
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-zinc-300">Forecast Horizon</Label>
                    <div className="relative">
                        <Input
                            type="number"
                            value={periods}
                            onChange={(e) => setPeriods(parseInt(e.target.value) || 30)}
                            min={1}
                            max={3650}
                            className="bg-zinc-950 border-zinc-800 text-white focus:border-purple-500 transition-colors pr-16"
                        />
                        <span className="absolute right-3 top-2.5 text-zinc-500 text-sm pointer-events-none">periods</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <Label className="text-zinc-300">Frequency</Label>
                    <Select value={freq} onValueChange={setFreq}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white hover:border-zinc-700 cursor-pointer">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectItem value="D" className="cursor-pointer focus:bg-zinc-800">Daily</SelectItem>
                            <SelectItem value="W" className="cursor-pointer focus:bg-zinc-800">Weekly</SelectItem>
                            <SelectItem value="M" className="cursor-pointer focus:bg-zinc-800">Monthly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Accordion type="single" collapsible className="w-full border border-zinc-800/50 rounded-lg bg-zinc-950/30">
                <AccordionItem value="advanced" className="border-0 px-4">
                    <AccordionTrigger className="text-sm font-medium text-zinc-400 hover:text-white hover:no-underline py-4 cursor-pointer">
                        Advanced Configuration
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Seasonality */}
                            <div className="space-y-5">
                                <h4 className="font-medium text-white border-b border-zinc-800 pb-2 text-sm uppercase tracking-wider">Seasonality</h4>

                                <div className="space-y-3">
                                    <Label className="text-zinc-400">Mode</Label>
                                    <Select
                                        value={config.seasonality_mode}
                                        onValueChange={(v) =>
                                            setConfig({ seasonality_mode: v as 'additive' | 'multiplicative' })
                                        }
                                    >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white cursor-pointer">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                            <SelectItem value="additive" className="cursor-pointer focus:bg-zinc-800">Additive</SelectItem>
                                            <SelectItem value="multiplicative" className="cursor-pointer focus:bg-zinc-800">Multiplicative</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-400">Yearly Seasonality</Label>
                                    <Switch
                                        checked={config.yearly_seasonality !== false}
                                        onCheckedChange={(v) =>
                                            setConfig({ yearly_seasonality: v ? 'auto' : false })
                                        }
                                        className="data-[state=checked]:bg-purple-600 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-400">Weekly Seasonality</Label>
                                    <Switch
                                        checked={config.weekly_seasonality !== false}
                                        onCheckedChange={(v) =>
                                            setConfig({ weekly_seasonality: v ? 'auto' : false })
                                        }
                                        className="data-[state=checked]:bg-purple-600 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Trend & Growth */}
                            <div className="space-y-5">
                                <h4 className="font-medium text-white border-b border-zinc-800 pb-2 text-sm uppercase tracking-wider">Trend & Growth</h4>

                                <div className="space-y-3">
                                    <Label className="text-zinc-400">Growth Model</Label>
                                    <Select
                                        value={config.growth}
                                        onValueChange={(v) => setConfig({ growth: v as 'linear' | 'logistic' | 'flat' })}
                                    >
                                        <SelectTrigger className={`bg-zinc-900 border-zinc-800 text-white cursor-pointer ${!capColumn && config.growth !== 'logistic' ? '' : ''}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                            <SelectItem value="linear" className="cursor-pointer focus:bg-zinc-800">Linear</SelectItem>
                                            <SelectItem
                                                value="logistic"
                                                disabled={!capColumn}
                                                className="cursor-pointer focus:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Logistic {(!capColumn) && '(Requires Cap Column)'}
                                            </SelectItem>
                                            <SelectItem value="flat" className="cursor-pointer focus:bg-zinc-800">Flat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {!capColumn && config.growth === 'logistic' && (
                                        <p className="text-xs text-red-400">Warning: Logistic growth requires a 'cap' column in your data.</p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <Label className="text-zinc-400">Flexibility</Label>
                                        <span className="text-xs text-zinc-500 font-mono">{config.changepoint_prior_scale.toFixed(3)}</span>
                                    </div>
                                    <Slider
                                        value={[Math.log10(config.changepoint_prior_scale)]}
                                        onValueChange={([v]) => setConfig({ changepoint_prior_scale: Math.pow(10, v) })}
                                        min={-3}
                                        max={0}
                                        step={0.1}
                                        className="py-2 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-zinc-600">
                                        <span>Rigid</span>
                                        <span>Flexible</span>
                                    </div>
                                </div>
                            </div>

                            {/* Uncertainty */}
                            <div className="space-y-5">
                                <h4 className="font-medium text-white border-b border-zinc-800 pb-2 text-sm uppercase tracking-wider">Uncertainty</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <Label className="text-zinc-400">Interval Width</Label>
                                        <span className="text-xs text-zinc-500 font-mono">{Math.round(config.interval_width * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[config.interval_width]}
                                        onValueChange={([v]) => setConfig({ interval_width: v })}
                                        min={0.5}
                                        max={0.99}
                                        step={0.01}
                                        className="py-2 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Holidays - Updated */}
                            <div className="space-y-5">
                                <h4 className="font-medium text-white border-b border-zinc-800 pb-2 text-sm uppercase tracking-wider">Holidays</h4>
                                <div className="space-y-3">
                                    <Label className="text-zinc-400">Country Holidays</Label>
                                    <Select
                                        value={config.country_holidays || 'none'}
                                        onValueChange={(v) =>
                                            setConfig({ country_holidays: v === 'none' ? undefined : v })
                                        }
                                    >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white cursor-pointer">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[200px]">
                                            {COUNTRIES.map((c) => (
                                                <SelectItem key={c.code} value={c.code} className="cursor-pointer focus:bg-zinc-800">
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Custom Holidays UI */}
                                <div className="space-y-3">
                                    <Label className="text-zinc-400">Custom Holidays</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Name (e.g. My Event)"
                                            value={newHolidayName}
                                            onChange={(e) => setNewHolidayName(e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 text-white h-9 flex-1"
                                        />
                                        <Input
                                            type="date"
                                            value={newHolidayDate}
                                            onChange={(e) => setNewHolidayDate(e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 text-white h-9 w-[130px]"
                                        />
                                        <Button size="icon" onClick={handleAddHoliday} className="h-9 w-9 bg-zinc-800 hover:bg-zinc-700 cursor-pointer">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {config.holidays && config.holidays.length > 0 && (
                                        <div className="space-y-2 mt-2">
                                            {config.holidays.map((h, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-800/50 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="w-3 h-3 text-purple-400" />
                                                        <span className="text-zinc-300">{h.holiday}</span>
                                                        <span className="text-zinc-500 text-xs">({h.ds})</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeHoliday(i)}
                                                        className="h-6 w-6 text-zinc-500 hover:text-red-400 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

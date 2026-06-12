import { useCallback, useState, useEffect } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDataStore } from '@/stores/dataStore';
import type { DataPoint } from '@/types';

export function DataUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [rawCsvData, setRawCsvData] = useState<Record<string, string>[]>([]);

    const {
        fileName,
        availableColumns,
        dsColumn,
        yColumn,
        capColumn,
        floorColumn,
        setRawData,
        setAvailableColumns,
        setDsColumn,
        setYColumn,
        setCapColumn,
        setFloorColumn,
        clearData,
    } = useDataStore();

    const handleFile = useCallback(
        (file: File) => {
            if (!file.name.endsWith('.csv')) {
                setParseError('Please upload a CSV file');
                return;
            }

            import('papaparse').then((Papa) => {
                Papa.default.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const data = results.data as Record<string, string>[];
                        if (data.length === 0) {
                            setParseError('No data rows found');
                            return;
                        }
                        if (data.length > 50000) {
                            setParseError('Maximum 50,000 rows allowed');
                            return;
                        }

                        setRawCsvData(data);
                        
                        // Extract columns from first row (PapaParse returns keys)
                        const cols = Object.keys(data[0]);
                        setAvailableColumns(cols);
                        setParseError(null);

                        const lowerCols = cols.map(c => c.toLowerCase());
                        const dsIdx = lowerCols.findIndex((c) => c === 'ds' || c === 'date' || c === 'datetime');
                        const yIdx = lowerCols.findIndex((c) => c === 'y' || c === 'value' || c === 'values');

                        if (dsIdx >= 0) setDsColumn(cols[dsIdx]);
                        if (yIdx >= 0) setYColumn(cols[yIdx]);

                        setRawData([], file.name);
                    },
                    error: (err) => {
                        setParseError(err.message || 'Failed to parse CSV');
                    }
                });
            });
        },
        [setAvailableColumns, setDsColumn, setYColumn, setRawData]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const buildFinalData = useCallback(() => {
        if (!dsColumn || !yColumn || rawCsvData.length === 0) return;

        const data: DataPoint[] = rawCsvData.map((row) => ({
            ds: row[dsColumn],
            y: parseFloat(row[yColumn]) || 0,
            cap: capColumn ? parseFloat(row[capColumn]) || undefined : undefined,
            floor: floorColumn ? parseFloat(row[floorColumn]) || undefined : undefined,
        }));

        setRawData(data, fileName || 'data.csv');
    }, [dsColumn, yColumn, capColumn, floorColumn, rawCsvData, fileName, setRawData]);

    useEffect(() => {
        if (dsColumn && yColumn && rawCsvData.length > 0) {
            buildFinalData();
        }
    }, [dsColumn, yColumn, rawCsvData.length, buildFinalData]);

    if (fileName && availableColumns.length > 0) {
        // Dark Mode Config View
        return (
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                            <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-white">{fileName}</h3>
                            <p className="text-sm text-zinc-400">{rawCsvData.length.toLocaleString()} rows • {availableColumns.length} columns</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearData}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Remove File
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-3">
                        <Label className="text-zinc-400">Date Column</Label>
                        <Select value={dsColumn || ''} onValueChange={setDsColumn}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white cursor-pointer hover:border-zinc-700">
                                <SelectValue placeholder="Select date column" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                {availableColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="cursor-pointer focus:bg-zinc-800">{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-zinc-400">Value Column</Label>
                        <Select value={yColumn || ''} onValueChange={setYColumn}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white cursor-pointer hover:border-zinc-700">
                                <SelectValue placeholder="Select value column" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                {availableColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="cursor-pointer focus:bg-zinc-800">{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-zinc-500 text-sm">Cap (Optional)</Label>
                        <Select value={capColumn || 'none'} onValueChange={(v) => setCapColumn(v === 'none' ? null : v)}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-400 cursor-pointer hover:border-zinc-700">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="none" className="cursor-pointer focus:bg-zinc-800">None</SelectItem>
                                {availableColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="cursor-pointer focus:bg-zinc-800">{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-zinc-500 text-sm">Floor (Optional)</Label>
                        <Select value={floorColumn || 'none'} onValueChange={(v) => setFloorColumn(v === 'none' ? null : v)}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-400 cursor-pointer hover:border-zinc-700">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="none" className="cursor-pointer focus:bg-zinc-800">None</SelectItem>
                                {availableColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="cursor-pointer focus:bg-zinc-800">{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative p-16 text-center transition-all cursor-pointer rounded-2xl border-2 border-dashed
              focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-950
              ${isDragging
                    ? 'bg-purple-500/10 border-purple-500 scale-105'
                    : 'bg-zinc-900/0 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                }
            `}
        >
            <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="sr-only"
                id="csv-upload"
                aria-invalid={!!parseError}
                aria-describedby={parseError ? "upload-error" : undefined}
            />
            <label htmlFor="csv-upload" className="cursor-pointer block w-full h-full">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 border border-zinc-800">
                    <Upload className="w-10 h-10 text-zinc-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                    Drop your CSV here
                </h3>
                <p className="text-zinc-500">
                    or click to browse
                </p>
            </label>

            {parseError && (
                <p
                    id="upload-error"
                    role="alert"
                    className="mt-6 text-sm text-red-400 bg-red-400/10 inline-block px-4 py-2 rounded-full border border-red-400/20"
                >
                    {parseError}
                </p>
            )}
        </div>
    );
}

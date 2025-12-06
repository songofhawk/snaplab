import React from 'react';
import { Check } from 'lucide-react';
import { ResizeDimensions } from '../../../types/editor';

interface ResizeOptionsProps {
    dimensions: ResizeDimensions;
    maintainAspect: boolean;
    onDimensionChange: (dim: 'width' | 'height', value: number) => void;
    onMaintainAspectChange: (maintain: boolean) => void;
    onSetPercent: (percent: number) => void;
    onApply: () => void;
}

export const ResizeOptions: React.FC<ResizeOptionsProps> = ({
    dimensions,
    maintainAspect,
    onDimensionChange,
    onMaintainAspectChange,
    onSetPercent,
    onApply
}) => {
    return (
        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Width</label>
                <input
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => onDimensionChange('width', parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white w-20 text-xs"
                />
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Height</label>
                <input
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => onDimensionChange('height', parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white w-20 text-xs"
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={maintainAspect}
                    onChange={(e) => onMaintainAspectChange(e.target.checked)}
                    id="aspect"
                />
                <label htmlFor="aspect" className="text-xs text-slate-300">Lock Ratio</label>
            </div>
            <div className="h-4 w-px bg-slate-700 mx-2"></div>
            <div className="flex gap-1">
                {[25, 50, 75, 100].map(pct => (
                    <button
                        key={pct}
                        onClick={() => onSetPercent(pct)}
                        className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                        {pct}%
                    </button>
                ))}
            </div>
            <div className="h-4 w-px bg-slate-700 mx-2"></div>
            <button
                onClick={onApply}
                className="px-3 py-1 bg-cyan-600 rounded text-white hover:bg-cyan-500 text-xs flex items-center gap-1"
            >
                <Check className="w-3 h-3" /> Apply
            </button>
        </div>
    );
};


import React from 'react';
import { Check } from 'lucide-react';

interface AnnotateOptionsProps {
    color: string;
    lineWidth: number;
    onColorChange: (color: string) => void;
    onLineWidthChange: (width: number) => void;
    onApply: () => void;
}

export const AnnotateOptions: React.FC<AnnotateOptionsProps> = ({
    color,
    lineWidth,
    onColorChange,
    onLineWidthChange,
    onApply
}) => {
    return (
        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
            <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
            />
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Size:</span>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={lineWidth}
                    onChange={(e) => onLineWidthChange(parseInt(e.target.value))}
                    className="w-24"
                />
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


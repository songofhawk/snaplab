import React from 'react';
import { Check, Plus, Minus } from 'lucide-react';

interface TextOptionsProps {
    color: string;
    fontSize: number;
    onColorChange: (color: string) => void;
    onFontSizeChange: (size: number) => void;
    onApply: () => void;
}

export const TextOptions: React.FC<TextOptionsProps> = ({
    color,
    fontSize,
    onColorChange,
    onFontSizeChange,
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
                <span className="text-xs text-slate-400">Font Size:</span>
                <button
                    onClick={() => onFontSizeChange(Math.max(12, fontSize - 4))}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Decrease font size"
                >
                    <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm text-white w-8 text-center">{fontSize}</span>
                <button
                    onClick={() => onFontSizeChange(Math.min(200, fontSize + 4))}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Increase font size"
                >
                    <Plus className="w-3 h-3" />
                </button>
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



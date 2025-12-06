import React from 'react';
import { Check, Wand2, Sparkles } from 'lucide-react';
import { BgToolType } from '../../../types/editor';

interface BackgroundOptionsProps {
    bgTool: BgToolType;
    tolerance: number;
    onBgToolChange: (tool: BgToolType) => void;
    onToleranceChange: (tolerance: number) => void;
    onAutoRemove: () => void;
    onApply: () => void;
}

export const BackgroundOptions: React.FC<BackgroundOptionsProps> = ({
    bgTool,
    tolerance,
    onBgToolChange,
    onToleranceChange,
    onAutoRemove,
    onApply
}) => {
    return (
        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
            <button
                onClick={onAutoRemove}
                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-500 hover:to-pink-500 text-xs"
            >
                <Sparkles className="w-3 h-3" />
                Auto AI
            </button>

            <div className="h-4 w-px bg-slate-700"></div>

            <button
                onClick={() => onBgToolChange(bgTool === 'magic' ? null : 'magic')}
                className={`flex items-center gap-2 px-3 py-1 rounded transition-colors text-xs ${bgTool === 'magic'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
                <Wand2 className="w-3 h-3" />
                Magic Wand
            </button>

            {bgTool === 'magic' && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-xs text-slate-400">Tol:</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={tolerance}
                        onChange={(e) => onToleranceChange(parseInt(e.target.value))}
                        className="w-20"
                        title={`Tolerance: ${tolerance}`}
                    />
                    <button
                        onClick={onApply}
                        className="px-3 py-1 bg-cyan-600 rounded text-white hover:bg-cyan-500 text-xs flex items-center gap-1 ml-2"
                    >
                        <Check className="w-3 h-3" /> Apply
                    </button>
                </div>
            )}
        </div>
    );
};



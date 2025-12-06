import React from 'react';
import { Check } from 'lucide-react';
import { PixelEditMode } from '../../../types/editor';

interface PixelEditOptionsProps {
    pixelMode: PixelEditMode;
    brushSize: number;
    onModeChange: (mode: PixelEditMode) => void;
    onBrushSizeChange: (size: number) => void;
    onApply: () => void;
}

export const PixelEditOptions: React.FC<PixelEditOptionsProps> = ({
    pixelMode,
    brushSize,
    onModeChange,
    onBrushSizeChange,
    onApply
}) => {
    return (
        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex bg-slate-800 rounded p-0.5 gap-1">
                <button
                    onClick={() => onModeChange('ERASE')}
                    className={`px-3 py-1 text-xs rounded ${pixelMode === 'ERASE'
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Erase
                </button>
                <button
                    onClick={() => onModeChange('RESTORE')}
                    className={`px-3 py-1 text-xs rounded ${pixelMode === 'RESTORE'
                        ? 'bg-green-500/20 text-green-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Restore
                </button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Size:</span>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
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


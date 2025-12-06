import React from 'react';
import { Check } from 'lucide-react';

interface CropOptionsProps {
    onSetAspect: (aspect: number | undefined) => void;
    onApply: () => void;
}

export const CropOptions: React.FC<CropOptionsProps> = ({
    onSetAspect,
    onApply
}) => {
    return (
        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
            <span className="text-xs text-slate-300">Drag to crop</span>
            <div className="h-4 w-px bg-slate-700"></div>
            <div className="flex gap-1">
                <button
                    onClick={() => onSetAspect(undefined)}
                    className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                    Free
                </button>
                <button
                    onClick={() => onSetAspect(1)}
                    className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                    1:1
                </button>
                <button
                    onClick={() => onSetAspect(4 / 3)}
                    className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                    4:3
                </button>
                <button
                    onClick={() => onSetAspect(16 / 9)}
                    className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                    16:9
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



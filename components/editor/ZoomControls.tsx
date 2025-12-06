import React from 'react';
import { ZoomIn, ZoomOut, Scan } from 'lucide-react';

interface ZoomControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    zoom,
    onZoomIn,
    onZoomOut,
    onResetView
}) => {
    return (
        <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 bg-slate-800/80 backdrop-blur p-2 rounded-lg border border-slate-700">
            <button
                onClick={onZoomIn}
                className="p-2 hover:bg-slate-700 rounded text-slate-300"
                title="Zoom In"
            >
                <ZoomIn className="w-5 h-5" />
            </button>
            <span className="text-xs text-center text-slate-400">
                {Math.round(zoom * 100)}%
            </span>
            <button
                onClick={onZoomOut}
                className="p-2 hover:bg-slate-700 rounded text-slate-300"
                title="Zoom Out"
            >
                <ZoomOut className="w-5 h-5" />
            </button>
            <button
                onClick={onResetView}
                className="p-2 hover:bg-slate-700 rounded text-slate-300 border-t border-slate-700 mt-1"
                title="Reset View"
            >
                <Scan className="w-4 h-4" />
            </button>
        </div>
    );
};


import React from 'react';
import {
    Crop as CropIcon,
    Scan,
    Pen,
    Type,
    Download,
    Copy,
    RotateCw,
    FlipHorizontal,
    Undo2,
    Target,
    Eraser,
    ImageOff,
    Grid,
    ImagePlus
} from 'lucide-react';
import { EditMode } from '../../types/editor';

interface EditorToolbarProps {
    mode: EditMode;
    setMode: (mode: EditMode) => void;
    currentStep: number;
    isLoading: boolean;
    canvasModified: boolean;
    onUndo: () => void;
    onRotate: () => void;
    onFlipHorizontal: () => void;
    onChangeImage?: () => void;
    onCopy: () => void;
    onDownload: () => void;
    onSplit: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    mode,
    setMode,
    currentStep,
    isLoading,
    canvasModified,
    onUndo,
    onRotate,
    onFlipHorizontal,
    onChangeImage,
    onCopy,
    onDownload,
    onSplit
}) => {
    const toggleMode = (newMode: EditMode) => {
        setMode(mode === newMode ? null : newMode);
    };

    const toolButtonClass = (targetMode: EditMode) =>
        `p-2 rounded-lg transition-colors ${mode === targetMode
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`;

    return (
        <div className="flex flex-col h-full w-full items-center py-4 gap-4 overflow-y-auto custom-scrollbar">
            {/* Logo/Home or Change Image */}
            {onChangeImage && (
                <button
                    onClick={onChangeImage}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Change Image"
                >
                    <ImagePlus className="w-5 h-5" />
                </button>
            )}

            <div className="w-8 h-px bg-slate-700"></div>

            <div className="flex flex-col gap-2 w-full items-center">
                {/* Basic Tools */}
                <button
                    onClick={() => toggleMode('CROP')}
                    className={toolButtonClass('CROP')}
                    title="Crop"
                >
                    <CropIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => toggleMode('RESIZE')}
                    className={toolButtonClass('RESIZE')}
                    title="Resize"
                >
                    <Scan className="w-5 h-5" />
                </button>
            </div>

            <div className="w-8 h-px bg-slate-700"></div>

            <div className="flex flex-col gap-2 w-full items-center">
                {/* Transform */}
                <button
                    onClick={onRotate}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Rotate 90°"
                >
                    <RotateCw className="w-5 h-5" />
                </button>
                <button
                    onClick={onFlipHorizontal}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Flip Horizontal"
                >
                    <FlipHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="w-8 h-px bg-slate-700"></div>

            <div className="flex flex-col gap-2 w-full items-center">
                {/* Drawing / Erasing */}
                <button
                    onClick={() => toggleMode('ANNOTATE')}
                    className={toolButtonClass('ANNOTATE')}
                    title="Draw"
                >
                    <Pen className="w-5 h-5" />
                </button>
                <button
                    onClick={() => toggleMode('TEXT')}
                    className={toolButtonClass('TEXT')}
                    title="Add Text"
                >
                    <Type className="w-5 h-5" />
                </button>
                <button
                    onClick={() => toggleMode('PIXEL_EDIT')}
                    className={toolButtonClass('PIXEL_EDIT')}
                    title="Pixel Eraser"
                >
                    <Eraser className="w-5 h-5" />
                </button>
                <button
                    onClick={() => toggleMode('BACKGROUND')}
                    className={toolButtonClass('BACKGROUND')}
                    title="Background Removal"
                >
                    <ImageOff className="w-5 h-5" />
                </button>
                <button
                    onClick={() => toggleMode('SEGMENT')}
                    className={toolButtonClass('SEGMENT')}
                    title="Segment Anything"
                >
                    <Target className="w-5 h-5" />
                </button>
            </div>

            <div className="w-8 h-px bg-slate-700"></div>

            <div className="flex flex-col gap-2 w-full items-center">
                {/* Actions */}
                <button
                    onClick={onSplit}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Split"
                >
                    <Grid className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1"></div> {/* Spacer to push bottom items down */}

            <div className="flex flex-col gap-2 w-full items-center pb-4">
                <button
                    onClick={onUndo}
                    disabled={(currentStep === 0 && !canvasModified) || isLoading}
                    className={`p-2 rounded-lg transition-colors flex items-center justify-center ${(currentStep === 0 && !canvasModified)
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    title="Undo"
                >
                    <Undo2 className="w-5 h-5" />
                </button>
                <button
                    onClick={onCopy}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isLoading
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    title="Copy to Clipboard"
                >
                    <Copy className="w-5 h-5" />
                </button>
                <button
                    onClick={onDownload}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isLoading
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    title="Download"
                >
                    <Download className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


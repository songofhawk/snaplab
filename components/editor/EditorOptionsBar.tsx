import React from 'react';
import { X } from 'lucide-react';
import { EditMode, BgToolType, PixelEditMode, SamModelType, ResizeDimensions } from '../../types/editor';
import { CropOptions } from './tools/CropOptions';
import { ResizeOptions } from './tools/ResizeOptions';
import { AnnotateOptions } from './tools/AnnotateOptions';
import { TextOptions } from './tools/TextOptions';
import { PixelEditOptions } from './tools/PixelEditOptions';
import { BackgroundOptions } from './tools/BackgroundOptions';
import { SegmentOptions } from './tools/SegmentOptions';

interface EditorOptionsBarProps {
    mode: EditMode;
    onCancel: () => void;

    // Crop
    onSetCropAspect: (aspect: number | undefined) => void;
    onApplyCrop: () => void;

    // Resize
    resizeDims: ResizeDimensions;
    maintainAspect: boolean;
    onResizeDimensionChange: (dim: 'width' | 'height', value: number) => void;
    onMaintainAspectChange: (maintain: boolean) => void;
    onSetResizePercent: (percent: number) => void;
    onApplyResize: () => void;

    // Annotate
    annotateColor: string;
    annotateLineWidth: number;
    onAnnotateColorChange: (color: string) => void;
    onAnnotateLineWidthChange: (width: number) => void;
    onApplyAnnotation: () => void;

    // Text
    textColor: string;
    textFontSize: number;
    onTextColorChange: (color: string) => void;
    onTextFontSizeChange: (size: number) => void;
    onApplyText: () => void;

    // Pixel Edit
    pixelMode: PixelEditMode;
    pixelBrushSize: number;
    onPixelModeChange: (mode: PixelEditMode) => void;
    onPixelBrushSizeChange: (size: number) => void;

    // Background
    bgTool: BgToolType;
    tolerance: number;
    onBgToolChange: (tool: BgToolType) => void;
    onToleranceChange: (tolerance: number) => void;
    onAutoRemoveBg: () => void;
    onApplyBackground: () => void;

    // Segment
    samModel: SamModelType;
    samPointsCount: number;
    hasSamMask: boolean;
    isLoading: boolean;
    isGeneratingMask: boolean;
    onSamModelChange: (model: SamModelType) => void;
    onGenerateMask: () => void;
    onApplySamMask: () => void;
}

export const EditorOptionsBar: React.FC<EditorOptionsBarProps> = ({
    mode,
    onCancel,
    // Crop
    onSetCropAspect,
    onApplyCrop,
    // Resize
    resizeDims,
    maintainAspect,
    onResizeDimensionChange,
    onMaintainAspectChange,
    onSetResizePercent,
    onApplyResize,
    // Annotate
    annotateColor,
    annotateLineWidth,
    onAnnotateColorChange,
    onAnnotateLineWidthChange,
    onApplyAnnotation,
    // Text
    textColor,
    textFontSize,
    onTextColorChange,
    onTextFontSizeChange,
    onApplyText,
    // Pixel Edit
    pixelMode,
    pixelBrushSize,
    onPixelModeChange,
    onPixelBrushSizeChange,
    // Background
    bgTool,
    tolerance,
    onBgToolChange,
    onToleranceChange,
    onAutoRemoveBg,
    onApplyBackground,
    // Segment
    samModel,
    samPointsCount,
    hasSamMask,
    isLoading,
    isGeneratingMask,
    onSamModelChange,
    onGenerateMask,
    onApplySamMask
}) => {
    return (
        <div className="flex items-center gap-2 h-full w-full px-4 overflow-x-auto custom-scrollbar">
            {/* Cancel button on the left when mode is active */}
            {mode && (
                <button
                    onClick={onCancel}
                    className="flex-none flex items-center gap-1 px-2 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors border-r border-slate-700 pr-3 mr-1"
                    title="Cancel (Esc)"
                >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                </button>
            )}

            {/* Options content centered */}
            <div className="flex-1 flex items-center justify-start min-w-0">
                {mode === 'CROP' && (
                    <CropOptions
                        onSetAspect={onSetCropAspect}
                        onApply={onApplyCrop}
                    />
                )}

                {mode === 'RESIZE' && (
                    <ResizeOptions
                        dimensions={resizeDims}
                        maintainAspect={maintainAspect}
                        onDimensionChange={onResizeDimensionChange}
                        onMaintainAspectChange={onMaintainAspectChange}
                        onSetPercent={onSetResizePercent}
                        onApply={onApplyResize}
                    />
                )}

                {mode === 'ANNOTATE' && (
                    <AnnotateOptions
                        color={annotateColor}
                        lineWidth={annotateLineWidth}
                        onColorChange={onAnnotateColorChange}
                        onLineWidthChange={onAnnotateLineWidthChange}
                        onApply={onApplyAnnotation}
                    />
                )}

                {mode === 'TEXT' && (
                    <TextOptions
                        color={textColor}
                        fontSize={textFontSize}
                        onColorChange={onTextColorChange}
                        onFontSizeChange={onTextFontSizeChange}
                        onApply={onApplyText}
                    />
                )}

                {mode === 'PIXEL_EDIT' && (
                    <PixelEditOptions
                        pixelMode={pixelMode}
                        brushSize={pixelBrushSize}
                        onModeChange={onPixelModeChange}
                        onBrushSizeChange={onPixelBrushSizeChange}
                        onApply={onApplyAnnotation}
                    />
                )}

                {mode === 'BACKGROUND' && (
                    <BackgroundOptions
                        bgTool={bgTool}
                        tolerance={tolerance}
                        onBgToolChange={onBgToolChange}
                        onToleranceChange={onToleranceChange}
                        onAutoRemove={onAutoRemoveBg}
                        onApply={onApplyBackground}
                    />
                )}

                {mode === 'SEGMENT' && (
                    <SegmentOptions
                        samModel={samModel}
                        pointsCount={samPointsCount}
                        hasMask={hasSamMask}
                        isLoading={isLoading}
                        isGeneratingMask={isGeneratingMask}
                        onModelChange={onSamModelChange}
                        onGenerateMask={onGenerateMask}
                        onApply={onApplySamMask}
                    />
                )}

                {!mode && (
                    <span className="text-xs text-slate-500">Select a tool from the sidebar</span>
                )}
            </div>

            <div className="w-4"></div>
        </div>
    );
};

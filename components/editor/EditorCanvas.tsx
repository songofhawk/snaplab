import React from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { EditMode, BgToolType, PanPosition } from '../../types/editor';

interface EditorCanvasProps {
    mode: EditMode;
    bgTool: BgToolType;
    currentSrc: string;
    zoom: number;
    pan: PanPosition;
    isPanning: boolean;

    // Refs
    imgRef: React.RefObject<HTMLImageElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;

    // Crop
    crop: Crop | undefined;
    onCropChange: (c: Crop) => void;
    onCropComplete: (c: PixelCrop) => void;

    // Image load callback
    onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;

    // Canvas events
    onCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onCanvasMouseUp: () => void;
    onCanvasMouseLeave: () => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    mode,
    bgTool,
    currentSrc,
    zoom,
    pan,
    isPanning,
    imgRef,
    canvasRef,
    crop,
    onCropChange,
    onCropComplete,
    onImageLoad,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    onCanvasMouseLeave
}) => {
    const isCanvasMode = mode === 'ANNOTATE' ||
        mode === 'PIXEL_EDIT' ||
        mode === 'SEGMENT' ||
        (mode === 'BACKGROUND' && bgTool !== null);

    return (
        <div
            className="transition-transform duration-75 ease-out"
            style={{
                // 裁剪模式下禁用 transform，避免 ReactCrop 坐标问题
                transform: mode === 'CROP'
                    ? 'none'
                    : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
            }}
        >
            {/* Image / Canvas Container - 保持原始坐标系 */}
            <div
                className="relative shadow-2xl"
                style={{
                    cursor: isPanning ? 'grabbing' : (mode === 'PIXEL_EDIT' ? 'crosshair' : 'default'),
                    backgroundImage: `
                        linear-gradient(45deg, #808080 25%, transparent 25%),
                        linear-gradient(-45deg, #808080 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #808080 75%),
                        linear-gradient(-45deg, transparent 75%, #808080 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    backgroundColor: '#a0a0a0'
                }}
            >
                {mode === 'CROP' ? (
                    <ReactCrop
                        crop={crop}
                        onChange={onCropChange}
                        onComplete={onCropComplete}
                    >
                        <img
                            ref={imgRef}
                            src={currentSrc}
                            onLoad={onImageLoad}
                            alt="Edit"
                            className="max-h-none max-w-none"
                        />
                    </ReactCrop>
                ) : (
                    <>
                        {/* Show Image if NOT in a drawing mode */}
                        <img
                            ref={imgRef}
                            src={currentSrc}
                            onLoad={onImageLoad}
                            alt="Edit"
                            className={`max-h-none max-w-none ${isCanvasMode
                                ? 'pointer-events-none opacity-0 absolute'
                                : ''
                            }`}
                        />
                        {/* Show Canvas if IN a drawing mode */}
                        <canvas
                            ref={canvasRef}
                            onMouseDown={onCanvasMouseDown}
                            onMouseMove={onCanvasMouseMove}
                            onMouseUp={onCanvasMouseUp}
                            onMouseLeave={onCanvasMouseLeave}
                            className={`max-h-none max-w-none ${isCanvasMode ? '' : 'hidden'}`}
                        />
                    </>
                )}
            </div>
        </div>
    );
};


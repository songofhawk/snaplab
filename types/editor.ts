// 编辑器模式
export type EditMode = 'CROP' | 'RESIZE' | 'ANNOTATE' | 'BACKGROUND' | 'SEGMENT' | 'PIXEL_EDIT' | null;

// 背景工具类型
export type BgToolType = 'magic' | null;

// 像素编辑模式
export type PixelEditMode = 'ERASE' | 'RESTORE';

// SAM 模型类型
export type SamModelType = 'FAST' | 'HIGH_QUALITY';

// SAM 点
export interface SamPoint {
    x: number;
    y: number;
    label: number; // 1 = positive, 0 = negative
}

// SAM Mask
export interface SamMaskData {
    data: Float32Array | any;
    width: number;
    height: number;
}

// 缩放尺寸
export interface ResizeDimensions {
    width: number;
    height: number;
}

// 平移位置
export interface PanPosition {
    x: number;
    y: number;
}

// 编辑器上下文（用于共享状态）
export interface EditorContextValue {
    // 当前图片源
    currentSrc: string;

    // 历史管理
    history: string[];
    currentStep: number;
    pushToHistory: (newSrc: string) => void;
    handleUndo: () => void;
    canUndo: boolean;

    // 模式
    mode: EditMode;
    setMode: (mode: EditMode) => void;

    // Loading 状态
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    loadingText: string | null;
    setLoadingText: (text: string | null) => void;

    // 缩放平移
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    pan: PanPosition;
    setPan: React.Dispatch<React.SetStateAction<PanPosition>>;

    // Refs
    imgRef: React.RefObject<HTMLImageElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    containerRef: React.RefObject<HTMLDivElement>;

    // 坐标转换
    getCanvasCoordinates: (clientX: number, clientY: number, element: HTMLElement) => { x: number; y: number };

    // 回调
    onSave: (newSrc: string) => void;
    onSplit: (newSrc: string) => void;
    onCancel: () => void;
}

// 工具 Props 基础类型
export interface BaseToolProps {
    imgRef: React.RefObject<HTMLImageElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    currentSrc: string;
    pushToHistory: (newSrc: string) => void;
    setMode: (mode: EditMode) => void;
    setIsLoading: (loading: boolean) => void;
    setLoadingText: (text: string | null) => void;
    getCanvasCoordinates: (clientX: number, clientY: number, element: HTMLElement) => { x: number; y: number };
    zoom: number;
    pan: PanPosition;
}


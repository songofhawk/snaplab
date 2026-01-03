import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Types
import {
    EditMode,
    ResizeDimensions
} from '../types/editor';

// Hooks
import { useImageHistory } from '../hooks/useImageHistory';
import { useZoomPan } from '../hooks/useZoomPan';
import { useCanvasCoordinates } from '../hooks/useCanvasCoordinates';

// Components
import { EditorToolbar } from './editor/EditorToolbar';
import { EditorOptionsBar } from './editor/EditorOptionsBar';
import { EditorCanvas } from './editor/EditorCanvas';
import { ZoomControls } from './editor/ZoomControls';

// Services


interface TextObject {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
    rotation: number; // 旋转角度（度）
    width?: number; // 文本宽度（用于缩放计算）
}

interface ImageEditorProps {
    imageSrc: string;
    onSave: (newSrc: string) => void;
    onSplit: (newSrc: string) => void;
    onCancel: () => void;
    onChangeImage?: () => void;
}

const ImageEditorComponent: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onSplit, onCancel, onChangeImage }) => {
    // --- Refs ---
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);


    // --- History Hook ---
    const {
        currentSrc,
        history,
        currentStep,
        pushToHistory,
        handleUndo,
        canUndo
    } = useImageHistory({ initialSrc: imageSrc });

    // --- Original Image Ref (for RESTORE functionality) ---
    const originalImgRef = useRef<HTMLImageElement | null>(null);

    // --- Mode State ---
    const [mode, setMode] = useState<EditMode>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState<string | null>(null);

    // --- Zoom & Pan Hook ---
    const {
        zoom,
        setZoom,
        pan,
        setPan,
        isPanning,
        handleMouseDownPan,
        handleMouseMovePan,
        handleMouseUpPan,
        zoomIn,
        zoomOut,
        resetView
    } = useZoomPan({
        containerRef,
        disabled: mode === 'CROP'
    });

    // --- Canvas Coordinates Hook ---
    const { getCanvasCoordinates } = useCanvasCoordinates({
        imgRef,
        zoom,
        pan
    });

    // --- Crop State ---
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

    // --- Resize State ---
    const [resizeDims, setResizeDims] = useState<ResizeDimensions>({ width: 0, height: 0 });
    const [maintainAspect, setMaintainAspect] = useState(true);

    // --- Annotate State ---
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ff0000');
    const [lineWidth, setLineWidth] = useState(4);



    // --- Pixel Edit State ---
    const [pixelBrushSize, setPixelBrushSize] = useState(10);
    const [isErasingPixel, setIsErasingPixel] = useState(false);
    const [pixelMode, setPixelMode] = useState<'ERASE' | 'RESTORE'>('ERASE');

    // --- Canvas Modified State (track unsaved changes) ---
    const [canvasModified, setCanvasModified] = useState(false);

    // --- Text State ---
    // Use ref as source of truth to avoid React StrictMode double-render issues
    const textObjectsRef = useRef<TextObject[]>([]);
    const [textObjects, setTextObjects] = useState<TextObject[]>([]);
    const [textColor, setTextColor] = useState('#ffffff');
    const [textFontSize, setTextFontSize] = useState(32);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [isEditingText, setIsEditingText] = useState(false);
    const [editingPosition, setEditingPosition] = useState<{ x: number; y: number; canvasX?: number; canvasY?: number } | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isResizingText, setIsResizingText] = useState(false);
    const textInputRef = useRef<HTMLInputElement>(null);

    // Note: We update state immediately when ref changes, so no sync effect needed


    // Update toolbar controls when text is selected
    useEffect(() => {
        if (selectedTextId) {
            const textObj = textObjectsRef.current.find(t => t.id === selectedTextId);
            if (textObj) {
                setTextColor(textObj.color);
                setTextFontSize(textObj.fontSize);
            }
        }
    }, [selectedTextId]);


    // ========================
    // 工具状态统一管理
    // ========================

    // 判断某个模式是否是 canvas 编辑模式（直接在 canvas 上操作）
    const isCanvasEditMode = useCallback((m: EditMode): boolean => {
        return m === 'ANNOTATE' || m === 'TEXT' || m === 'PIXEL_EDIT';
    }, []);

    // 判断某个模式是否需要清理透明像素的 RGB 值
    const needsTransparencyCleanup = useCallback((m: EditMode): boolean => {
        return m === 'PIXEL_EDIT';
    }, []);

    // 清理透明像素的 RGB 值（设为 0,0,0）
    const cleanupTransparentPixels = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }, []);

    // 保存当前 canvas 到 history
    const saveCanvasToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        // 如果需要清理透明像素
        if (needsTransparencyCleanup(mode)) {
            cleanupTransparentPixels(ctx, canvas.width, canvas.height);
        }

        pushToHistory(canvas.toDataURL('image/png'));
        setCanvasModified(false);
        return true;
    }, [mode, needsTransparencyCleanup, cleanupTransparentPixels, pushToHistory]);

    // --- Image Load Handler ---
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setResizeDims({ width, height });
        setCrop(undefined);

        // Only reset zoom if history is at start (new image loaded)
        if (history.length === 1) {
            resetView();
        }
    }, [history.length, resetView]);

    // --- Load Original Image for RESTORE ---
    useEffect(() => {
        if (history.length > 0 && history[0]) {
            const img = new Image();
            img.src = history[0];
            img.onload = () => {
                originalImgRef.current = img;
            };
        }
    }, [history[0]]);

    // --- Mode Change Handler ---
    const handleModeChange = useCallback((newMode: EditMode) => {
        // 统一规则：从任何 canvas 编辑模式切换出去时，如果有未保存的修改，自动保存
        if (isCanvasEditMode(mode) && canvasModified) {
            saveCanvasToHistory();
        }

        setMode(newMode);

        if (newMode !== 'TEXT') {
            textObjectsRef.current = [];
            setTextObjects([]);
            setSelectedTextId(null);
            setIsEditingText(false);
        }
    }, [mode, canvasModified, isCanvasEditMode, saveCanvasToHistory]);

    // --- Cancel Mode Handler ---
    const handleCancelMode = useCallback(() => {
        setMode(null);
        textObjectsRef.current = [];
        setTextObjects([]);
        setSelectedTextId(null);
        setIsEditingText(false);
        setCanvasModified(false);
    }, []);

    // --- Esc Key Handler ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mode) {
                handleCancelMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, handleCancelMode]);

    // --- Undo with Mode Reset ---
    const handleUndoWithReset = useCallback(() => {
        handleUndo();
        setMode(null);
        setCanvasModified(false);
    }, [handleUndo]);

    // ========================
    // Crop Logic
    // ========================
    const setAspectCrop = useCallback((aspect: number | undefined) => {
        if (!imgRef.current) return;
        const { width, height } = imgRef.current;

        if (aspect) {
            const newCrop = centerCrop(
                makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
                width,
                height
            );
            setCrop(newCrop);
        } else {
            setCrop(undefined);
        }
    }, []);

    const applyCrop = useCallback(() => {
        if (completedCrop && imgRef.current) {
            const canvas = document.createElement('canvas');
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            canvas.width = completedCrop.width * scaleX;
            canvas.height = completedCrop.height * scaleY;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(
                imgRef.current,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY,
                0, 0,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY
            );

            pushToHistory(canvas.toDataURL('image/png'));
            setMode(null);
        }
    }, [completedCrop, pushToHistory]);

    // ========================
    // Resize Logic
    // ========================
    const handleResizeDimensionChange = useCallback((dim: 'width' | 'height', value: number) => {
        if (maintainAspect && imgRef.current) {
            const aspect = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
            if (dim === 'width') {
                setResizeDims({ width: value, height: Math.round(value / aspect) });
            } else {
                setResizeDims({ width: Math.round(value * aspect), height: value });
            }
        } else {
            setResizeDims(prev => ({ ...prev, [dim]: value }));
        }
    }, [maintainAspect]);

    const setResizePercent = useCallback((percent: number) => {
        if (!imgRef.current) return;
        const w = Math.round(imgRef.current.naturalWidth * (percent / 100));
        const h = Math.round(imgRef.current.naturalHeight * (percent / 100));
        setResizeDims({ width: w, height: h });
    }, []);

    const applyResize = useCallback(() => {
        if (!imgRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = resizeDims.width;
        canvas.height = resizeDims.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(imgRef.current, 0, 0, resizeDims.width, resizeDims.height);
        pushToHistory(canvas.toDataURL('image/png'));
        setMode(null);
    }, [resizeDims, pushToHistory]);

    // ========================
    // Rotate / Flip Logic
    // ========================
    const rotateImage = useCallback(() => {
        if (!imgRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalHeight;
        canvas.height = imgRef.current.naturalWidth;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(imgRef.current, -imgRef.current.naturalWidth / 2, -imgRef.current.naturalHeight / 2);

        pushToHistory(canvas.toDataURL('image/png'));
    }, [pushToHistory]);

    const flipHorizontal = useCallback(() => {
        if (!imgRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(imgRef.current, 0, 0);

        pushToHistory(canvas.toDataURL('image/png'));
    }, [pushToHistory]);

    // ========================
    // Canvas Initialization Effect
    // ========================
    useEffect(() => {
        if ((mode === 'ANNOTATE' || mode === 'TEXT') && canvasRef.current && imgRef.current) {
            const canvas = canvasRef.current;
            canvas.width = imgRef.current.width;
            canvas.height = imgRef.current.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (mode === 'ANNOTATE') {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
            } else if (mode === 'TEXT') {
                ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

                // Use ref as source of truth to avoid React StrictMode issues
                const objectsToRender = textObjectsRef.current;
                // Draw all text objects
                objectsToRender.forEach((textObj, index) => {
                    ctx.save();

                    // Set font first to measure text
                    ctx.font = `${textObj.fontSize}px Arial`;
                    const metrics = ctx.measureText(textObj.text);
                    const textWidth = metrics.width;
                    const textHeight = textObj.fontSize;

                    // Apply rotation
                    if (textObj.rotation) {
                        ctx.translate(textObj.x, textObj.y);
                        ctx.rotate((textObj.rotation * Math.PI) / 180);
                        ctx.translate(-textObj.x, -textObj.y);
                    }

                    // Draw text
                    ctx.fillStyle = textObj.color;
                    ctx.fillText(textObj.text, textObj.x, textObj.y);

                    // Draw selection box and handles if selected
                    if (textObj.id === selectedTextId && !isEditingText) {
                        const padding = 8;
                        const boxX = textObj.x - padding;
                        const boxY = textObj.y - textHeight - padding;
                        const boxW = textWidth + padding * 2;
                        const boxH = textHeight + padding * 2;

                        // Selection box
                        ctx.strokeStyle = '#00ff00';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(boxX, boxY, boxW, boxH);

                        // Corner handles for resizing
                        const handleSize = 8;
                        ctx.fillStyle = '#00ff00';

                        // Top-left
                        ctx.fillRect(boxX - handleSize / 2, boxY - handleSize / 2, handleSize, handleSize);
                        // Top-right
                        ctx.fillRect(boxX + boxW - handleSize / 2, boxY - handleSize / 2, handleSize, handleSize);
                        // Bottom-left
                        ctx.fillRect(boxX - handleSize / 2, boxY + boxH - handleSize / 2, handleSize, handleSize);
                        // Bottom-right (resize handle)
                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(boxX + boxW - handleSize / 2, boxY + boxH - handleSize / 2, handleSize, handleSize);
                    }

                    ctx.restore();
                });
            }
        }
    }, [mode, currentSrc, color, lineWidth, selectedTextId]);

    // Update context style when color/width changes
    useEffect(() => {
        if (mode === 'ANNOTATE' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
            }
        }
    }, [color, lineWidth, mode]);





    // ========================
    // Text Editing Logic (must be before Drawing Logic)
    // ========================
    const findTextAtPosition = useCallback((x: number, y: number): TextObject | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Use ref as source of truth
        const objectsToCheck = textObjectsRef.current;
        // Check from top to bottom (reverse order, so top text is checked first)
        for (let i = objectsToCheck.length - 1; i >= 0; i--) {
            const textObj = objectsToCheck[i];
            ctx.font = `${textObj.fontSize}px Arial`;
            const metrics = ctx.measureText(textObj.text);

            if (
                x >= textObj.x &&
                x <= textObj.x + metrics.width &&
                y >= textObj.y - textObj.fontSize &&
                y <= textObj.y
            ) {
                return textObj;
            }
        }
        return null;
    }, []);

    const handleTextClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get display coordinates (what user sees on screen)
        const coords = getCanvasCoordinates(e.clientX, e.clientY, canvas);

        // Check if clicked on existing text (use canvas coordinates for hit testing)
        const scaleX = canvas.width / imgRef.current!.width;
        const scaleY = canvas.height / imgRef.current!.height;
        const canvasX = coords.x * scaleX;
        const canvasY = coords.y * scaleY;

        const clickedText = findTextAtPosition(canvasX, canvasY);

        if (clickedText) {
            // Select existing text
            setSelectedTextId(clickedText.id);
            setIsEditingText(false);
            setEditingPosition(null);
        } else {
            // Store display coordinates for input box positioning
            // Canvas coordinates for actual text rendering
            setEditingPosition({
                x: coords.x,  // Display X for input box
                y: coords.y,  // Display Y for input box
                canvasX: canvasX,  // Canvas X for text rendering
                canvasY: canvasY   // Canvas Y for text rendering
            });
            setEditingValue('');
            setIsEditingText(true);
            setSelectedTextId(null);
            // Focus input after state update
            setTimeout(() => {
                textInputRef.current?.focus();
            }, 100);
        }
    }, [getCanvasCoordinates, findTextAtPosition]);

    const handleEditSelectedText = useCallback(() => {
        if (!selectedTextId) return;

        const textObj = textObjectsRef.current.find(t => t.id === selectedTextId);
        if (!textObj) return;

        // Set editing mode with existing text (textObj.x and textObj.y are already in canvas coordinates)
        setEditingPosition({ x: textObj.x, y: textObj.y });
        setEditingValue(textObj.text);
        setIsEditingText(true);

        // Remove the text object temporarily while editing
        setTextObjects(prev => prev.filter(t => t.id !== selectedTextId));
        setSelectedTextId(null);

        setTimeout(() => {
            textInputRef.current?.focus();
            textInputRef.current?.select();
        }, 100);
    }, [selectedTextId, textObjects]);

    const handleDeleteSelectedText = useCallback(() => {
        if (!selectedTextId) return;

        const updated = textObjectsRef.current.filter(t => t.id !== selectedTextId);
        textObjectsRef.current = updated;
        setTextObjects(updated);
        setSelectedTextId(null);
        setCanvasModified(true);
    }, [selectedTextId]);

    const finishTextInput = useCallback((text?: string) => {
        // Use provided text or fallback to editingValue
        const finalText = text ?? editingValue;

        // If no value, just close the input
        if (!finalText.trim()) {
            setIsEditingText(false);
            setEditingPosition(null);
            setEditingValue('');
            return;
        }

        if (!editingPosition) {
            setIsEditingText(false);
            setEditingValue('');
            return;
        }

        // Use canvas coordinates for text rendering
        const canvasX = editingPosition.canvasX ?? editingPosition.x;
        const canvasY = editingPosition.canvasY ?? editingPosition.y;

        const newTextObj: TextObject = {
            id: `text-${Date.now()}`,
            text: finalText,
            x: canvasX,
            y: canvasY,
            color: textColor,
            fontSize: textFontSize,
            rotation: 0
        };

        // Update ref first (source of truth)
        const currentObjects = textObjectsRef.current;
        const newArr = [...currentObjects, newTextObj];

        // Update ref immediately (source of truth)
        textObjectsRef.current = newArr;

        // Then update state (for rendering)
        setTextObjects(newArr);

        // Update other states
        setSelectedTextId(newTextObj.id);
        setCanvasModified(true);

        // Clear editing state immediately (input box will disappear)
        setIsEditingText(false);
        setEditingPosition(null);
        setEditingValue('');
    }, [editingPosition, editingValue, textColor, textFontSize]);

    const handleTextMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!selectedTextId || isEditingText) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const coords = getCanvasCoordinates(e.clientX, e.clientY, canvas);
        const scaleX = canvas.width / imgRef.current!.width;
        const scaleY = canvas.height / imgRef.current!.height;

        const x = coords.x * scaleX;
        const y = coords.y * scaleY;

        const textObj = textObjectsRef.current.find(t => t.id === selectedTextId);
        if (!textObj) return;

        // Measure text to get bounds
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        ctx.font = `${textObj.fontSize}px Arial`;
        const metrics = ctx.measureText(textObj.text);
        const textWidth = metrics.width;
        const textHeight = textObj.fontSize;

        const padding = 8;
        const boxX = textObj.x - padding;
        const boxY = textObj.y - textHeight - padding;
        const boxW = textWidth + padding * 2;
        const boxH = textHeight + padding * 2;

        const handleSize = 8;
        const resizeHandleX = boxX + boxW;
        const resizeHandleY = boxY + boxH;

        // Check if clicked on resize handle (bottom-right)
        if (Math.abs(x - resizeHandleX) < handleSize && Math.abs(y - resizeHandleY) < handleSize) {
            setIsResizingText(true);
            e.stopPropagation();
            return;
        }

        // Check if clicked on the text
        const clickedText = findTextAtPosition(x, y);
        if (clickedText && clickedText.id === selectedTextId) {
            setIsDraggingText(true);
            setDragOffset({
                x: x - textObj.x,
                y: y - textObj.y
            });
            e.stopPropagation();
        }
    }, [selectedTextId, isEditingText, getCanvasCoordinates, textObjects, findTextAtPosition]);

    const handleTextMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!selectedTextId) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const coords = getCanvasCoordinates(e.clientX, e.clientY, canvas);
        const scaleX = canvas.width / imgRef.current!.width;
        const scaleY = canvas.height / imgRef.current!.height;

        const x = coords.x * scaleX;
        const y = coords.y * scaleY;

        if (isDraggingText) {
            const updated = textObjectsRef.current.map(t =>
                t.id === selectedTextId
                    ? { ...t, x: x - dragOffset.x, y: y - dragOffset.y }
                    : t
            );
            textObjectsRef.current = updated;
            setTextObjects(updated);
            setCanvasModified(true);
        } else if (isResizingText) {
            const textObj = textObjectsRef.current.find(t => t.id === selectedTextId);
            if (!textObj) return;

            // Calculate distance from text origin to mouse
            const dx = x - textObj.x;
            const dy = y - textObj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Map distance to font size (minimum 12, maximum 200)
            const newFontSize = Math.max(12, Math.min(200, Math.round(distance / 3)));

            const updated = textObjectsRef.current.map(t =>
                t.id === selectedTextId
                    ? { ...t, fontSize: newFontSize }
                    : t
            );
            textObjectsRef.current = updated;
            setTextObjects(updated);
            setCanvasModified(true);
        }
    }, [isDraggingText, isResizingText, selectedTextId, getCanvasCoordinates, dragOffset]);

    const handleTextMouseUp = useCallback(() => {
        setIsDraggingText(false);
        setIsResizingText(false);
    }, []);

    const applyText = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imgRef.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw image first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

        // Draw all text objects onto the canvas (use ref as source of truth)
        textObjectsRef.current.forEach(textObj => {
            ctx.save();

            if (textObj.rotation) {
                ctx.translate(textObj.x, textObj.y);
                ctx.rotate((textObj.rotation * Math.PI) / 180);
                ctx.translate(-textObj.x, -textObj.y);
            }

            ctx.font = `${textObj.fontSize}px Arial`;
            ctx.fillStyle = textObj.color;
            ctx.fillText(textObj.text, textObj.x, textObj.y);

            ctx.restore();
        });

        // Save the canvas with text merged into the image
        if (saveCanvasToHistory()) {
            setMode(null);
            textObjectsRef.current = [];
            setTextObjects([]);
            setSelectedTextId(null);
            setIsEditingText(false);
        }
    }, [saveCanvasToHistory]);

    // Handle keyboard shortcuts for text editing
    useEffect(() => {
        if (mode !== 'TEXT' || !selectedTextId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleDeleteSelectedText();
            } else if (e.key === 'Enter' || e.key === 'e') {
                e.preventDefault();
                handleEditSelectedText();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, selectedTextId, handleDeleteSelectedText, handleEditSelectedText]);

    // ========================
    // Drawing Logic
    // ========================
    const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode === 'TEXT') {
            if (isEditingText) {
                return; // Don't interfere with text input
            }

            const canvas = canvasRef.current;
            if (!canvas) return;

            const coords = getCanvasCoordinates(e.clientX, e.clientY, canvas);
            const scaleX = canvas.width / imgRef.current!.width;
            const scaleY = canvas.height / imgRef.current!.height;
            const x = coords.x * scaleX;
            const y = coords.y * scaleY;

            // Check if clicked on existing text
            const clickedText = findTextAtPosition(x, y);

            if (clickedText) {
                // If clicking on selected text, prepare for dragging
                if (clickedText.id === selectedTextId) {
                    handleTextMouseDown(e);
                } else {
                    // Select different text
                    setSelectedTextId(clickedText.id);
                    setEditingPosition(null);
                    setIsEditingText(false);
                }
            } else {
                // Click on empty space - create new text
                handleTextClick(e);
            }
            return;
        }

        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCanvasCoordinates(e.clientX, e.clientY, canvas);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    }, [mode, getCanvasCoordinates, handleTextClick, handleTextMouseDown, isEditingText, isDraggingText, findTextAtPosition, selectedTextId]);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode === 'TEXT') {
            handleTextMouseMove(e);
            return;
        }
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCanvasCoordinates(e.clientX, e.clientY, canvas);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        setCanvasModified(true);
    }, [mode, isDrawing, getCanvasCoordinates, handleTextMouseMove]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
        handleTextMouseUp();
    }, [handleTextMouseUp]);

    const applyAnnotation = useCallback(() => {
        if (saveCanvasToHistory()) {
            setMode(null);
        }
    }, [saveCanvasToHistory]);

    // ========================
    // Render
    // ========================
    return (
        <div className="flex flex-row h-full w-full bg-slate-950 overflow-hidden">
            {/* Left Sidebar: Toolbar */}
            <div className="w-20 flex-none bg-slate-900 border-r border-slate-800 z-30 relative flex flex-col items-center">
                <EditorToolbar
                    mode={mode}
                    setMode={handleModeChange}
                    currentStep={currentStep}
                    isLoading={isLoading}
                    canvasModified={canvasModified}
                    onUndo={handleUndoWithReset}
                    onRotate={rotateImage}
                    onFlipHorizontal={flipHorizontal}
                    onChangeImage={onChangeImage}
                    onCopy={async () => {
                        try {
                            let srcToUse = currentSrc;
                            if (isCanvasEditMode(mode) && canvasRef.current) {
                                srcToUse = canvasRef.current.toDataURL('image/png');
                                if (canvasModified) {
                                    saveCanvasToHistory();
                                    setMode(null);
                                }
                            }
                            const response = await fetch(srcToUse);
                            const blob = await response.blob();
                            await navigator.clipboard.write([
                                new ClipboardItem({ [blob.type]: blob })
                            ]);
                        } catch (err) {
                            console.error('Failed to copy image:', err);
                        }
                    }}
                    onDownload={() => {
                        let srcToUse = currentSrc;
                        if (isCanvasEditMode(mode) && canvasRef.current) {
                            srcToUse = canvasRef.current.toDataURL('image/png');
                            if (canvasModified) {
                                saveCanvasToHistory();
                                setMode(null);
                            }
                        }
                        const link = document.createElement('a');
                        link.download = `edited-image-${Date.now()}.png`;
                        link.href = srcToUse;
                        link.click();
                    }}
                    onSplit={() => onSplit(currentSrc)}
                />
            </div>

            {/* Right Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">

                {/* Top Bar: Options */}
                <div className="h-14 flex-none border-b border-slate-800 bg-slate-900 z-20 relative">
                    <EditorOptionsBar
                        mode={mode}
                        onCancel={handleCancelMode}
                        // Crop
                        onSetCropAspect={setAspectCrop}
                        onApplyCrop={applyCrop}
                        // Resize
                        resizeDims={resizeDims}
                        maintainAspect={maintainAspect}
                        onResizeDimensionChange={handleResizeDimensionChange}
                        onMaintainAspectChange={setMaintainAspect}
                        onSetResizePercent={setResizePercent}
                        onApplyResize={applyResize}
                        // Annotate
                        annotateColor={color}
                        annotateLineWidth={lineWidth}
                        onAnnotateColorChange={setColor}
                        onAnnotateLineWidthChange={setLineWidth}
                        onApplyAnnotation={applyAnnotation}
                        // Text
                        textColor={textColor}
                        textFontSize={textFontSize}
                        onTextColorChange={(color) => {
                            setTextColor(color);
                            // Update selected text color
                            if (selectedTextId) {
                                const updated = textObjectsRef.current.map(t =>
                                    t.id === selectedTextId ? { ...t, color } : t
                                );
                                textObjectsRef.current = updated;
                                setTextObjects(updated);
                                setCanvasModified(true);
                            }
                        }}
                        onTextFontSizeChange={(size) => {
                            setTextFontSize(size);
                            // Update selected text size
                            if (selectedTextId) {
                                const updated = textObjectsRef.current.map(t =>
                                    t.id === selectedTextId ? { ...t, fontSize: size } : t
                                );
                                textObjectsRef.current = updated;
                                setTextObjects(updated);
                                setCanvasModified(true);
                            }
                        }}
                        onApplyText={applyText}
                        // Pixel Edit
                        pixelMode={null} // TODO: Add correct logic if missing
                        pixelBrushSize={0} // Placeholder
                        onPixelModeChange={() => { }}
                        onPixelBrushSizeChange={() => { }}
                        // Background
                        bgTool={null} // TODO: Add correct logic if missing
                        tolerance={10} // Placeholder
                        onBgToolChange={() => { }}
                        onToleranceChange={() => { }}
                        onAutoRemoveBg={() => { }}
                        onApplyBackground={() => { }}
                        // Segment
                        samModel={'b0'} // Placeholder
                        samPointsCount={0}
                        hasSamMask={false}
                        isGeneratingMask={false}
                        onSamModelChange={() => { }}
                        onGenerateMask={() => { }}
                        onApplySamMask={() => { }}
                    />
                </div>

                {/* Main Canvas Area */}
                <div
                    ref={containerRef}
                    className="flex-1 w-full relative bg-slate-900 cursor-move flex items-center justify-center overflow-hidden"
                    onMouseDown={handleMouseDownPan}
                    onMouseMove={handleMouseMovePan}
                    onMouseUp={handleMouseUpPan}
                    onMouseLeave={handleMouseUpPan}
                >
                    {/* Zoom Controls */}
                    <ZoomControls
                        zoom={zoom}
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onResetView={resetView}
                    />

                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                                <p className="text-cyan-400 font-medium animate-pulse">{loadingText || "Processing..."}</p>
                            </div>
                        </div>
                    )}

                    {/* In-progress overlays removed */}

                    {/* Canvas */}
                    <EditorCanvas
                        currentSrc={currentSrc}
                        zoom={zoom}
                        pan={pan}
                        isPanning={isPanning}
                        imgRef={imgRef}
                        canvasRef={canvasRef}
                        crop={crop}
                        onCropChange={setCrop}
                        onCropComplete={setCompletedCrop}
                        onImageLoad={onImageLoad}
                        onCanvasMouseDown={startDrawing}
                        onCanvasMouseMove={draw}
                        onCanvasMouseUp={stopDrawing}
                        onCanvasMouseLeave={stopDrawing}
                    />

                    {/* In-place Text Input */}
                    {mode === 'TEXT' && isEditingText && editingPosition && (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${editingPosition.x * zoom + pan.x}px`,
                                top: `${(editingPosition.y - textFontSize) * zoom + pan.y}px`,
                                zIndex: 1000,
                                pointerEvents: 'auto'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <input
                                ref={textInputRef}
                                type="text"
                                value={editingValue}
                                onChange={(e) => {
                                    setEditingValue(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const currentValue = e.currentTarget.value.trim();

                                        if (!currentValue) {
                                            // If empty, just close the input
                                            setIsEditingText(false);
                                            setEditingPosition(null);
                                            setEditingValue('');
                                            return;
                                        }

                                        if (!editingPosition) {
                                            setIsEditingText(false);
                                            setEditingValue('');
                                            return;
                                        }

                                        // Use canvas coordinates for text rendering
                                        const canvasX = editingPosition.canvasX ?? editingPosition.x;
                                        const canvasY = editingPosition.canvasY ?? editingPosition.y;

                                        const newTextObj: TextObject = {
                                            id: `text-${Date.now()}`,
                                            text: currentValue,
                                            x: canvasX,
                                            y: canvasY,
                                            color: textColor,
                                            fontSize: textFontSize,
                                            rotation: 0
                                        };

                                        // Update ref first (source of truth)
                                        const currentObjects = textObjectsRef.current;
                                        const newArr = [...currentObjects, newTextObj];

                                        // Update ref immediately (source of truth)
                                        textObjectsRef.current = newArr;

                                        // Then update state (for rendering)
                                        setTextObjects(newArr);

                                        // Update other states
                                        setSelectedTextId(newTextObj.id);
                                        setCanvasModified(true);

                                        // Clear editing state immediately (input box will disappear)
                                        setIsEditingText(false);
                                        setEditingPosition(null);
                                        setEditingValue('');
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsEditingText(false);
                                        setEditingPosition(null);
                                        setEditingValue('');
                                    }
                                }}
                                onBlur={() => {
                                    // Don't auto-close on blur, let user finish with Enter
                                }}
                                placeholder="输入文字..."
                                style={{
                                    fontSize: `${textFontSize}px`,
                                    color: textColor,
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    border: '2px solid #00ff00',
                                    outline: 'none',
                                    padding: '4px 8px',
                                    fontFamily: 'Arial',
                                    minWidth: '200px',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                                }}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const ImageEditor = React.memo(ImageEditorComponent);

import { useState, useCallback, useEffect, RefObject } from 'react';
import { PanPosition } from '../types/editor';

interface UseZoomPanOptions {
    containerRef: RefObject<HTMLDivElement>;
    initialZoom?: number;
    initialPan?: PanPosition;
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
    disabled?: boolean; // 用于某些模式下禁用缩放（如裁剪模式）
}

interface UseZoomPanReturn {
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    pan: PanPosition;
    setPan: React.Dispatch<React.SetStateAction<PanPosition>>;
    isPanning: boolean;

    // 事件处理器
    handleMouseDownPan: (e: React.MouseEvent) => void;
    handleMouseMovePan: (e: React.MouseEvent) => void;
    handleMouseUpPan: () => void;

    // 缩放控制
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
}

/**
 * 缩放和平移管理 Hook
 * 
 * 处理：
 * - Ctrl/Cmd + 滚轮缩放（以鼠标位置为中心）
 * - 普通滚轮平移
 * - 鼠标中键拖拽平移
 * - Alt + 左键拖拽平移
 */
export function useZoomPan({
    containerRef,
    initialZoom = 1,
    initialPan = { x: 0, y: 0 },
    minZoom = 0.1,
    maxZoom = 10,
    zoomStep = 0.1,
    disabled = false
}: UseZoomPanOptions): UseZoomPanReturn {
    const [zoom, setZoom] = useState(initialZoom);
    const [pan, setPan] = useState<PanPosition>(initialPan);
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // 滚轮事件处理
    useEffect(() => {
        const container = containerRef.current;
        if (!container || disabled) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();

            if (e.ctrlKey || e.metaKey) {
                // 以鼠标位置为中心缩放
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;

                const delta = -e.deltaY;

                setZoom(currentZoom => {
                    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + (delta > 0 ? zoomStep : -zoomStep)));
                    const scaleFactor = newZoom / currentZoom;

                    setPan(currentPan => ({
                        x: currentPan.x + (mouseX - currentPan.x) * (1 - scaleFactor),
                        y: currentPan.y + (mouseY - currentPan.y) * (1 - scaleFactor)
                    }));

                    return newZoom;
                });
            } else {
                // 普通滚轮平移
                setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, [containerRef, disabled, minZoom, maxZoom, zoomStep]);

    // 鼠标拖拽平移
    const handleMouseDownPan = useCallback((e: React.MouseEvent) => {
        if (disabled) return;
        // 中键或 Alt + 左键
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            e.preventDefault();
        }
    }, [disabled]);

    const handleMouseMovePan = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
    }, [isPanning, lastMousePos]);

    const handleMouseUpPan = useCallback(() => {
        setIsPanning(false);
    }, []);

    // 缩放控制函数
    const zoomIn = useCallback(() => {
        setZoom(z => Math.min(maxZoom, z + zoomStep));
    }, [maxZoom, zoomStep]);

    const zoomOut = useCallback(() => {
        setZoom(z => Math.max(minZoom, z - zoomStep));
    }, [minZoom, zoomStep]);

    const resetView = useCallback(() => {
        setZoom(initialZoom);
        setPan(initialPan);
    }, [initialZoom, initialPan]);

    return {
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
    };
}


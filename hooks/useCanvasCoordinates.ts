import { useCallback, RefObject } from 'react';
import { PanPosition } from '../types/editor';

interface UseCanvasCoordinatesOptions {
    imgRef: RefObject<HTMLImageElement>;
    zoom: number;
    pan: PanPosition;
}

/**
 * Canvas 坐标转换 Hook
 * 
 * 将鼠标的屏幕坐标转换为 canvas 上的坐标，考虑 zoom 和 pan 的影响。
 */
export function useCanvasCoordinates({
    imgRef,
    zoom,
    pan
}: UseCanvasCoordinatesOptions) {
    const getCanvasCoordinates = useCallback((
        clientX: number,
        clientY: number,
        element: HTMLElement
    ): { x: number; y: number } => {
        if (!imgRef.current) {
            // 降级方案：直接使用元素坐标
            const rect = element.getBoundingClientRect();
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        // 获取 Main Area 容器的 rect（未受 transform 影响）
        const mainArea = element.closest('.flex-1.overflow-hidden') as HTMLElement;
        if (!mainArea) {
            const rect = element.getBoundingClientRect();
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        const mainRect = mainArea.getBoundingClientRect();

        // 鼠标相对于 Main Area 的位置
        const mouseX = clientX - mainRect.left;
        const mouseY = clientY - mainRect.top;

        // Main Area 的中心点
        const mainCenterX = mainRect.width / 2;
        const mainCenterY = mainRect.height / 2;

        // 图片的实际显示尺寸（未缩放）
        const imgWidth = imgRef.current.width;
        const imgHeight = imgRef.current.height;
        const imgCenterX = imgWidth / 2;
        const imgCenterY = imgHeight / 2;

        // 相对于 Main Area 中心的偏移
        const offsetX = mouseX - mainCenterX;
        const offsetY = mouseY - mainCenterY;

        // 逆向应用 transform: (offset - pan) / zoom
        const unscaledOffsetX = (offsetX - pan.x) / zoom;
        const unscaledOffsetY = (offsetY - pan.y) / zoom;

        // 转换为 canvas 坐标（相对于图片左上角）
        const canvasX = unscaledOffsetX + imgCenterX;
        const canvasY = unscaledOffsetY + imgCenterY;

        return { x: canvasX, y: canvasY };
    }, [imgRef, zoom, pan]);

    return { getCanvasCoordinates };
}


import { useState, useCallback } from 'react';

interface UseImageHistoryOptions {
    initialSrc: string;
    onHistoryChange?: (currentSrc: string, step: number) => void;
}

interface UseImageHistoryReturn {
    // 当前图片源
    currentSrc: string;

    // 历史数组
    history: string[];

    // 当前步骤索引
    currentStep: number;

    // 添加新的历史记录
    pushToHistory: (newSrc: string) => void;

    // 撤销
    handleUndo: () => void;

    // 重做
    handleRedo: () => void;

    // 重置历史（用于加载新图片）
    resetHistory: (newSrc: string) => void;

    // 是否可以撤销
    canUndo: boolean;

    // 是否可以重做
    canRedo: boolean;
}

/**
 * 图片编辑历史管理 Hook
 * 
 * 使用栈结构管理编辑历史，支持撤销和重做操作。
 * 当进行新的编辑操作时，会清除当前位置之后的历史记录。
 */
export function useImageHistory({
    initialSrc,
    onHistoryChange
}: UseImageHistoryOptions): UseImageHistoryReturn {
    const [history, setHistory] = useState<string[]>([initialSrc]);
    const [currentStep, setCurrentStep] = useState(0);

    const currentSrc = history[currentStep];

    const pushToHistory = useCallback((newSrc: string) => {
        setHistory(prevHistory => {
            // 清除当前位置之后的历史记录
            const newHistory = prevHistory.slice(0, currentStep + 1);
            newHistory.push(newSrc);
            return newHistory;
        });
        setCurrentStep(prevStep => {
            const newStep = prevStep + 1;
            onHistoryChange?.(newSrc, newStep);
            return newStep;
        });
    }, [currentStep, onHistoryChange]);

    const handleUndo = useCallback(() => {
        if (currentStep > 0) {
            const newStep = currentStep - 1;
            setCurrentStep(newStep);
            onHistoryChange?.(history[newStep], newStep);
        }
    }, [currentStep, history, onHistoryChange]);

    const handleRedo = useCallback(() => {
        if (currentStep < history.length - 1) {
            const newStep = currentStep + 1;
            setCurrentStep(newStep);
            onHistoryChange?.(history[newStep], newStep);
        }
    }, [currentStep, history, onHistoryChange]);

    const resetHistory = useCallback((newSrc: string) => {
        setHistory([newSrc]);
        setCurrentStep(0);
        onHistoryChange?.(newSrc, 0);
    }, [onHistoryChange]);

    return {
        currentSrc,
        history,
        currentStep,
        pushToHistory,
        handleUndo,
        handleRedo,
        resetHistory,
        canUndo: currentStep > 0,
        canRedo: currentStep < history.length - 1
    };
}



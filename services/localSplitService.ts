import { SplitDirection } from "../types";

export interface DetectedSplits {
    rowSplits: number[];
    colSplits: number[];
}

/**
 * Detects split lines using local image processing algorithms (Canvas API).
 * Replaces the AI-based approach for faster and offline-capable splitting.
 */
export const detectSeamsLocal = async (
    imageSrc: string,
    width: number,
    height: number
): Promise<DetectedSplits> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);

                const rowSplits = detectAxis(imageData, SplitDirection.HORIZONTAL);
                const colSplits = detectAxis(imageData, SplitDirection.VERTICAL);

                resolve({ rowSplits, colSplits });
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = (err) => reject(err);
        img.src = imageSrc;
    });
};

const detectAxis = (
    imageData: ImageData,
    direction: SplitDirection
): number[] => {
    const { width, height, data } = imageData;
    const isHorizontal = direction === SplitDirection.HORIZONTAL;
    const limit = isHorizontal ? height : width;
    const crossLimit = isHorizontal ? width : height;

    // Store the "energy" or "difference" score for each line
    const scores: number[] = new Array(limit).fill(0);

    // 1. Calculate difference between adjacent lines (Gradient)
    // We start from 1 because we compare with i-1
    for (let i = 1; i < limit; i++) {
        let diffSum = 0;

        // Optimization: Sample pixels to improve performance on large images
        // Step size of 2 or 4 is usually enough for visual boundaries
        const step = 2;

        for (let j = 0; j < crossLimit; j += step) {
            const idx1 = isHorizontal
                ? (i * width + j) * 4
                : (j * width + i) * 4;

            const idx2 = isHorizontal
                ? ((i - 1) * width + j) * 4
                : (j * width + (i - 1)) * 4;

            // Simple Euclidean distance or Manhattan distance of RGB
            const rDiff = Math.abs(data[idx1] - data[idx2]);
            const gDiff = Math.abs(data[idx1 + 1] - data[idx2 + 1]);
            const bDiff = Math.abs(data[idx1 + 2] - data[idx2 + 2]);

            diffSum += (rDiff + gDiff + bDiff);
        }

        // Normalize
        scores[i] = diffSum / (crossLimit / step);
    }

    // 2. Smooth the scores to reduce noise (like rain drops or texture)
    // Simple moving average
    const smoothedScores = [...scores];
    const smoothWindow = 3;
    for (let i = smoothWindow; i < limit - smoothWindow; i++) {
        let sum = 0;
        for (let k = -smoothWindow; k <= smoothWindow; k++) {
            sum += scores[i + k];
        }
        smoothedScores[i] = sum / (2 * smoothWindow + 1);
    }

    // 3. Detect Peaks
    const nonZeroScores = smoothedScores.filter(s => s > 0);
    if (nonZeroScores.length === 0) return [];

    const mean = nonZeroScores.reduce((a, b) => a + b, 0) / nonZeroScores.length;
    const variance = nonZeroScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nonZeroScores.length;
    const stdDev = Math.sqrt(variance);

    // Threshold: Increased to avoid false positives in textured images
    // Mean + 2.5 * StdDev is a strong filter for "outliers" (edges)
    const threshold = mean + 2.5 * stdDev;

    const candidates: number[] = [];

    // 4. Peak extraction with Non-Maximum Suppression window
    // Minimum distance between splits. 
    // For a grid, splits are rarely closer than 5% of the total dimension or at least 40px.
    const minDistance = Math.max(40, limit / 20);

    for (let i = 1; i < limit - 1; i++) {
        if (smoothedScores[i] > threshold) {
            // Check if it's a local maximum in a small neighborhood
            let isMax = true;
            const localCheck = 5;
            const start = Math.max(0, i - localCheck);
            const end = Math.min(limit, i + localCheck);

            for (let k = start; k < end; k++) {
                if (smoothedScores[k] > smoothedScores[i]) {
                    isMax = false;
                    break;
                }
            }

            if (isMax) {
                // Ensure we don't add points too close to existing ones
                // If close, keep the one with higher score
                if (candidates.length > 0) {
                    const lastIdx = candidates[candidates.length - 1];
                    if (i - lastIdx < minDistance) {
                        if (smoothedScores[i] > smoothedScores[lastIdx]) {
                            // Replace the previous one because this one is stronger
                            candidates.pop();
                            candidates.push(i);
                        }
                        // Else: ignore this one, previous was stronger
                    } else {
                        candidates.push(i);
                    }
                } else {
                    candidates.push(i);
                }
            }
        }
    }

    return candidates;
};

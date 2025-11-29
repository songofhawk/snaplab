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

    // --- Method 1: Gap Detection (Low Variance) ---
    // Ideal for images with whitespace/padding between grid items.

    const variances = new Float32Array(limit);

    // Calculate variance for each line
    for (let i = 0; i < limit; i++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;

        // Sampling optimization
        const step = 4;

        for (let j = 0; j < crossLimit; j += step) {
            const idx = isHorizontal
                ? (i * width + j) * 4
                : (j * width + i) * 4;

            // Convert to grayscale for variance calculation
            const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            sum += val;
            sumSq += val * val;
            count++;
        }

        const mean = sum / count;
        // Variance = E[X^2] - (E[X])^2
        variances[i] = (sumSq / count) - (mean * mean);
    }

    // Find continuous regions of low variance
    // Threshold: Pure color is 0. Allow some noise (compression artifacts, paper texture).
    // 100 is a safe bet for "solid-ish" areas in 0-255^2 space.
    const gapThreshold = 100;
    const gaps: number[] = [];
    let inGap = false;
    let gapStart = 0;

    for (let i = 0; i < limit; i++) {
        if (variances[i] < gapThreshold) {
            if (!inGap) {
                inGap = true;
                gapStart = i;
            }
        } else {
            if (inGap) {
                inGap = false;
                const gapEnd = i - 1;
                // Only consider gaps that are wide enough (e.g. > 2px) to avoid noise
                if (gapEnd - gapStart >= 2) {
                    gaps.push(Math.floor((gapStart + gapEnd) / 2));
                }
            }
        }
    }
    // Handle gap at the very end
    if (inGap) {
        const gapEnd = limit - 1;
        if (gapEnd - gapStart >= 2) {
            gaps.push(Math.floor((gapStart + gapEnd) / 2));
        }
    }

    // --- Method 2: Gradient Detection (Edges) ---
    // Good for seamless stitches or when gaps are not solid colors.

    const scores = new Float32Array(limit);
    for (let i = 1; i < limit; i++) {
        let diffSum = 0;
        const step = 2;
        for (let j = 0; j < crossLimit; j += step) {
            const idx1 = isHorizontal ? (i * width + j) * 4 : (j * width + i) * 4;
            const idx2 = isHorizontal ? ((i - 1) * width + j) * 4 : (j * width + (i - 1)) * 4;
            const rDiff = Math.abs(data[idx1] - data[idx2]);
            const gDiff = Math.abs(data[idx1 + 1] - data[idx2 + 1]);
            const bDiff = Math.abs(data[idx1 + 2] - data[idx2 + 2]);
            diffSum += (rDiff + gDiff + bDiff);
        }
        scores[i] = diffSum / (crossLimit / step);
    }

    // Smooth scores
    const smoothedScores = new Float32Array(limit);
    const smoothWindow = 2;
    for (let i = smoothWindow; i < limit - smoothWindow; i++) {
        let sum = 0;
        for (let k = -smoothWindow; k <= smoothWindow; k++) {
            sum += scores[i + k];
        }
        smoothedScores[i] = sum / (2 * smoothWindow + 1);
    }

    // Detect Peaks
    const edges: number[] = [];
    const nonZeroScores = Array.from(smoothedScores).filter(s => s > 0);
    if (nonZeroScores.length > 0) {
        const mean = nonZeroScores.reduce((a, b) => a + b, 0) / nonZeroScores.length;
        const variance = nonZeroScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nonZeroScores.length;
        const stdDev = Math.sqrt(variance);

        // Significantly increased threshold to avoid splitting objects inside images
        // Mean + 3.5 * StdDev targets only the most prominent lines
        const threshold = mean + 3.5 * stdDev;

        // Dynamic minimum distance: Assume grid items are not tiny.
        // e.g. at most 10 items per axis -> min distance is 1/15 of total length
        const minDistance = Math.max(50, limit / 15);

        for (let i = 1; i < limit - 1; i++) {
            if (smoothedScores[i] > threshold) {
                let isMax = true;
                const localCheck = 10; // Wider local check
                const start = Math.max(0, i - localCheck);
                const end = Math.min(limit, i + localCheck);
                for (let k = start; k < end; k++) {
                    if (smoothedScores[k] > smoothedScores[i]) {
                        isMax = false;
                        break;
                    }
                }
                if (isMax) {
                    edges.push(i);
                }
            }
        }

        // Filter edges by distance
        const filteredEdges: number[] = [];
        if (edges.length > 0) {
            // Sort by score to prefer stronger lines?
            // No, we need spatial order. But we can greedily pick strongest in a window.
            // For simplicity, let's stick to sequential but respect minDistance.

            // Better approach: Iteratively pick the highest score, remove neighbors, repeat.
            // This ensures we keep the "real" line and not a shadow, and don't skip a strong line just because a weak one came first.

            let candidates = edges.map(idx => ({ idx, score: smoothedScores[idx] }));
            candidates.sort((a, b) => b.score - a.score); // Sort by score desc

            const selected: number[] = [];

            while (candidates.length > 0) {
                const best = candidates[0];
                selected.push(best.idx);

                // Remove all candidates too close to this one
                candidates = candidates.filter(c => Math.abs(c.idx - best.idx) >= minDistance);
            }

            filteredEdges.push(...selected.sort((a, b) => a - b));
        }
        edges.splice(0, edges.length, ...filteredEdges);
    }

    // --- Combine Results ---

    const finalSplits: number[] = [];
    const margin = limit * 0.02; // Ignore splits within 2% of edges

    // Add gaps first (highest confidence)
    for (const gap of gaps) {
        if (gap > margin && gap < limit - margin) {
            finalSplits.push(gap);
        }
    }

    // Add edges if not close to existing gaps
    for (const edge of edges) {
        if (edge <= margin || edge >= limit - margin) continue;

        const isDuplicate = finalSplits.some(split => Math.abs(split - edge) < 20);
        if (!isDuplicate) {
            finalSplits.push(edge);
        }
    }

    return finalSplits.sort((a, b) => a - b);
};

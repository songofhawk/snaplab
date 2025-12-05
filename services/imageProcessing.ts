import { removeBackground } from "@imgly/background-removal";

/**
 * Performs a flood fill operation on a canvas context.
 * Sets the alpha channel of connected pixels of similar color to 0 (transparent).
 * 
 * @param ctx The canvas 2D context
 * @param startX The starting X coordinate
 * @param startY The starting Y coordinate
 * @param tolerance The color tolerance (0-255)
 */
export const floodFill = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    tolerance: number
) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const stack = [[startX, startY]];
    const visited = new Set<string>();

    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;

    const startIdx = getPixelIndex(startX, startY);
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    // If clicking on already transparent pixel, do nothing
    if (startA === 0) return;

    const colorMatch = (idx: number) => {
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Ignore already transparent pixels
        if (a === 0) return false;

        return (
            Math.abs(r - startR) <= tolerance &&
            Math.abs(g - startG) <= tolerance &&
            Math.abs(b - startB) <= tolerance
        );
    };

    while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const idx = getPixelIndex(x, y);

        if (colorMatch(idx)) {
            // Set alpha to 0 (transparent)
            data[idx + 3] = 0;

            // Check neighbors
            if (x > 0) stack.push([x - 1, y]);
            if (x < width - 1) stack.push([x + 1, y]);
            if (y > 0) stack.push([x, y - 1]);
            if (y < height - 1) stack.push([x, y + 1]);
        }
    }

    ctx.putImageData(imageData, 0, 0);
};

/**
 * Cleans transparent pixels by setting their RGB values to 0.
 * This prevents background removal libraries from misinterpreting transparent pixels.
 * 
 * @param imageSrc The source image URL
 * @returns A promise that resolves to a cleaned image data URL
 */
const cleanTransparentPixels = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // For transparent pixels (alpha = 0), set RGB to 0
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) {
                    data[i] = 0;     // R
                    data[i + 1] = 0; // G
                    data[i + 2] = 0; // B
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageSrc;
    });
};

/**
 * Removes the background from an image URL using @imgly/background-removal.
 * Before processing, transparent pixels are cleaned to prevent them from being
 * misinterpreted as background (which would turn them black).
 * 
 * @param imageSrc The source image URL
 * @returns A promise that resolves to the new image URL (blob URL)
 */
export const removeBackgroundAuto = async (imageSrc: string): Promise<string> => {
    try {
        // Clean transparent pixels first to prevent them from being turned black
        const cleanedImageSrc = await cleanTransparentPixels(imageSrc);
        const blob = await removeBackground(cleanedImageSrc);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Background removal failed:", error);
        throw error;
    }
};

/**
 * Filters the mask to keep only the largest connected component of foreground pixels.
 * This helps remove small noise artifacts.
 * 
 * @param maskData The raw mask data (Float32Array)
 * @param width Width of the mask
 * @param height Height of the mask
 * @returns A new Float32Array with only the largest component kept
 */
export const filterLargestComponent = (
    maskData: Float32Array,
    width: number,
    height: number
): Float32Array => {
    const size = width * height;
    const visited = new Uint8Array(size); // 0: unvisited, 1: visited
    const labels = new Int32Array(size).fill(0); // 0: background, >0: component ID
    let currentLabel = 1;
    const componentSizes: Map<number, number> = new Map();

    // Helper to get index
    const getIdx = (x: number, y: number) => y * width + x;

    // Iterate over all pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = getIdx(x, y);

            // If pixel is foreground (> 0) and not visited
            if (maskData[idx] > 0 && visited[idx] === 0) {
                // Start BFS
                const queue = [idx];
                visited[idx] = 1;
                labels[idx] = currentLabel;
                let count = 0;

                let head = 0;
                while (head < queue.length) {
                    const currIdx = queue[head++];
                    count++;

                    const cx = currIdx % width;
                    const cy = Math.floor(currIdx / width);

                    // Check 4 neighbors
                    const neighbors = [
                        { nx: cx - 1, ny: cy },
                        { nx: cx + 1, ny: cy },
                        { nx: cx, ny: cy - 1 },
                        { nx: cx, ny: cy + 1 }
                    ];

                    for (const { nx, ny } of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = getIdx(nx, ny);
                            if (maskData[nIdx] > 0 && visited[nIdx] === 0) {
                                visited[nIdx] = 1;
                                labels[nIdx] = currentLabel;
                                queue.push(nIdx);
                            }
                        }
                    }
                }

                componentSizes.set(currentLabel, count);
                currentLabel++;
            }
        }
    }

    // Find largest component
    let maxLabel = -1;
    let maxSize = -1;
    componentSizes.forEach((size, label) => {
        if (size > maxSize) {
            maxSize = size;
            maxLabel = label;
        }
    });

    // Create new mask
    const newMask = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        if (labels[i] === maxLabel) {
            newMask[i] = maskData[i]; // Keep original value
        } else {
            newMask[i] = -10.0; // Set to background (negative value)
        }
    }

    return newMask;
};

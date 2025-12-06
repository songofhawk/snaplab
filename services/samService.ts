import { env, SamModel, AutoProcessor, RawImage, Tensor } from '@huggingface/transformers';

// Skip local model check
env.allowLocalModels = false;

// Use default HuggingFace CDN
// Note: hf-mirror.com no longer supports CORS

export const SAM_MODELS = {
    FAST: 'Xenova/slimsam-77-uniform',
    HIGH_QUALITY: 'Xenova/sam-vit-b'
};

interface SAMState {
    model: any;
    processor: any;
    imageEmbeddings: any;
    imageInputs: any;
    rawImage: any;
    currentModelId: string | null;
    isInitializing: boolean;
}

let samState: SAMState = {
    model: null,
    processor: null,
    imageEmbeddings: null,
    imageInputs: null,
    rawImage: null,
    currentModelId: null,
    isInitializing: false
};

export const loadSAMModel = async (modelId: string, onProgress?: (progress: number) => void) => {
    // If same model is already loaded, do nothing
    if (samState.model && samState.processor && samState.currentModelId === modelId) {
        return;
    }

    // Prevent concurrent initialization
    if (samState.isInitializing) {
        throw new Error('Model is already being initialized');
    }

    // Reset state if switching models
    samState.model = null;
    samState.processor = null;
    samState.imageEmbeddings = null;
    samState.imageInputs = null;
    samState.currentModelId = null;
    samState.isInitializing = true;

    console.log(`Loading SAM Model: ${modelId}`, env);

    try {
        // Check WebGPU availability
        const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
        console.log(`WebGPU available: ${hasWebGPU}`);

        samState.model = await SamModel.from_pretrained(modelId, {
            // dtype must be specified for WebGPU to work properly
            dtype: 'fp32',
            device: hasWebGPU ? 'webgpu' : 'wasm',
            progress_callback: (data: any) => {
                if (data.status === 'progress' && onProgress) {
                    onProgress(data.progress);
                }
            }
        });

        samState.processor = await AutoProcessor.from_pretrained(modelId);
        samState.currentModelId = modelId;
    } catch (err) {
        console.error("Failed to load SAM model", err);
        samState.isInitializing = false;
        throw err;
    } finally {
        samState.isInitializing = false;
    }
};

export const computeEmbeddings = async (imageUrl: string) => {
    if (!samState.model || !samState.processor) {
        throw new Error("Model not loaded");
    }

    console.log("computeEmbeddings: Loading image...");
    const image = await RawImage.fromURL(imageUrl);
    samState.rawImage = image;
    console.log(`computeEmbeddings: Image loaded (${image.width}x${image.height})`);

    console.log("computeEmbeddings: Processing image with processor...");
    const inputs = await samState.processor(image);
    samState.imageInputs = inputs;
    console.log("computeEmbeddings: Image processed, keys:", Object.keys(inputs));

    // Compute embeddings
    console.log("computeEmbeddings: Computing embeddings (this may take a while on first run)...");
    samState.imageEmbeddings = await samState.model.get_image_embeddings(inputs);
    console.log("computeEmbeddings: Embeddings computed!");

    return {
        width: image.width,
        height: image.height
    };
};

export const generateMask = async (points: { x: number, y: number, label: number }[], skipPostProcess = false) => {
    if (!samState.model || !samState.processor || !samState.imageEmbeddings || !samState.rawImage || !samState.imageInputs) {
        throw new Error("Model or embeddings not ready");
    }

    const originalHeight = samState.rawImage.height;
    const originalWidth = samState.rawImage.width;

    console.log(`Original image size: ${originalWidth}x${originalHeight}`);
    console.log(`Input points:`, points);

    // v3 API: Use processor to prepare point inputs
    const input_points = [points.map(p => [p.x, p.y])];
    const input_labels = [points.map(p => p.label)];
    
    console.log("Formatted input_points:", input_points);
    console.log("Formatted input_labels:", input_labels);

    // Process points with the image to get properly formatted tensors
    const pointInputs = await samState.processor(
        samState.rawImage,
        { input_points, input_labels }
    );

    console.log("Point inputs keys:", Object.keys(pointInputs));

    // Run model with PRECOMPUTED embeddings + new point inputs
    // This is the key: use cached image_embeddings for speed, but new points
    const outputs = await samState.model({
        ...pointInputs,
        image_embeddings: samState.imageEmbeddings,  // Use precomputed embeddings!
    });

    // Analyze all 3 masks to find the smallest one with good score
    const scores = outputs.iou_scores.data;
    const numMasks = 3;
    const scoreOffset = scores.length - numMasks;
    
    const predMasks = outputs.pred_masks;
    const maskDims = predMasks.dims;
    const maskH = maskDims[maskDims.length - 2];
    const maskW = maskDims[maskDims.length - 1];
    const singleMaskSize = maskH * maskW;
    
    console.log("Mask analysis:");
    const maskInfos: { index: number; score: number; coverage: number }[] = [];
    for (let m = 0; m < numMasks; m++) {
        const start = m * singleMaskSize;
        let positiveCount = 0;
        for (let i = 0; i < singleMaskSize; i++) {
            if (predMasks.data[start + i] > 0) positiveCount++;
        }
        const coverage = positiveCount / singleMaskSize;
        const score = scores[scoreOffset + m];
        maskInfos.push({ index: m, score, coverage });
        console.log(`  Mask ${m}: score=${score.toFixed(3)}, coverage=${(coverage * 100).toFixed(1)}%`);
    }
    
    // Select the mask with smallest coverage that has score > 0.8
    // This gives us the most precise segmentation
    const validMasks = maskInfos.filter(m => m.score > 0.8);
    validMasks.sort((a, b) => a.coverage - b.coverage);
    
    const selected = validMasks.length > 0 ? validMasks[0] : maskInfos[0];
    const bestIndex = selected.index;
    const maxScore = selected.score;
    
    console.log(`Selected mask index: ${bestIndex} (smallest valid) with score: ${maxScore.toFixed(3)}, coverage: ${(selected.coverage * 100).toFixed(1)}%`);

    // Post-process masks using the correct v3 API
    const masks = await samState.processor.post_process_masks(
        outputs.pred_masks,
        pointInputs.original_sizes,
        pointInputs.reshaped_input_sizes
    );

    // masks is a list of Tensors. We take the first one (batch index 0).
    const maskTensor = masks[0];

    console.log("Mask tensor dims:", maskTensor.dims);
    console.log("Mask tensor type:", maskTensor.type);

    // maskTensor shape: [1, 3, height, width] or [3, height, width]
    const dims = maskTensor.dims;
    let h, w;
    if (dims.length === 4) {
        h = dims[2];
        w = dims[3];
    } else {
        h = dims[1];
        w = dims[2];
    }

    const stride = h * w;
    const start = bestIndex * stride;
    const end = start + stride;
    const rawMaskData = maskTensor.data.slice(start, end);

    // In v3, post_process_masks returns bool type (true/false)
    // true = foreground (object), false = background
    // Convert to Float32Array: true -> 1, false -> 0
    const maskData = new Float32Array(rawMaskData.length);
    let foregroundCount = 0;
    for (let i = 0; i < rawMaskData.length; i++) {
        // Handle boolean values correctly
        maskData[i] = rawMaskData[i] ? 1 : 0;
        if (maskData[i] > 0) foregroundCount++;
    }
    
    console.log(`Foreground pixels: ${foregroundCount}/${maskData.length} (${(foregroundCount/maskData.length*100).toFixed(1)}%)`);

    return {
        data: maskData,
        width: w,
        height: h
    };
};

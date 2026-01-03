import React, { useState, useCallback, useMemo } from 'react';
import { Dimensions, AppState, SplitImage, SplitDirection } from './types';
import { ImageUploader } from './components/ImageUploader';
import { SplitEditor } from './components/SplitEditor';
import { ImageEditor } from './components/ImageEditor';
import { ResultGallery } from './components/ResultGallery';
import { LoadingOverlay } from './components/LoadingOverlay';
import { detectSeamsLocal } from './services/localSplitService';
import { Layers } from 'lucide-react';
import logo from '/logo-small.png';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  // Check for pending image from context menu (Side Panel)
  React.useEffect(() => {
    // Check if running in extension environment
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pendingImage'], (result) => {
        if (result.pendingImage) {
          const imgUrl = result.pendingImage;
          setLoadingMessage("Loading image from context menu...");
          setState(AppState.PROCESSING);

          const img = new Image();
          img.onload = () => {
            setImageDimensions({ width: img.width, height: img.height });
            setOriginalImageSrc(img.src);
            setState(AppState.IMAGE_EDIT);
            setLoadingMessage(null);
            // Clear storage so it doesn't reload on refresh
            chrome.storage.local.remove('pendingImage');
          };
          img.onerror = () => {
            setErrorMsg("Failed to load image from context context.");
            setState(AppState.UPLOAD);
            setLoadingMessage(null);
            chrome.storage.local.remove('pendingImage');
          };
          // Handle CORS for external images if needed, but for local extension use it might be fine directly
          // or converted to data URL by background (but we passed srcUrl).
          // If it's a web URL, we might face CORS in canvas.
          img.crossOrigin = "anonymous";
          img.src = imgUrl;
        }
      });
    }
  }, []);

  // Independent state for rows (y-coords) and cols (x-coords)
  const [rowSplits, setRowSplits] = useState<number[]>([]);
  const [colSplits, setColSplits] = useState<number[]>([]);

  const [resultImages, setResultImages] = useState<SplitImage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadImage = (file: File) => {
    setLoadingMessage("Reading image file...");
    setState(AppState.PROCESSING);
    setErrorMsg(null);

    // Reset state
    setRowSplits([]);
    setColSplits([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setOriginalImageSrc(img.src);
        // Go directly to Image Editor
        setState(AppState.IMAGE_EDIT);
        setLoadingMessage(null);
      };
      img.onerror = () => {
        setErrorMsg("Failed to load image.");
        setState(AppState.UPLOAD);
        setLoadingMessage(null);
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (src: string, w: number, h: number) => {
    setLoadingMessage("Detecting grid...");

    try {
      const { rowSplits, colSplits } = await detectSeamsLocal(src, w, h);

      setRowSplits(rowSplits);
      setColSplits(colSplits);

      setState(AppState.EDITOR);
    } catch (err) {
      console.error(err);
      setErrorMsg("Detection failed. You can manually split.");
      setState(AppState.EDITOR);
    } finally {
      setLoadingMessage(null);
    }
  };

  const handleReRunDetection = () => {
    if (originalImageSrc) {
      processImage(originalImageSrc, imageDimensions.width, imageDimensions.height);
    }
  };

  const executeSplits = (finalRowSplits: number[], finalColSplits: number[]) => {
    if (!originalImageSrc) return;
    setLoadingMessage("Cutting images...");
    setState(AppState.PROCESSING);

    const img = new Image();
    img.onload = () => {
      const rowPoints = [0, ...finalRowSplits.sort((a, b) => a - b), imageDimensions.height];
      const colPoints = [0, ...finalColSplits.sort((a, b) => a - b), imageDimensions.width];

      const newImages: SplitImage[] = [];

      // Create a reusable canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Double loop to handle the grid
      for (let r = 0; r < rowPoints.length - 1; r++) {
        const yStart = rowPoints[r];
        const yEnd = rowPoints[r + 1];
        const h = yEnd - yStart;

        if (h <= 0) continue;

        for (let c = 0; c < colPoints.length - 1; c++) {
          const xStart = colPoints[c];
          const xEnd = colPoints[c + 1];
          const w = xEnd - xStart;

          if (w <= 0) continue;

          canvas.width = w;
          canvas.height = h;

          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(
            img,
            xStart, yStart, w, h, // source rect
            0, 0, w, h            // dest rect
          );

          newImages.push({
            id: `split-${r}-${c}-${Date.now()}`,
            url: canvas.toDataURL('image/png'),
            width: w,
            height: h
          });
        }
      }

      setResultImages(newImages);
      setLoadingMessage(null);
      setState(AppState.RESULTS);
    };
    img.src = originalImageSrc;
  };

  const handleReset = () => {
    setState(AppState.UPLOAD);
    setOriginalImageSrc(null);
    setRowSplits([]);
    setColSplits([]);
    setResultImages([]);
    setErrorMsg(null);
  };

  const handleEditImage = () => {
    setState(AppState.IMAGE_EDIT);
  };

  // Return to Image Editor from Split Editor
  const handleBackToEditor = () => {
    setState(AppState.IMAGE_EDIT);
  };

  // Change image (open file picker)
  const handleChangeImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.type.startsWith('image/')) {
        loadImage(file);
      }
    };
    input.click();
  };

  // Called when user clicks "Done" or "Split" in ImageEditor
  const handleImageEditorSave = (newSrc: string, action: 'save' | 'split') => {
    // Update the source with the edited version
    setOriginalImageSrc(newSrc);

    // Update dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });

      if (action === 'split') {
        // Run detection and go to Split Editor
        processImage(newSrc, img.width, img.height);
      } else {
        // Just save? For now, maybe just stay or go to split? 
        // The prompt implies "Split" is a feature. 
        // If they just "Save", maybe they want to download?
        // For now, let's assume "Done" means "Ready to Split" or "Download".
        // But the user request says "Split as a feature".
        // Let's treat "Done" as "Go to Split" for now, or maybe we need a separate download?
        // I'll assume the ImageEditor has a specific "Split" button.
      }
    };
    img.src = newSrc;
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <main className="flex-1 flex flex-col relative w-full h-full">
        {loadingMessage && <LoadingOverlay message={loadingMessage} />}

        <div className="flex-1 flex flex-col items-center justify-center w-full">

          {state === AppState.UPLOAD && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col items-center">
              <div className="text-center mb-12 max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                  Browser-based <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400">
                    image editor
                  </span>
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Smart cropping, resizing, and grid splitting.
                  Runs entirely in your browser — no uploads, no server costs.
                </p>
              </div>
              <ImageUploader onImageSelected={loadImage} />
              {errorMsg && <p className="text-red-400 mt-4">{errorMsg}</p>}
            </div>
          )}

          {state === AppState.EDITOR && originalImageSrc && (
            <div className="w-full h-full animate-in fade-in duration-300">
              <SplitEditor
                imageSrc={originalImageSrc}
                dimensions={imageDimensions}
                rowSplits={rowSplits}
                colSplits={colSplits}
                onConfirm={executeSplits}
                onCancel={handleBackToEditor}
                onReRunDetection={handleReRunDetection}
                onSplitsChange={(rows, cols) => {
                  setRowSplits(rows);
                  setColSplits(cols);
                }}
                onEditImage={handleEditImage}
              />
            </div>
          )}

          {state === AppState.IMAGE_EDIT && originalImageSrc && (
            <div className="w-full h-full animate-in fade-in duration-300">
              <ImageEditor
                imageSrc={originalImageSrc}
                onSave={(src) => handleImageEditorSave(src, 'save')}
                onSplit={(src) => handleImageEditorSave(src, 'split')}
                onCancel={handleReset}
                onChangeImage={handleChangeImage}
              />
            </div>
          )}

          {state === AppState.RESULTS && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ResultGallery images={resultImages} onReset={handleReset} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;